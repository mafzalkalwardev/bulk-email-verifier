const ValidationHistory = require('../models/ValidationHistory');
const { verifyEmailCombined } = require('../utils/verificationEngine');
const { parseBulkFile } = require('../utils/csvEmailParser');
const fs = require('fs');

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

    const concurrency = Math.min(parseInt(process.env.BULK_CONCURRENCY || '3', 10), 5);
    const results = new Array(emails.length);

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

    for (let i = 0; i < emails.length; i += concurrency) {
        const chunk = emails.slice(i, i + concurrency);
        await Promise.all(chunk.map((email, j) => verifyOne(email, i + j)));
    }

    res.json({ count: results.length, results });
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

        res.json({
            emails: parsed.emails,
            rows: parsed.rows,
            emailCount: parsed.emails.length,
            rowCount: parsed.rows.length,
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
