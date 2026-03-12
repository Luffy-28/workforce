const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  signInTime: Date,
  signOutTime: Date,
  breakStart: Date,
  breakEnd: Date,
  totalHours: Number,
  overtimeHours: { type: Number, default: 0 },
  gpsLocation: {
    signIn: { lat: Number, lng: Number, address: String },
    signOut: { lat: Number, lng: Number, address: String }
  },
  status: { type: String, enum: ['present', 'absent', 'late', 'on-break', 'pending'], default: 'present' },
  notes: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
