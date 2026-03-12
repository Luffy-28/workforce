const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

exports.requireManager = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ message: 'Manager access required' });
  next();
};

exports.requireManagerOrSupervisor = (req, res, next) => {
  if (!['admin', 'manager', 'supervisor'].includes(req.user.role))
    return res.status(403).json({ message: 'Manager or Supervisor access required' });
  next();
};
