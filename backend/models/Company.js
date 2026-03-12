const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    subscription: {
        plan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
        status: { type: String, enum: ['active', 'past_due', 'canceled'], default: 'active' },
        expiresAt: Date
    },
    address: {
        street: String,
        city: String,
        zip: String,
        country: String
    },
    logo: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);
