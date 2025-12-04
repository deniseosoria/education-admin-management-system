const express = require('express');
const router = express.Router();
const {
    previewWelcomeEmail,
    previewPasswordResetEmail,
    previewWaitlistConfirmationEmail,
    previewWaitlistAcceptanceEmail,
    previewWaitlistRejectionEmail,
    previewEnrollmentPendingEmail,
    previewEnrollmentApprovalEmail,
    previewEnrollmentRejectionEmail,
    previewNotificationAlertEmail,
    previewCertificateExpirationEmail,
    previewClassReminderEmail
} = require('../controllers/emailController');

// All preview routes are accessible without authentication for easier development/testing
// These routes only render HTML and don't send emails or modify data

// Welcome email preview
router.get('/preview/welcome', previewWelcomeEmail);

// Password reset email preview
router.get('/preview/password-reset', previewPasswordResetEmail);

// Waitlist email previews
router.get('/preview/waitlist-confirmation', previewWaitlistConfirmationEmail);
router.get('/preview/waitlist-acceptance', previewWaitlistAcceptanceEmail);
router.get('/preview/waitlist-rejection', previewWaitlistRejectionEmail);

// Enrollment email previews
router.get('/preview/enrollment-pending', previewEnrollmentPendingEmail);
router.get('/preview/enrollment-approval', previewEnrollmentApprovalEmail);
router.get('/preview/enrollment-rejection', previewEnrollmentRejectionEmail);

// Notification email preview
router.get('/preview/notification-alert', previewNotificationAlertEmail);

// Certificate email preview
router.get('/preview/certificate-expiration', previewCertificateExpirationEmail);

// Class reminder email preview
router.get('/preview/class-reminder', previewClassReminderEmail);

module.exports = router;

