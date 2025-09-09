const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  validateRegistration,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
} = require('../controllers/authController');
const {
  getUserProfile,
  getAllUserAccounts,
  updateUserProfile
} = require('../controllers/userController');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const emailService = require('../utils/emailService');

// Auth routes
router.post('/register', validateRegistration, registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Password reset routes
router.post('/forgot-password', requestPasswordReset);
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Test email functionality (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const emailService = require('../utils/emailService');

      // Test SMTP connection
      const connectionTest = await emailService.testSMTPConnection();
      if (!connectionTest) {
        return res.status(500).json({ error: 'SMTP connection test failed' });
      }

      // Test email delivery
      const deliveryTest = await emailService.testEmailDelivery(email);

      res.json({
        success: deliveryTest,
        message: deliveryTest ? 'Test email sent successfully' : 'Test email failed to send',
        connectionTest: true
      });
    } catch (error) {
      console.error('Email test error:', error);
      res.status(500).json({ error: 'Email test failed', details: error.message });
    }
  });
}


// User profile routes
router.get('/profile', requireAuth, getUserProfile);
router.put('/profile', requireAuth, updateUserProfile);

// Admin-only route to get all users
router.get('/', requireAuth, requireAdmin, getAllUserAccounts);

module.exports = router;

