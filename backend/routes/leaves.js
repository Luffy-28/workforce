const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const { protect, requireManagerOrSupervisor } = require('../middleware/auth');

// Request leave (Employee)
router.post('/', protect, async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    const leave = await LeaveRequest.create({
      userId: req.user._id,
      company: req.user.company,
      type,
      startDate,
      endDate,
      reason
    });

    // Notify managers
    // In a real app, find managers for this company/site
    
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get leaves (Scoped)
router.get('/', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.user.role === 'employee') {
      filter.userId = req.user._id;
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    
    if (req.query.status) filter.status = req.query.status;

    const leaves = await LeaveRequest.find(filter)
      .populate('userId', 'name email department role')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update leave status (Manager/Supervisor)
router.patch('/:id/status', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    const { status, managerNote } = req.body;
    const leave = await LeaveRequest.findOne({ _id: req.params.id, company: req.user.company });

    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== 'pending' && status !== 'cancelled') {
        return res.status(400).json({ message: 'Request already processed' });
    }

    leave.status = status;
    leave.managerNote = managerNote;
    leave.processedBy = req.user._id;
    leave.processedAt = new Date();

    await leave.save();

    // Notify employee
    await Notification.create({
      userId: leave.userId,
      company: req.user.company,
      title: `Leave Request ${status.toUpperCase()}`,
      message: `Your leave request for ${new Date(leave.startDate).toLocaleDateString()} has been ${status}.`,
      type: 'request-update',
      data: { leaveId: leave._id, status }
    });

    const io = req.app.get('io');
    io.to(`user:${leave.userId}`).emit('notification:new', { type: 'leave-status', leave });

    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
