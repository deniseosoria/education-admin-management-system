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

// Email test route (for debugging)
router.post('/test-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required for testing' });
  }

  try {
    console.log('🧪 Testing email delivery to:', email);
    const result = await emailService.testEmailDelivery(email);

    res.status(200).json({
      message: 'Test email sent',
      success: result,
      testEmail: email
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// User profile routes
router.get('/profile', requireAuth, getUserProfile);
router.put('/profile', requireAuth, updateUserProfile);

// Admin-only route to get all users
router.get('/', requireAuth, requireAdmin, getAllUserAccounts);

module.exports = router;

