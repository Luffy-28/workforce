const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Inventory = require('../models/Inventory');
const InventoryLog = require('../models/InventoryLog');
const { protect, requireManager } = require('../middleware/auth');

router.get('/attendance', protect, requireManager, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    const records = await Attendance.find(filter).populate('userId', 'name email department role');
    const summary = { totalRecords: records.length, totalHours: +records.reduce((s, r) => s + (r.totalHours || 0), 0).toFixed(2), overtimeHours: +records.reduce((s, r) => s + (r.overtimeHours || 0), 0).toFixed(2), byEmployee: {} };
    records.forEach(r => {
      const k = r.userId?._id?.toString();
      if (k && r.userId) {
        if (!summary.byEmployee[k]) summary.byEmployee[k] = { name: r.userId.name, days: 0, totalHours: 0 };
        summary.byEmployee[k].days++;
        summary.byEmployee[k].totalHours += r.totalHours || 0;
      }
    });
    res.json({ records, summary });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/inventory', protect, requireManager, async (req, res) => {
  try {
    const items = await Inventory.find({ company: req.user.company });
    const logs = await InventoryLog.find({ company: req.user.company }).populate('itemId', 'itemName').populate('performedBy', 'name').sort({ createdAt: -1 }).limit(50);
    res.json({ totalItems: items.length, lowStockCount: items.filter(i => i.isLowStock).length, lowStockItems: items.filter(i => i.isLowStock), recentLogs: logs });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/performance', protect, requireManager, async (req, res) => {
  try {
    const { siteId, from, to, granularity } = req.query; // granularity: 'day', 'fortnight', 'month'
    const filter = { company: req.user.company };

    if (siteId) filter.site = siteId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const attendanceRecords = await Attendance.find(filter).populate('userId', 'name role');

    // Grouping logic
    const stats = {};
    attendanceRecords.forEach(record => {
      let key;
      const d = new Date(record.date);
      if (granularity === 'month') key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      else if (granularity === 'fortnight') {
        const isSecondHalf = d.getDate() > 15;
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-F${isSecondHalf ? 2 : 1}`;
      } else key = d.toISOString().split('T')[0]; // Default: day

      if (!stats[key]) stats[key] = { date: key, present: 0, hours: 0, overtime: 0 };
      stats[key].present++;
      stats[key].hours += record.totalHours || 0;
      stats[key].overtime += record.overtimeHours || 0;
    });

    // Sort stats by date
    const performanceData = Object.values(stats).sort((a, b) => a.date.localeCompare(b.date));

    // Employee specific breakdown
    const employeeBreakdown = {};
    attendanceRecords.forEach(r => {
      const eId = r.userId?._id?.toString();
      if (!eId) return;
      if (!employeeBreakdown[eId]) employeeBreakdown[eId] = { name: r.userId.name, present: 0, hours: 0 };
      employeeBreakdown[eId].present++;
      employeeBreakdown[eId].hours += r.totalHours || 0;
    });

    res.json({ performanceData, employeeBreakdown: Object.values(employeeBreakdown) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
