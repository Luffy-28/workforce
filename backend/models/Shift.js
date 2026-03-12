const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  location: String,
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignments: [{
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    updatedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  geofence: { lat: Number, lng: Number, radius: { type: Number, default: 100 } },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shift', shiftSchema);
