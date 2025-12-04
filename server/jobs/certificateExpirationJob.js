const cron = require('node-cron');
const { getCertificatesExpiringSoon } = require('../models/certificateModel');
const emailService = require('../utils/emailService');

/**
 * Scheduled job to send expiration warning emails to students
 * Runs daily at 9:00 AM
 */
const scheduleCertificateExpirationEmails = () => {
    // Schedule job to run at 9:00 AM every day
    // Cron format: minute hour day month day-of-week
    // '0 9 * * *' means: at minute 0 of hour 9, every day of month, every month, every day of week
    cron.schedule('0 9 * * *', async () => {
        console.log('📧 Starting certificate expiration email job at', new Date().toISOString());

        try {
            // Get all certificates expiring in the next 2 months
            const expiringCertificates = await getCertificatesExpiringSoon();

            console.log(`📧 Found ${expiringCertificates.length} certificate(s) expiring in the next 2 months`);

            if (expiringCertificates.length === 0) {
                console.log('📧 No expiration emails to send');
                return;
            }

            // Send expiration warning emails to each student
            const emailPromises = expiringCertificates.map(async (certificate) => {
                try {
                    // Skip if user email is missing
                    if (!certificate.user_email) {
                        console.log(`⚠️ Skipping certificate ${certificate.id} - no user email found`);
                        return { success: false, email: 'N/A', error: 'No user email' };
                    }

                    const userName = certificate.student_name ||
                        `${certificate.first_name || ''} ${certificate.last_name || ''}`.trim() ||
                        certificate.user_email;

                    console.log(`📧 Sending expiration email to: ${certificate.user_email} for certificate: ${certificate.certificate_name}`);

                    await emailService.sendCertificateExpirationEmail(
                        certificate.user_email,
                        userName,
                        certificate.certificate_name,
                        certificate.expiration_date,
                        certificate.class_name
                    );

                    console.log(`✅ Expiration email sent successfully to: ${certificate.user_email}`);
                    return { success: true, email: certificate.user_email };
                } catch (error) {
                    console.error(`❌ Failed to send expiration email to ${certificate.user_email}:`, error);
                    return { success: false, email: certificate.user_email, error: error.message };
                }
            });

            // Wait for all emails to be sent
            const results = await Promise.allSettled(emailPromises);

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - successful;

            console.log(`📧 Certificate expiration email job completed: ${successful} successful, ${failed} failed`);

        } catch (error) {
            console.error('❌ Error in certificate expiration email job:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }, {
        scheduled: true,
        timezone: "America/New_York" // Adjust timezone as needed
    });

    console.log('✅ Certificate expiration email job scheduled to run daily at 9:00 AM');
};

module.exports = {
    scheduleCertificateExpirationEmails
};

