const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Site = require('../models/Site');
const { protect, requireManager } = require('../middleware/auth');

// Haversine formula to calculate distance between two points in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

router.post('/clock-in', protect, async (req, res) => {
  try {
    const existing = await Attendance.findOne({
      userId: req.user._id,
      company: req.user.company,
      signOutTime: null
    });
    if (existing) return res.status(400).json({ message: 'Already clocked in' });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyCount = await Attendance.countDocuments({
      userId: req.user._id,
      company: req.user.company,
      signInTime: { $gte: today }
    });

    const siteId = req.body.siteId || (req.user.site?._id || req.user.site);
    let locationVerified = true;

    if (siteId && req.body.gpsLocation?.lat) {
      const site = await Site.findById(siteId);
      if (site && site.location?.lat) {
        const dist = getDistance(
          req.body.gpsLocation.lat, 
          req.body.gpsLocation.lng, 
          site.location.lat, 
          site.location.lng
        );
        // Allowance of 200 meters (radius)
        if (dist > 200) {
           locationVerified = false;
        }
      }
    }

    const att = await Attendance.create({
      userId: req.user._id,
      company: req.user.company,
      shiftId: req.body.shiftId,
      site: siteId,
      signInTime: new Date(),
      gpsLocation: { signIn: req.body.gpsLocation },
      status: !locationVerified ? 'pending' : (dailyCount >= 3 ? 'pending' : (req.body.status || 'present')),
      notes: !locationVerified ? 'Clocked in outside geofence.' : req.body.notes
    });

    req.app.get('io').to(`company:${req.user.company}`).emit('attendance:update', { type: 'clock-in', userId: req.user._id, attendance: att });
    res.status(201).json(att);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/clock-out', protect, async (req, res) => {
  try {
    const att = await Attendance.findOne({
      userId: req.user._id,
      company: req.user.company,
      signOutTime: null
    }).sort({ signInTime: -1 });
    if (!att) return res.status(400).json({ message: 'Not clocked in' });

    att.signOutTime = new Date();
    if (req.body.gpsLocation) att.gpsLocation.signOut = req.body.gpsLocation;
    const ms = att.signOutTime - att.signInTime;
    att.totalHours = parseFloat((ms / 3600000).toFixed(2));
    if (att.totalHours > 8) att.overtimeHours = parseFloat((att.totalHours - 8).toFixed(2));
    await att.save();

    req.app.get('io').to(`company:${req.user.company}`).emit('attendance:update', { type: 'clock-out', userId: req.user._id });
    res.json(att);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/break-start', protect, async (req, res) => {
  try {
    const att = await Attendance.findOne({
      userId: req.user._id,
      company: req.user.company,
      signOutTime: null
    }).sort({ signInTime: -1 });
    if (!att) return res.status(400).json({ message: 'Not clocked in' });
    att.breakStart = new Date(); att.status = 'on-break';
    await att.save(); res.json(att);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/break-end', protect, async (req, res) => {
  try {
    const att = await Attendance.findOne({
      userId: req.user._id,
      company: req.user.company,
      signOutTime: null
    }).sort({ signInTime: -1 });
    if (!att) return res.status(400).json({ message: 'Not clocked in' });
    att.breakEnd = new Date(); att.status = 'present';
    await att.save(); res.json(att);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', protect, requireManager, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) filter.date.$lte = new Date(req.query.to);
    }
    const records = await Attendance.find(filter)
      .populate('userId', 'name email department title role')
      .populate('shiftId', 'title location')
      .populate('site', 'name')
      .sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/my', protect, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user._id, company: req.user.company })
      .populate('shiftId', 'title location')
      .populate('site', 'name')
      .sort({ date: -1 })
      .limit(30);
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Adjustments ---

const AttendanceAdjustment = require('../models/AttendanceAdjustment');

// Create adjustment request (Employee)
router.post('/adjustments', protect, async (req, res) => {
  try {
    const { attendanceId, requestedChanges, note } = req.body;
    const att = await Attendance.findOne({ _id: attendanceId, userId: req.user._id, company: req.user.company });
    if (!att) return res.status(404).json({ message: 'Attendance record not found' });

    const adjustment = await AttendanceAdjustment.create({
      attendanceId,
      userId: req.user._id,
      company: req.user.company,
      requestedChanges,
      note,
      status: 'pending'
    });

    res.status(201).json(adjustment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get adjustments (Scoped)
router.get('/adjustments', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.user.role === 'employee') filter.userId = req.user._id;
    else if (req.query.status) filter.status = req.query.status;

    const adjustments = await AttendanceAdjustment.find(filter)
      .populate('userId', 'name email department')
      .populate('attendanceId')
      .sort({ createdAt: -1 });
    res.json(adjustments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Process adjustment (Manager)
router.patch('/adjustments/:id/process', protect, requireManager, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const adjustment = await AttendanceAdjustment.findOne({ _id: req.params.id, company: req.user.company });

    if (!adjustment || adjustment.status !== 'pending') {
      return res.status(400).json({ message: 'Adjustment not found or already processed' });
    }

    adjustment.status = status;
    adjustment.processedBy = req.user._id;
    adjustment.processedAt = new Date();
    if (status === 'rejected') adjustment.rejectionReason = rejectionReason;

    await adjustment.save();

    if (status === 'approved') {
      const att = await Attendance.findById(adjustment.attendanceId);
      if (att) {
        if (adjustment.requestedChanges.signInTime) att.signInTime = adjustment.requestedChanges.signInTime;
        if (adjustment.requestedChanges.signOutTime) att.signOutTime = adjustment.requestedChanges.signOutTime;

        // Recalculate hours
        if (att.signInTime && att.signOutTime) {
          const ms = new Date(att.signOutTime) - new Date(att.signInTime);
          att.totalHours = parseFloat((ms / 3600000).toFixed(2));
          att.overtimeHours = att.totalHours > 8 ? parseFloat((att.totalHours - 8).toFixed(2)) : 0;
        }
        await att.save();
      }
    }

    res.json(adjustment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update attendance status (Manager/Supervisor Approval)
router.patch('/:id/status', protect, requireManager, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const att = await Attendance.findOne({ _id: req.params.id, company: req.user.company });
    if (!att) return res.status(404).json({ message: 'Record not found' });

    att.status = status;
    if (notes) att.notes = (att.notes ? att.notes + '\n' : '') + notes;
    await att.save();

    req.app.get('io').to(`company:${req.user.company}`).emit('attendance:update', { type: 'status-change', attendance: att });
    res.json(att);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

