const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');

// POST /api/companies/register
// Regiters a new company AND its first admin user
router.post('/register', [
    body('companyName').notEmpty().trim(),
    body('adminName').notEmpty().trim(),
    body('adminEmail').isEmail().normalizeEmail(),
    body('adminPassword').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { companyName, adminName, adminEmail, adminPassword } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email: adminEmail });
        if (existingUser) return res.status(400).json({ message: 'User already exists with this email' });

        // 1. Create Company
        const company = await Company.create({
            name: companyName,
            email: adminEmail // Use admin email as company contact for now
        });

        // 2. Create Admin User
        const admin = await User.create({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            company: company._id
        });

        res.status(201).json({
            message: 'Company and admin account created successfully',
            company,
            admin: admin.toJSON()
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/companies/employees
// Adds a new employee to the company (Admin only)
router.post('/employees', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only company admins can add employees' });
    }

    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const employee = await User.create({
            name,
            email,
            password,
            role: role || 'employee',
            company: req.user.company
        });

        res.status(201).json({
            message: 'Employee added successfully',
            employee: employee.toJSON()
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/companies/employees
// Get all employees for the company
router.get('/employees', protect, async (req, res) => {
    try {
        const employees = await User.find({ company: req.user.company });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
