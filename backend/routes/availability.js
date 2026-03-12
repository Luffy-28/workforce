const express = require('express');
const router = express.Router();
const Availability = require('../models/Availability');
const { protect } = require('../middleware/auth');

// Get all availability for a company (Manager) or own availability (Employee)
router.get('/', protect, async (req, res) => {
    try {
        const filter = { company: req.user.company };
        if (req.user.role === 'employee') filter.userId = req.user._id;

        const availability = await Availability.find(filter).populate('userId', 'name').sort({ date: 1 });
        res.json(availability);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update or create availability for a date
router.post('/', protect, async (req, res) => {
    try {
        const { date, status, note } = req.body;
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);

        const availability = await Availability.findOneAndUpdate(
            { userId: req.user._id, date: dateStart },
            { status, note, company: req.user.company },
            { upsert: true, new: true, runValidators: true }
        );

        res.json(availability);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// Delete availability
router.delete('/:id', protect, async (req, res) => {
    try {
        const availability = await Availability.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!availability) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
