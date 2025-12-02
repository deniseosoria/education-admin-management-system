const cron = require('node-cron');
const { getEnrollmentsStartingTomorrow } = require('../models/enrollmentModel');
const emailService = require('../utils/emailService');

/**
 * Scheduled job to send reminder emails to students
 * Runs daily at 10:00 AM
 */
const scheduleReminderEmails = () => {
    // Schedule job to run at 10:00 AM every day
    // Cron format: minute hour day month day-of-week
    // '0 10 * * *' means: at minute 0 of hour 10, every day of month, every month, every day of week
    cron.schedule('0 10 * * *', async () => {
        console.log('📧 Starting reminder email job at', new Date().toISOString());

        try {
            // Get all enrollments that start tomorrow
            const enrollments = await getEnrollmentsStartingTomorrow();

            console.log(`📧 Found ${enrollments.length} enrollment(s) starting tomorrow`);

            if (enrollments.length === 0) {
                console.log('📧 No reminder emails to send');
                return;
            }

            // Send reminder emails to each student
            const emailPromises = enrollments.map(async (enrollment) => {
                try {
                    const userName = enrollment.user_name ||
                        `${enrollment.first_name || ''} ${enrollment.last_name || ''}`.trim() ||
                        enrollment.user_email;

                    console.log(`📧 Sending reminder email to: ${enrollment.user_email} for class: ${enrollment.class_title}`);

                    await emailService.sendClassReminderEmail(
                        enrollment.user_email,
                        userName,
                        enrollment.class_title,
                        {
                            location_type: enrollment.location_type,
                            location_details: enrollment.location_details
                        },
                        {
                            session_date: enrollment.session_date,
                            start_time: enrollment.start_time,
                            end_time: enrollment.end_time
                        }
                    );

                    console.log(`✅ Reminder email sent successfully to: ${enrollment.user_email}`);
                    return { success: true, email: enrollment.user_email };
                } catch (error) {
                    console.error(`❌ Failed to send reminder email to ${enrollment.user_email}:`, error);
                    return { success: false, email: enrollment.user_email, error: error.message };
                }
            });

            // Wait for all emails to be sent
            const results = await Promise.allSettled(emailPromises);

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            console.log(`📧 Reminder email job completed: ${successful} successful, ${failed} failed`);

        } catch (error) {
            console.error('❌ Error in reminder email job:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }, {
        scheduled: true,
        timezone: "America/New_York" // Adjust timezone as needed
    });

    console.log('✅ Reminder email job scheduled to run daily at 10:00 AM');
};

module.exports = {
    scheduleReminderEmails
};

