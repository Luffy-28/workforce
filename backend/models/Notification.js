const mongoose = require('mongoose');

const notifSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['low-stock', 'request-update', 'shift-assigned', 'shift-response', 'task-assigned', 'announcement', 'attendance'], required: true },
  isRead: { type: Boolean, default: false },
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notifSchema);
