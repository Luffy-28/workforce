const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const genTokens = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }),
  refreshToken: jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' })
});

// POST /api/auth/login
router.post('/login', [body('password').notEmpty()], async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ message: 'Invalid credentials' });
  try {
    const { email, password } = req.body;
    // Support login by email or phone number
    const isEmail = email && email.includes('@');
    const query = isEmail ? { email: email.toLowerCase() } : { phone: email };
    const user = await User.findOne(query).populate('company');

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email/phone or password' });
    if (user.status === 'inactive') return res.status(403).json({ message: 'Account is deactivated' });
    const tokens = genTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });
    res.json({ ...tokens, user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) return res.status(401).json({ message: 'Invalid refresh token' });
    const tokens = genTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });
    res.json(tokens);
  } catch { res.status(401).json({ message: 'Invalid or expired token' }); }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save({ validateBeforeSave: false });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('company');
  res.json(user);
});

module.exports = router;
