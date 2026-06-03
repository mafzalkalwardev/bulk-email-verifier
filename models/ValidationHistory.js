const mongoose = require('mongoose');

const ValidationHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    status: { type: String, required: true },
    source: { type: String, enum: ['single', 'bulk'], default: 'single' },
    details: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ValidationHistory', ValidationHistorySchema);
