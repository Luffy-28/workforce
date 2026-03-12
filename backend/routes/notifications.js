const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    res.json(await Notification.find({ userId: req.user._id, company: req.user.company }).sort({ createdAt: -1 }).limit(50));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, company: req.user.company },
      { isRead: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Read' });
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, company: req.user.company, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All read' });
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
