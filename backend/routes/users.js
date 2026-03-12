const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, requireAdmin, requireManager } = require('../middleware/auth');

// GET /api/users
router.get('/', protect, requireManager, async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const filter = { company: req.user.company }; // Strict company scoping

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$and = [
        { company: req.user.company },
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    res.json(await User.find(filter).select('-password -refreshToken').sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:id
router.get('/:id', protect, requireManager, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, company: req.user.company }).select('-password -refreshToken');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const userData = { ...req.body, company: req.user.company };
    const user = await User.create(userData);
    res.status(201).json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT /api/users/:id
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const result = await User.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/users/:id/assign-site (Manager can assign site to employee/supervisor)
router.patch('/:id/assign-site', protect, requireManager, async (req, res) => {
  try {
    const { site } = req.body;
    const targetUser = await User.findOne({ _id: req.params.id, company: req.user.company });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (!['employee', 'supervisor'].includes(targetUser.role)) {
      return res.status(400).json({ message: 'Can only assign sites to employees and supervisors' });
    }

    // Validate site belongs to same company
    if (site) {
      const Site = require('../models/Site');
      const siteDoc = await Site.findOne({ _id: site, company: req.user.company });
      if (!siteDoc) return res.status(400).json({ message: 'Site not found in your company' });
    }

    targetUser.site = site || null;
    await targetUser.save();
    res.json(targetUser);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

// PATCH /api/users/profile (Self update)
router.patch('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) updates.avatar = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
