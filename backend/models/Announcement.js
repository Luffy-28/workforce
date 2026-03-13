const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
  targetRoles: [{ type: String }], // Optional: specifically for Admins, Managers, or Employees
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);
