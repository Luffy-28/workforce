const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
    note: String,
    createdAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate availability for same user/date
availabilitySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
