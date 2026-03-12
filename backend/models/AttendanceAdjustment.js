const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

    requestedChanges: {
        signInTime: Date,
        signOutTime: Date
    },
    note: { type: String, required: true },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: String,

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: Date,

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AttendanceAdjustment', adjustmentSchema);
