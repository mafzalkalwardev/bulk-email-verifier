const ValidationHistory = require('../models/ValidationHistory');

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
        const valid = history.filter(h => h.status === 'ok').length;
        // In EmailListVerify, "fail", "error", "disposable" might be some of the returned string statuses.
        const invalid = history.filter(h => h.status !== 'ok' && h.status !== 'unknown').length;
        const unknown = history.filter(h => h.status === 'unknown').length;

        res.json({
            total,
            valid,
            invalid,
            unknown
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

module.exports = { getHistory, getStats };
