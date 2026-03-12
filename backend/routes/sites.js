const express = require('express');
const router = express.Router();
const Site = require('../models/Site');
const User = require('../models/User');
const { protect, requireAdmin, requireManager } = require('../middleware/auth');

// Get all sites for company
router.get('/', protect, async (req, res) => {
    try {
        const sites = await Site.find({ company: req.user.company }).populate('manager', 'name email');
        res.json(sites);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create site (Admin only)
router.post('/', protect, requireAdmin, async (req, res) => {
    try {
        const site = await Site.create({
            ...req.body,
            company: req.user.company
        });
        res.status(201).json(site);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update site (Admin only)
router.patch('/:id', protect, requireAdmin, async (req, res) => {
    try {
        const site = await Site.findOneAndUpdate(
            { _id: req.params.id, company: req.user.company },
            req.body,
            { new: true }
        );
        if (!site) return res.status(404).json({ message: 'Site not found' });
        res.json(site);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete site (Admin only)
router.delete('/:id', protect, requireAdmin, async (req, res) => {
    try {
        const site = await Site.findOneAndDelete({ _id: req.params.id, company: req.user.company });
        if (!site) return res.status(404).json({ message: 'Site not found' });
        // Clear site from users
        await User.updateMany({ site: req.params.id }, { $unset: { site: 1 } });
        res.json({ message: 'Site deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
