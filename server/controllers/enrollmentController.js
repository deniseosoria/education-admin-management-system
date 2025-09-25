const {
  enrollUserInClass,
  cancelEnrollment,
  getUserEnrollments,
  isUserAlreadyEnrolled,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,
  setEnrollmentPending,
  getPendingEnrollments,
  getEnrollmentById
} = require("../models/enrollmentModel");

const {
  getClassById,
  getClassWithDetails
} = require("../models/classModel");

const emailService = require("../utils/emailService");
const { validateEmail } = require("../utils/validators");
const pool = require("../config/db");

// @desc    Enroll user in a class
// @route   POST /api/enrollments/:classId
// @access  Private
const enrollInClass = async (req, res) => {
  const userId = req.user.id;
  const classId = req.params.classId;
  const { sessionId } = req.body;

  // Prevent admin or instructor from enrolling
  if (req.user.role === 'admin' || req.user.role === 'instructor') {
    return res.status(403).json({ error: 'Admins and instructors are not allowed to enroll in classes.' });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  try {
    // Check if already enrolled
    const alreadyEnrolled = await isUserAlreadyEnrolled(userId, classId);
    if (alreadyEnrolled) {
      return res.status(400).json({ error: "User already enrolled in this class" });
    }

    // Validate class exists and is available
    const classDetails = await getClassWithDetails(classId);
    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Validate session exists and belongs to this class
    const session = await pool.query(
      'SELECT * FROM class_sessions WHERE id = $1 AND class_id = $2',
      [sessionId, classId]
    );
    if (!session.rows[0]) {
      return res.status(400).json({ error: "Invalid session for this class" });
    }

    const now = new Date();
    if (new Date(session.rows[0].session_date) <= now) {
      return res.status(400).json({ error: "Session has already started or ended" });
    }

    if (session.rows[0].enrolled_count >= session.rows[0].capacity) {
      return res.status(400).json({ error: "Session is full" });
    }

    // Create enrollment
    const enrollment = await enrollUserInClass(userId, classId, sessionId, "paid");

    // Send pending enrollment email asynchronously (don't wait for it)
    emailService.sendEnrollmentPendingEmail(
      req.user.email,
      req.user.name || `${req.user.first_name} ${req.user.last_name}`,
      classDetails.title,
      {
        location_details: classDetails.location_details
      },
      {
        session_date: session.rows[0].session_date,
        start_time: session.rows[0].start_time,
        end_time: session.rows[0].end_time
      }
    ).then(() => {
      console.log(`Enrollment pending email sent to: ${req.user.email}`);
    }).catch((emailError) => {
      console.error("Email sending failed:", emailError);
      // Email failure doesn't affect enrollment success
    });

    // Send response immediately without waiting for email
    res.status(201).json(enrollment);
  } catch (err) {
    console.error("Enrollment error:", err);
    res.status(500).json({ error: "Failed to enroll in class" });
  }
};

// @desc    Cancel enrollment
// @route   DELETE /api/enrollments/:classId
// @access  Private
const cancelClassEnrollment = async (req, res) => {
  const userId = req.user.id;
  const classId = req.params.classId;

  try {
    const classDetails = await getClassById(classId);
    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Check if class has already started
    const now = new Date();
    if (new Date(classDetails.date) <= now) {
      return res.status(400).json({ error: "Cannot cancel enrollment for a class that has already started" });
    }

    const canceled = await cancelEnrollment(userId, classId);
    if (!canceled) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Send cancellation email
    try {
      await sendEmail({
        to: req.user.email,
        subject: "Class Enrollment Cancellation",
        html: `
          <h2>Enrollment Cancellation</h2>
          <p>Your enrollment in "${classDetails.title}" has been cancelled.</p>
          <p>If you did not request this cancellation, please contact us immediately.</p>
        `
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.json({ message: "Enrollment cancelled successfully" });
  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: "Failed to cancel enrollment" });
  }
};

// @desc    Get current user's enrolled classes
// @route   GET /api/enrollments/my
// @access  Private
const getMyEnrollments = async (req, res) => {
  const userId = req.user.id;

  try {
    const enrollments = await getUserEnrollments(userId);
    res.json(enrollments);
  } catch (err) {
    console.error("Get enrollments error:", err);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
};

// @desc    Get all enrollments (admin)
// @route   GET /api/enrollments
// @access  Admin
const getAllEnrollmentsAdmin = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      class_id: req.query.classId,
      user_id: req.query.userId,
      start_date: req.query.startDate,
      end_date: req.query.endDate,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
    };

    console.log('Admin enrollment request received with filters:', filters);
    console.log('User making request:', req.user);

    const { enrollments, total } = await getAllEnrollments(filters);
    console.log('Enrollments found:', enrollments.length, 'Total:', total);

    res.json({ enrollments, total });
  } catch (err) {
    console.error("Admin fetch error:", err);
    res.status(500).json({ error: "Failed to fetch all enrollments" });
  }
};

