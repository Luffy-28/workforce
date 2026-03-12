const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const InventoryLog = require('../models/InventoryLog');
const InventoryRequest = require('../models/InventoryRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, requireAdmin, requireManager } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.lowStock === 'true') filter.isLowStock = true;
    if (req.query.search) filter.itemName = { $regex: req.query.search, $options: 'i' };
    res.json(await Inventory.find(filter).populate('createdBy', 'name').sort({ updatedAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, requireManager, async (req, res) => {
  try {
    const item = await Inventory.create({ ...req.body, company: req.user.company, createdBy: req.user._id });
    await InventoryLog.create({
      itemId: item._id,
      company: req.user.company,
      actionType: 'item-created',
      quantityChanged: item.quantity,
      oldQuantity: 0,
      newQuantity: item.quantity,
      performedBy: req.user._id
    });
    req.app.get('io').to(`company:${req.user.company}`).emit('inventory:update', { type: 'item-created', item });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, requireManager, async (req, res) => {
  try {
    const old = await Inventory.findOne({ _id: req.params.id, company: req.user.company });
    if (!old) return res.status(404).json({ message: 'Not found' });

    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (req.body.quantity !== undefined && req.body.quantity !== old.quantity) {
      await InventoryLog.create({
        itemId: updated._id,
        company: req.user.company,
        actionType: 'manual-adjustment',
        quantityChanged: req.body.quantity - old.quantity,
        oldQuantity: old.quantity,
        newQuantity: updated.quantity,
        performedBy: req.user._id
      });
    }
    req.app.get('io').to(`company:${req.user.company}`).emit('inventory:update', { type: 'item-updated', item: updated });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const result = await Inventory.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Requests ---
router.get('/requests', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.user.role === 'employee') filter.employeeId = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const requests = await InventoryRequest.find(filter)
      .populate('employeeId', 'name email department').populate('itemId', 'itemName category unitType quantity')
      .populate('approvedBy', 'name').populate('deliveredBy', 'name').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/requests', protect, async (req, res) => {
  try {
    const { itemId, quantityRequested, reason } = req.body;
    const item = await Inventory.findOne({ _id: itemId, company: req.user.company });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.quantity < quantityRequested) return res.status(400).json({ message: 'Insufficient stock' });

    const request = await InventoryRequest.create({
      employeeId: req.user._id,
      company: req.user.company,
      itemId,
      quantityRequested,
      reason
    });

    const managers = await User.find({ company: req.user.company, role: { $in: ['admin', 'manager'] } });
    await Notification.insertMany(managers.map(m => ({
      userId: m._id,
      company: req.user.company,
      title: 'New Stock Request',
      message: `${req.user.name} requested ${quantityRequested} ${item.unitType} of ${item.itemName}`,
      type: 'request-update',
      data: { requestId: request._id }
    })));

    const populated = await request.populate([{ path: 'employeeId', select: 'name email' }, { path: 'itemId', select: 'itemName category unitType' }]);
    req.app.get('io').to(`company:${req.user.company}`).emit('request:new', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/requests/:id/approve', protect, requireManager, async (req, res) => {
  try {
    const request = await InventoryRequest.findOne({ _id: req.params.id, company: req.user.company });
    if (!request || request.status !== 'pending') return res.status(400).json({ message: 'Cannot approve' });

    request.status = 'approved'; request.approvedBy = req.user._id; request.approvedAt = new Date();
    await request.save();

    await Notification.create({
      userId: request.employeeId,
      company: req.user.company,
      title: 'Request Approved',
      message: 'Your stock request has been approved',
      type: 'request-update'
    });
    req.app.get('io').to(`company:${req.user.company}`).emit('request:updated', request);
    res.json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/requests/:id/deliver', protect, requireManager, async (req, res) => {
  try {
    const request = await InventoryRequest.findOne({ _id: req.params.id, company: req.user.company }).populate('itemId');
    if (!request || request.status !== 'approved') return res.status(400).json({ message: 'Must be approved first' });

    const item = request.itemId;
    if (item.quantity < request.quantityRequested) return res.status(400).json({ message: 'Insufficient stock' });

    const oldQty = item.quantity;
    item.quantity -= request.quantityRequested;
    await item.save();

    await InventoryLog.create({
      itemId: item._id,
      company: req.user.company,
      actionType: 'request-delivered',
      quantityChanged: -request.quantityRequested,
      oldQuantity: oldQty,
      newQuantity: item.quantity,
      requestId: request._id,
      performedBy: req.user._id
    });

    request.status = 'delivered'; request.deliveredBy = req.user._id; request.deliveredAt = new Date();
    await request.save();

    if (item.isLowStock) {
      const managers = await User.find({ company: req.user.company, role: { $in: ['admin', 'manager'] } });
      await Notification.insertMany(managers.map(m => ({
        userId: m._id,
        company: req.user.company,
        title: '⚠️ Low Stock Alert',
        message: `${item.itemName} is running low (${item.quantity} ${item.unitType} left)`,
        type: 'low-stock',
        data: { itemId: item._id }
      })));
      req.app.get('io').to(`company:${req.user.company}`).emit('inventory:lowStock', { item });
    }

    await Notification.create({
      userId: request.employeeId,
      company: req.user.company,
      title: 'Items Delivered',
      message: `Your request for ${item.itemName} has been delivered`,
      type: 'request-update'
    });

    req.app.get('io').to(`company:${req.user.company}`).emit('inventory:update', { type: 'stock-deducted', item, oldQty });
    req.app.get('io').to(`company:${req.user.company}`).emit('request:updated', request);
    res.json({ request, updatedItem: item });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/requests/:id/reject', protect, requireManager, async (req, res) => {
  try {
    const request = await InventoryRequest.findOne({ _id: req.params.id, company: req.user.company });
    if (!request) return res.status(404).json({ message: 'Not found' });
    request.status = 'rejected'; request.rejectionReason = req.body.reason;
    await request.save(); res.json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/logs', protect, requireManager, async (req, res) => {
  try {
    const logs = await InventoryLog.find({ company: req.user.company }).populate('itemId', 'itemName category').populate('performedBy', 'name').sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
