const mongoose = require('mongoose');

const shiftSwapRequestSchema = new mongoose.Schema({
  requestingUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional: if null, it's an "Open Shift" for anyone to claim
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  offeredShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' }, // Optional: for a direct trade
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  managerApprovalRequired: { type: Boolean, default: true },
  managerStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  note: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ShiftSwapRequest', shiftSwapRequestSchema);