// @desc    Get pending enrollments (admin)
// @route   GET /api/enrollments/pending
// @access  Admin
const getPendingEnrollmentsList = async (req, res) => {
  try {
    const enrollments = await getPendingEnrollments();
    res.json(enrollments);
  } catch (err) {
    console.error("Get pending enrollments error:", err);
    res.status(500).json({ error: "Failed to fetch pending enrollments" });
  }
};

// @desc    Get enrollment by ID
// @route   GET /api/enrollments/:id
// @access  Admin
const getEnrollmentDetails = async (req, res) => {
  try {
    const enrollment = await getEnrollmentById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }
    res.json(enrollment);
  } catch (err) {
    console.error("Get enrollment details error:", err);
    res.status(500).json({ error: "Failed to fetch enrollment details" });
  }
};

// @desc    Approve enrollment (admin)
// @route   PUT /api/enrollments/:id/approve
// @access  Admin
const approveEnrollmentRequest = async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id;

  try {
    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    if (enrollment.enrollment_status !== 'pending') {
      return res.status(400).json({ error: "Can only approve pending enrollments" });
    }

    const approvedEnrollment = await approveEnrollment(id, adminId, adminNotes);

    // Send approval email asynchronously (don't wait for it)
    emailService.sendEnrollmentApprovalEmail(
      enrollment.user_email,
      enrollment.user_name,
      enrollment.class_title,
      {
        location_details: enrollment.location_details
      },
      {
        session_date: enrollment.class_date,
        start_time: enrollment.start_time,
        end_time: enrollment.end_time
      },
      adminNotes
    ).then(() => {
      console.log(`Enrollment approval email sent to: ${enrollment.user_email}`);
    }).catch((emailError) => {
      console.error("Email sending failed:", emailError);
    });

    // Send response immediately without waiting for email
    res.json(approvedEnrollment);
  } catch (err) {
    console.error("Approve enrollment error:", err);
    res.status(500).json({ error: "Failed to approve enrollment" });
  }
};

// @desc    Reject enrollment (admin)
// @route   PUT /api/enrollments/:id/reject
// @access  Admin
const rejectEnrollmentRequest = async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id;

  try {
    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    if (enrollment.enrollment_status !== 'pending') {
      return res.status(400).json({ error: "Can only reject pending enrollments" });
    }

    const rejectedEnrollment = await rejectEnrollment(id, adminId, adminNotes);

    // Send rejection email asynchronously (don't wait for it)
    emailService.sendEnrollmentRejectionEmail(
      enrollment.user_email,
      enrollment.user_name,
      enrollment.class_title,
      {
        location_details: enrollment.location_details
      },
      {
        session_date: enrollment.class_date,
        start_time: enrollment.start_time,
        end_time: enrollment.end_time
      },
      adminNotes
    ).then(() => {
      console.log(`Enrollment rejection email sent to: ${enrollment.user_email}`);
    }).catch((emailError) => {
      console.error("Email sending failed:", emailError);
    });

    // Send response immediately without waiting for email
    res.json(rejectedEnrollment);
  } catch (err) {
    console.error("Reject enrollment error:", err);
    res.status(500).json({ error: "Failed to reject enrollment" });
  }
};

// @desc    Set enrollment to pending (admin)
// @route   POST /api/enrollments/:id/pending
// @access  Admin
const setEnrollmentToPending = async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id;

  try {
    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    if (enrollment.enrollment_status === 'pending') {
      return res.status(400).json({ error: "Enrollment is already pending" });
    }

    const pendingEnrollment = await setEnrollmentPending(id, adminId, adminNotes);

    // Send notification email
    try {
      await sendEmail({
        to: enrollment.user_email,
        subject: "Enrollment Status Update",
        html: `
          <h2>Enrollment Status Update</h2>
          <p>Your enrollment in "${enrollment.class_title}" has been set to pending.</p>
          ${adminNotes ? `<p>Notes: ${adminNotes}</p>` : ''}
          <p>We will review your enrollment and update you soon.</p>
        `
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.json(pendingEnrollment);
  } catch (err) {
    console.error("Set enrollment pending error:", err);
    res.status(500).json({ error: "Failed to set enrollment to pending" });
  }
};

// @desc    Get waitlist status for a class and user
// @route   GET /api/enrollments/waitlist/:classId
// @access  Private
const getWaitlistStatus = async (req, res) => {
  const userId = req.user.id;
  const classId = req.params.classId;
  try {
    const result = await pool.query(
      `SELECT * FROM class_waitlist WHERE class_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [classId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not on waitlist' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get waitlist status error:', err);
    res.status(500).json({ error: 'Failed to fetch waitlist status' });
  }
};

module.exports = {
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
};
