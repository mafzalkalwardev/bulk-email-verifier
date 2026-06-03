const ValidationHistory = require('../models/ValidationHistory');
const BulkJob = require('../models/BulkJob');
const { classifyHistoryRecord } = require('../utils/statusUtils');

// @desc    Get user validation history
// @route   GET /api/history
// @access  Private
const getHistory = async (req, res) => {
    try {
        const history = await ValidationHistory.find({ user: req.user._id }).sort({ timestamp: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error: error.message });
    }
};

// @desc    Get validation stats
// @route   GET /api/history/stats
// @access  Private
const getStats = async (req, res) => {
    try {
        const history = await ValidationHistory.find({ user: req.user._id });

        const total = history.length;
        let valid = 0;
        let invalid = 0;
        let unknown = 0;

        history.forEach(record => {
            const bucket = classifyHistoryRecord(record);
            if (bucket === 'valid') valid++;
            else if (bucket === 'unknown') unknown++;
            else invalid++;
        });

        res.json({ total, valid, invalid, unknown });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// @desc    List saved bulk jobs
// @route   GET /api/history/bulk-jobs
// @access  Private
const getBulkJobs = async (req, res) => {
    try {
        const jobs = await BulkJob.find({ user: req.user._id })
            .sort({ completedAt: -1 })
            .select('-rows');
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bulk jobs', error: error.message });
    }
};

// @desc    Get one bulk job with rows (for export)
// @route   GET /api/history/bulk-jobs/:id
// @access  Private
const getBulkJobById = async (req, res) => {
    try {
        const job = await BulkJob.findOne({ _id: req.params.id, user: req.user._id });
        if (!job) {
            return res.status(404).json({ message: 'Bulk job not found' });
        }
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bulk job', error: error.message });
    }
};

// @desc    Save completed bulk job
// @route   POST /api/history/bulk-jobs
// @access  Private
const saveBulkJob = async (req, res) => {
    const { fileName, rows, stats } = req.body;

    if (!fileName || !Array.isArray(rows) || !rows.length) {
        return res.status(400).json({ message: 'fileName and rows are required' });
    }

    try {
        const job = await BulkJob.create({
            user: req.user._id,
            fileName,
            rows,
            stats: {
                total: rows.length,
                valid: stats?.valid ?? rows.filter(r => r.valid).length,
                invalid: stats?.invalid ?? rows.filter(r => !r.valid).length,
                disposable: stats?.disposable ?? 0,
                noSmtp: stats?.noSmtp ?? 0,
            },
        });
        res.status(201).json({ id: job._id, fileName: job.fileName });
    } catch (error) {
        res.status(500).json({ message: 'Error saving bulk job', error: error.message });
    }
};

module.exports = { getHistory, getStats, getBulkJobs, getBulkJobById, saveBulkJob };
