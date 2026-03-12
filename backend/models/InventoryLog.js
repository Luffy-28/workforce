const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  actionType: { type: String, enum: ['restock', 'request-delivered', 'manual-adjustment', 'item-created'], required: true },
  quantityChanged: { type: Number, required: true },
  oldQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryRequest' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InventoryLog', logSchema);
