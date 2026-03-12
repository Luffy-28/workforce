const express = require('express');
const router = express.Router();
const Shift = require('../models/Shift');
const Site = require('../models/Site');
const Notification = require('../models/Notification');
const { protect, requireManagerOrSupervisor } = require('../middleware/auth');

// Helper: get sites the user is allowed to manage
async function getUserSiteIds(user) {
  if (user.role === 'admin') return null; // null = no restriction
  if (user.role === 'manager') {
    const sites = await Site.find({ company: user.company, manager: user._id }).select('_id');
    return sites.map(s => s._id.toString());
  }
  // supervisor or employee — only their assigned site
  return user.site ? [user.site.toString()] : [];
}

router.get('/', protect, async (req, res) => {
  try {
    const filter = { company: req.user.company };
    if (req.user.role === 'employee') filter.assignedEmployees = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    // Supervisors see only shifts at their site
    if (req.user.role === 'supervisor' && req.user.site) {
      filter.site = req.user.site;
    }

    const shifts = await Shift.find(filter)
      .populate('assignments.employee', 'name email avatar')
      .populate('createdBy', 'name')
      .populate('site', 'name address')
      .sort({ startTime: 1 });
    res.json(shifts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    // Site-scope enforcement
    const allowedSiteIds = await getUserSiteIds(req.user);
    if (allowedSiteIds !== null) {
      if (!req.body.site || !allowedSiteIds.includes(req.body.site.toString())) {
        return res.status(403).json({ message: 'You can only create shifts at your assigned sites.' });
      }
    }

    const { assignedEmployees } = req.body;

    // Check availability for assigned employees
    if (assignedEmployees?.length) {
      const shiftDate = new Date(req.body.startTime);
      shiftDate.setHours(0, 0, 0, 0);

      const Availability = require('../models/Availability');
      const unavailable = await Availability.find({
        userId: { $in: assignedEmployees },
        date: shiftDate,
        status: 'unavailable'
      }).populate('userId', 'name');

      if (unavailable.length > 0) {
        const names = unavailable.map(a => a.userId.name).join(', ');
        return res.status(400).json({
          message: `Cannot assign shift: ${names} ${unavailable.length === 1 ? 'is' : 'are'} not available on this date.`
        });
      }
    }

    const assignments = assignedEmployees?.map(id => ({ employee: id, status: 'pending' })) || [];
    const shift = await Shift.create({
      ...req.body,
      company: req.user.company,
      createdBy: req.user._id,
      assignments
    });

    if (assignedEmployees?.length) {
      await Notification.insertMany(assignedEmployees.map(id => ({
        userId: id,
        company: req.user.company,
        title: 'New Shift Assigned',
        message: `You've been assigned to: ${shift.title}`,
        type: 'shift-assigned',
        data: { shiftId: shift._id }
      })));
    }

    req.app.get('io').to(`company:${req.user.company}`).emit('shift:new', shift);
    res.status(201).json(shift);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/bulk', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    const { shifts: shiftData } = req.body; // Array of shift objects
    if (!Array.isArray(shiftData)) return res.status(400).json({ message: 'Invalid data' });

    // Site-scope enforcement
    const allowedSiteIds = await getUserSiteIds(req.user);
    if (allowedSiteIds !== null) {
      const invalidSite = shiftData.find(s => !s.site || !allowedSiteIds.includes(s.site.toString()));
      if (invalidSite) {
        return res.status(403).json({ message: 'You can only create shifts at your assigned sites.' });
      }
    }

    const createdShifts = await Promise.all(shiftData.map(async (s) => {
      const assignments = s.assignedEmployees?.map(id => ({ employee: id, status: 'pending' })) || [];
      const shift = await Shift.create({
        ...s,
        company: req.user.company,
        createdBy: req.user._id,
        assignments
      });

      if (s.assignedEmployees?.length) {
        await Notification.insertMany(s.assignedEmployees.map(id => ({
          userId: id,
          company: req.user.company,
          title: 'New Shift Assigned (Bulk)',
          message: `You've been assigned to: ${shift.title}`,
          type: 'shift-assigned',
          data: { shiftId: shift._id }
        })));
      }
      return shift;
    }));

    req.app.get('io').to(`company:${req.user.company}`).emit('shifts:bulk', createdShifts);
    res.status(201).json(createdShifts);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/:id/respond', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const shift = await Shift.findOne({ _id: req.params.id, company: req.user.company });
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    const assignment = shift.assignments.find(a => a.employee && a.employee.toString() === req.user._id.toString());
    if (!assignment) return res.status(403).json({ message: 'Not assigned to this shift' });

    assignment.status = status;
    assignment.updatedAt = new Date();
    await shift.save();

    // Notify manager if createdBy exists
    if (shift.createdBy) {
      await Notification.create({
        userId: shift.createdBy,
        company: req.user.company,
        title: `Shift ${status}`,
        message: `${req.user.name} has ${status} the shift: ${shift.title}`,
        type: 'shift-response',
        data: { shiftId: shift._id, employeeId: req.user._id, status }
      });
    }

    req.app.get('io').to(`company:${req.user.company}`).emit('shift:updated', shift);
    res.json(shift);
  } catch (err) {
    console.error('Shift Response Error:', err);
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    // Site-scope enforcement
    const allowedSiteIds = await getUserSiteIds(req.user);
    if (allowedSiteIds !== null && req.body.site) {
      if (!allowedSiteIds.includes(req.body.site.toString())) {
        return res.status(403).json({ message: 'You can only edit shifts at your assigned sites.' });
      }
    }

    const { assignedEmployees } = req.body;
    if (assignedEmployees) {
      req.body.assignments = assignedEmployees.map(id => ({ employee: id, status: 'pending' }));
    }

    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      req.body,
      { new: true }
    );
    if (!shift) return res.status(404).json({ message: 'Not found' });

    req.app.get('io').to(`company:${req.user.company}`).emit('shift:updated', shift);
    res.json(shift);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, requireManagerOrSupervisor, async (req, res) => {
  try {
    // Site-scope enforcement — verify the shift belongs to user's site
    const allowedSiteIds = await getUserSiteIds(req.user);
    if (allowedSiteIds !== null) {
      const shift = await Shift.findOne({ _id: req.params.id, company: req.user.company });
      if (!shift) return res.status(404).json({ message: 'Not found' });
      if (shift.site && !allowedSiteIds.includes(shift.site.toString())) {
        return res.status(403).json({ message: 'You can only delete shifts at your assigned sites.' });
      }
    }

    const result = await Shift.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
