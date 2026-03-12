const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  quantityRequested: { type: Number, required: true, min: 1 },
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'delivered', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveredAt: Date,
  rejectionReason: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryRequest', requestSchema);
