const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    address: String,
    location: {
        lat: Number,
        lng: Number
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Site', siteSchema);
