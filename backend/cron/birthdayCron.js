const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Birthday cron — runs every day at 8:00 AM.
 * Finds users whose dob month+day matches today,
 * and sends them a birthday notification.
 */
function startBirthdayCron() {
    cron.schedule('0 8 * * *', async () => {
        try {
            const today = new Date();
            const month = today.getMonth() + 1; // 1-based
            const day = today.getDate();

            // Find all active users with a DOB matching today
            const birthdayUsers = await User.find({
                status: 'active',
                dob: { $exists: true, $ne: null }
            });

            const matches = birthdayUsers.filter(u => {
                const d = new Date(u.dob);
                return d.getMonth() + 1 === month && d.getDate() === day;
            });

            for (const user of matches) {
                // Check if we already sent a birthday notification today
                const existing = await Notification.findOne({
                    userId: user._id,
                    type: 'announcement',
                    title: '🎂 Happy Birthday!',
                    createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
                });

                if (!existing) {
                    await Notification.create({
                        userId: user._id,
                        company: user.company,
                        title: '🎂 Happy Birthday!',
                        message: `Happy Birthday, ${user.name}! 🎉 Wishing you a wonderful day from the entire team!`,
                        type: 'announcement'
                    });
                    console.log(`🎂 Birthday notification sent to ${user.name}`);
                }
            }

            if (matches.length) {
                console.log(`🎂 Birthday check complete: ${matches.length} birthday(s) today`);
            }
        } catch (err) {
            console.error('Birthday cron error:', err.message);
        }
    });

    console.log('🎂 Birthday notification cron scheduled (daily at 8:00 AM)');
}

module.exports = startBirthdayCron;
