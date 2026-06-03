const express = require('express');
const router = express.Router();
const {
    getHistory,
    getStats,
    getBulkJobs,
    getBulkJobById,
    saveBulkJob,
} = require('../controllers/historyController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getHistory);
router.route('/stats').get(protect, getStats);
router.route('/bulk-jobs').get(protect, getBulkJobs).post(protect, saveBulkJob);
router.route('/bulk-jobs/:id').get(protect, getBulkJobById);

module.exports = router;
