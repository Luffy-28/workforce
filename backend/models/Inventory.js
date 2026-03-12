const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  minThreshold: { type: Number, required: true, default: 10 },
  unitType: { type: String, default: 'units' },
  supplier: { name: String, contact: String, email: String },
  description: String,
  sku: { type: String, sparse: true },
  isLowStock: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

inventorySchema.pre('save', function (next) {
  this.isLowStock = this.quantity <= this.minThreshold;
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
