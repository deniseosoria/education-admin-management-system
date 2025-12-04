const express = require('express');
const router = express.Router();
const {
  enrollInClass,
  cancelClassEnrollment,
  getMyEnrollments,
  getAllEnrollmentsAdmin,
  getPendingEnrollmentsList,
  getEnrollmentDetails,
  approveEnrollmentRequest,
  rejectEnrollmentRequest,
  setEnrollmentToPending,
  getWaitlistStatus,
  testEnrollmentEmail,
  sendEnrollmentEmailForExisting,
  previewEnrollmentEmail
} = require('../controllers/enrollmentController');

const { requireAuth, requireAdmin } = require('../middleware/auth');

// Debug route to test if router is working
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ message: 'Enrollment router is working' });
});

// Preview route (no auth required - safe since it only renders HTML, doesn't send emails)
// MUST be placed at the top to avoid route conflicts with parameterized routes
router.get('/preview-email-dev', (req, res, next) => {
  console.log('✅ Preview email dev route hit - no auth required');
  previewEnrollmentEmail(req, res, next);
});

// Waitlist routes (must come FIRST to avoid conflicts with other routes)
router.get('/waitlist', requireAuth, async (req, res) => {
  console.log('Get all waitlist entries route hit');
  const userId = req.user.id;
  try {
    const { getUserWaitlistEntries } = require('../models/classModel');
    const entries = await getUserWaitlistEntries(userId);
    res.json(entries);
  } catch (err) {
    console.error('Get waitlist entries error:', err);
    res.status(500).json({ error: 'Failed to fetch waitlist entries' });
  }
});

router.get('/waitlist/:classId', requireAuth, (req, res) => {
  console.log('Waitlist GET route hit with classId:', req.params.classId);
  getWaitlistStatus(req, res);
});

router.post('/waitlist/:classId', requireAuth, async (req, res) => {
  console.log('Waitlist POST route hit with classId:', req.params.classId);
  const { classId } = req.params;
  const userId = req.user.id;

  try {
    // Import the class controller function
    const { addToWaitlist } = require('../models/classModel');
    const waitlistEntry = await addToWaitlist(classId, userId);
    res.status(201).json(waitlistEntry);
  } catch (err) {
    console.error('Add to waitlist error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      classId,
      userId
    });

    if (err.message === 'Waitlist is not enabled for this class') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Waitlist is full') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'User is already on the waitlist for this class') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Class not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to add to waitlist' });
  }
});

router.delete('/waitlist/:classId', requireAuth, async (req, res) => {
  console.log('Waitlist DELETE route hit with classId:', req.params.classId);
  // Remove from waitlist
  const { classId } = req.params;
  const userId = req.user.id;

  try {
    const pool = require('../config/db');
    const result = await pool.query(
      'DELETE FROM class_waitlist WHERE class_id = $1 AND user_id = $2 RETURNING *',
      [classId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not on waitlist' });
    }

    res.json({ message: 'Removed from waitlist' });
  } catch (err) {
    console.error('Remove from waitlist error:', err);
    res.status(500).json({ error: 'Failed to remove from waitlist' });
  }
});

// Public routes
// None - all enrollment routes require authentication

// Protected routes (require authentication)
router.post('/:classId', requireAuth, enrollInClass);
router.delete('/:classId', requireAuth, cancelClassEnrollment);
router.get('/my', requireAuth, getMyEnrollments);

// Admin routes
router.get('/', requireAuth, requireAdmin, getAllEnrollmentsAdmin);
router.get('/pending', requireAuth, requireAdmin, getPendingEnrollmentsList);
router.get('/preview-email', requireAuth, requireAdmin, previewEnrollmentEmail);
router.post('/test-email', requireAuth, requireAdmin, testEnrollmentEmail);
router.get('/:id', requireAuth, requireAdmin, getEnrollmentDetails);
router.post('/:id/approve', requireAuth, requireAdmin, approveEnrollmentRequest);
router.post('/:id/reject', requireAuth, requireAdmin, rejectEnrollmentRequest);
router.post('/:id/pending', requireAuth, requireAdmin, setEnrollmentToPending);
router.post('/:id/send-email', requireAuth, requireAdmin, sendEnrollmentEmailForExisting);

console.log('Enrollment routes registered:', router.stack.map(r => r.route?.path).filter(Boolean));

module.exports = router;
