const express = require('express');
const router = express.Router();
const { getHistory, getStats } = require('../controllers/historyController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getHistory);
router.route('/stats').get(protect, getStats);

module.exports = router;
