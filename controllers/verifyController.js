const ValidationHistory = require('../models/ValidationHistory');
const User = require('../models/User');
const { verifyEmailCombined } = require('../utils/verificationEngine');
const { parseBulkFile } = require('../utils/csvEmailParser');
const { claimBulk, bulkAllowance, freeBulkDailyLimit, utcDay } = require('../lib/license_mode');
const fs = require('fs');

const userLocks = new Map();

function withUserLock(userId, fn) {
    const key = String(userId);
    const prev = userLocks.get(key) || Promise.resolve();
    const run = prev.then(fn, fn);
    userLocks.set(key, run.then(() => {}, () => {}));
    return run;
}

function currentLicense(req) {
    return req.app.locals.license || { mode: 'free' };
}

async function readBulkAllowance(req) {
    const license = currentLicense(req);
    const limit = freeBulkDailyLimit();
    if (license.mode === 'licensed') {
        return bulkAllowance({ mode: 'licensed', today: utcDay(), limit });
    }
    const user = await User.findById(req.user._id).select('freeBulkDay freeBulkCount');
    return bulkAllowance({
        mode: 'free',
        used: user?.freeBulkCount || 0,
        day: user?.freeBulkDay || '',
        today: utcDay(),
        limit,
    });
}

// @desc    Verify single email
// @route   POST /api/verify/single
// @access  Private
const verifySingleEmail = async (req, res) => {
    const { email, source = 'single' } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const result = await verifyEmailCombined(email);

        const history = await ValidationHistory.create({
            user: req.user._id,
            email,
            status: result.status,
            source,
            details: { report: result.report },
        });

        res.json({
            ...result,
            historyId: history._id,
        });
    } catch (error) {
        console.error('Verify Single Email Error:', error.message);
        res.status(500).json({ message: 'Error verifying email', error: error.message });
    }
};

// @desc    Verify multiple emails server-side
// @route   POST /api/verify/bulk
// @access  Private
const verifyBulkEmails = async (req, res) => {
    const { emails, source = 'bulk' } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: 'emails array is required' });
    }

    try {
        const outcome = await withUserLock(req.user._id, async () => {
            const license = currentLicense(req);
            const limit = freeBulkDailyLimit();
            const user = await User.findById(req.user._id).select('freeBulkDay freeBulkCount');
            const claim = claimBulk({
                mode: license.mode,
                used: user?.freeBulkCount || 0,
                day: user?.freeBulkDay || '',
                today: utcDay(),
                limit,
                requested: emails.length,
            });

            if (claim.accepted === 0) {
                return {
                    status: 402,
                    body: {
                        message: `Free mode allows ${claim.limit} bulk addresses per account per UTC day. None remaining today. A valid indus-license JSON file removes this cap. Single-address checks are not capped.`,
                        mode: 'free',
                        bulkDailyLimit: claim.limit,
                        remaining: 0,
                        accepted: 0,
                        omitted: claim.rejected,
                    },
                };
            }

            if (claim.mode !== 'licensed') {
                await User.updateOne(
                    { _id: req.user._id },
                    { $set: { freeBulkDay: claim.nextDay, freeBulkCount: claim.nextUsed } }
                );
            }

            return { claim, slice: emails.slice(0, claim.accepted) };
        });

        if (outcome.status === 402) {
            return res.status(402).json(outcome.body);
        }

        const { claim, slice } = outcome;
        const concurrency = Math.min(parseInt(process.env.BULK_CONCURRENCY || '3', 10), 5);
        const results = new Array(slice.length);

        async function verifyOne(email, index) {
            try {
                const result = await verifyEmailCombined(email);
                await ValidationHistory.create({
                    user: req.user._id,
                    email,
                    status: result.status,
                    source,
                    details: { report: result.report },
                });
                results[index] = result;
            } catch (err) {
                results[index] = {
                    email,
                    status: 'error',
                    domain_valid: false,
                    mailbox_verified: 'no_smtp',
                    valid: false,
                    error: err.message,
                };
            }
        }

        for (let i = 0; i < slice.length; i += concurrency) {
            const chunk = slice.slice(i, i + concurrency);
            await Promise.all(chunk.map((email, j) => verifyOne(email, i + j)));
        }

        const remaining = claim.mode === 'licensed' ? null : Math.max(0, (claim.limit || 0) - claim.nextUsed);
        res.json({
            count: results.length,
            results,
            mode: claim.mode,
            bulkDailyLimit: claim.limit,
            remaining,
            omitted: claim.rejected,
            message: claim.rejected
                ? `Free mode daily cap is ${claim.limit}. Verified ${claim.accepted} and skipped ${claim.rejected}.`
                : undefined,
        });
    } catch (error) {
        console.error('Verify Bulk Emails Error:', error.message);
        res.status(500).json({ message: 'Error verifying emails', error: error.message });
    }
};

// @desc    Parse bulk email file — scan all columns, preserve rows
// @route   POST /api/verify/upload-bulk
// @access  Private
const uploadBulkFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Please upload a file' });
    }

    const filePath = req.file.path;

    try {
        const isCsv =
            req.file.mimetype === 'text/csv' ||
            req.file.mimetype === 'application/vnd.ms-excel' ||
            req.file.originalname.endsWith('.csv');
        const isXlsx =
            req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            req.file.originalname.endsWith('.xlsx');

        if (!isCsv && !isXlsx) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Unsupported file format. Use .csv or .xlsx' });
        }

        const parsed = parseBulkFile(filePath, req.file.originalname);
        fs.unlinkSync(filePath);
        const allowance = await readBulkAllowance(req);

        res.json({
            emails: parsed.emails,
            rows: parsed.rows,
            emailCount: parsed.emails.length,
            rowCount: parsed.rows.length,
            mode: allowance.mode,
            bulkDailyLimit: allowance.limit,
            remaining: allowance.remaining,
        });
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: 'Error parsing file', error: error.message });
    }
};

// @desc    Backend engine health
// @route   GET /api/verify/health
// @access  Private
const getEngineHealth = async (_req, res) => {
    const { checkBackendHealth } = require('../utils/verificationEngine');
    const health = await checkBackendHealth();
    res.json(health);
};

module.exports = { verifySingleEmail, verifyBulkEmails, uploadBulkFile, getEngineHealth };
