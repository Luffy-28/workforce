require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Inventory = require('./models/Inventory');
const Shift = require('./models/Shift');
const Task = require('./models/Task');

const seed = async () => {
    try {
        console.log('Starting seed script...');
        console.log('URI:', process.env.MONGODB_URI);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB.');

        // Clear existing data
        console.log('Clearing existing data...');
        await Company.deleteMany({});
        await User.deleteMany({});
        await Attendance.deleteMany({});
        await Inventory.deleteMany({});
        await Shift.deleteMany({});
        await Task.deleteMany({});
        console.log('✅ Data cleared.');

        // 1. Create Company
        console.log('Creating company...');
        const company = await Company.create({
            name: 'Modern Solutions Ltd',
            email: 'contact@modernsolutions.com',
            address: {
                street: '123 Tech Avenue',
                city: 'Silicon Valley',
                zip: '94025',
                country: 'USA'
            },
            subscription: { plan: 'premium', status: 'active' }
        });
        console.log(`✅ Created Company: ${company.name}`);

        // 2. Create Admin
        console.log('Creating users...');
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
            company: company._id,
            status: 'active'
        });

        // 3. Create Manager
        const manager = await User.create({
            name: 'Sarah Manager',
            email: 'manager@test.com',
            password: 'password123',
            role: 'manager',
            company: company._id,
            department: 'Operations',
            status: 'active'
        });

        // 4. Create Employee
        const employee = await User.create({
            name: 'John Employee',
            email: 'employee@test.com',
            password: 'password123',
            role: 'employee',
            company: company._id,
            department: 'Warehouse',
            status: 'active'
        });
        console.log('✅ Created Users: Admin, Manager, Employee');

        // 5. Create Inventory Items
        console.log('Creating inventory...');
        const item1 = await Inventory.create({
            itemName: 'Laptop Pro 14',
            company: company._id,
            category: 'Electronics',
            quantity: 15,
            minThreshold: 5,
            unitType: 'pieces',
            createdBy: admin._id
        });

        const item2 = await Inventory.create({
            itemName: 'Office Chair',
            company: company._id,
            category: 'Furniture',
            quantity: 50,
            minThreshold: 10,
            unitType: 'pieces',
            createdBy: admin._id
        });
        console.log('✅ Created Inventory Items.');

        // 6. Create Shifts
        console.log('Creating shifts...');
        const shift = await Shift.create({
            title: 'Morning Shift',
            company: company._id,
            location: 'Main Office',
            startTime: new Date(new Date().setHours(9, 0, 0, 0)),
            endTime: new Date(new Date().setHours(17, 0, 0, 0)),
            assignedEmployees: [employee._id],
            createdBy: manager._id,
            status: 'upcoming'
        });
        console.log('✅ Created Shifts.');

        // 7. Create Tasks
        console.log('Creating tasks...');
        await Task.create({
            title: 'Inventory Audit',
            company: company._id,
            description: 'Perform a full audit of all electronics.',
            assignedTo: [employee._id],
            createdBy: manager._id,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 2)),
            priority: 'high',
            status: 'pending'
        });
        console.log('✅ Created Tasks.');

        // 8. Create some Attendance records
        console.log('Creating attendance...');
        await Attendance.create({
            userId: employee._id,
            company: company._id,
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
            signInTime: new Date(new Date().setHours(9, 5, 0)),
            signOutTime: new Date(new Date().setHours(17, 10, 0)),
            totalHours: 8.08,
            status: 'present'
        });
        console.log('✅ Created Attendance records.');

        console.log('🚀 Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
};

seed();
