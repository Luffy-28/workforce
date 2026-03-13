const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, requireManagerOrSupervisor } = require('../middleware/auth');

// Create and broadcast announcement
router.post('/', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    const { title, message, priority, targetRoles, expiresAt } = req.body;
    
    const announcement = await Announcement.create({
      senderId: req.user._id,
      company: req.user.company,
      title,
      message,
      priority,
      targetRoles,
      expiresAt
    });

    // Determine target users
    let userQuery = { company: req.user.company };
    if (targetRoles && targetRoles.length > 0) {
      userQuery.role = { $in: targetRoles };
    }

    const users = await User.find(userQuery).select('_id');
    
    // Create notifications for all target users
    const notifications = users.map(user => ({
      userId: user._id,
      company: req.user.company,
      title: `Announcement: ${title}`,
      message: message.substring(0, 100),
      type: 'announcement',
      data: { announcementId: announcement._id, priority }
    }));

    await Notification.insertMany(notifications);

    // Emit via Socket.IO
    const io = req.app.get('io');
    io.to(`company:${req.user.company}`).emit('announcement:new', announcement);

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get active announcements
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      company: req.user.company,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    })
    .populate('senderId', 'name role')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
