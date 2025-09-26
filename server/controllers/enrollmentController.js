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
      // Get existing enrollment details to send email
      const existingEnrollment = await pool.query(
        'SELECT e.*, c.title, c.location_details, cs.session_date, cs.start_time, cs.end_time FROM enrollments e JOIN classes c ON c.id = e.class_id JOIN class_sessions cs ON cs.id = e.session_id WHERE e.user_id = $1 AND e.class_id = $2 ORDER BY e.enrolled_at DESC LIMIT 1',
        [userId, classId]
      );

      if (existingEnrollment.rows[0]) {
        const enrollment = existingEnrollment.rows[0];

        // Send enrollment email for existing enrollment
        emailService.sendEnrollmentPendingEmail(
          req.user.email,
          req.user.name || `${req.user.first_name} ${req.user.last_name}`,
          enrollment.title,
          {
            location_details: enrollment.location_details
          },
          {
            session_date: enrollment.session_date,
            start_time: enrollment.start_time,
            end_time: enrollment.end_time
          }
        ).then(() => {
          console.log(`Enrollment email sent for existing enrollment to: ${req.user.email}`);
        }).catch((emailError) => {
          console.error("Email sending failed for existing enrollment:", emailError);
        });
      }

      return res.status(400).json({
        error: "User already enrolled in this class",
        message: "You are already enrolled in this class. Check your email for enrollment details."
      });
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
    console.log(`📧 Attempting to send enrollment pending email to: ${req.user.email}`);
    console.log(`📧 User details:`, {
      email: req.user.email,
      name: req.user.name || `${req.user.first_name} ${req.user.last_name}`,
      classTitle: classDetails.title,
      sessionDate: session.rows[0].session_date,
      startTime: session.rows[0].start_time,
      endTime: session.rows[0].end_time
    });

    // Send enrollment email asynchronously (don't wait for it)
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

// @desc    Test enrollment email (admin only)
// @route   POST /api/enrollments/test-email
// @access  Admin
const testEnrollmentEmail = async (req, res) => {
  const { userEmail, userName, className, classDetails, sessionDetails } = req.body;

  if (!userEmail || !userName || !className) {
    return res.status(400).json({ error: "Missing required fields: userEmail, userName, className" });
  }

  try {
    console.log(`🧪 Testing enrollment email for: ${userEmail}`);

    // For test emails, use the specific URL
    const testEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Enrollment Submitted</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0; font-size: 16px;">Your enrollment is pending approval</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #34495e; font-size: 20px; margin-bottom: 15px;">Hello ${userName}! 📝</h2>
            <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 15px;">
              Thank you for enrolling in <strong>${className}</strong>. Your enrollment has been successfully submitted and is now pending approval from our team.
            </p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Enrollment Details</h3>
            <div style="color: #2c3e50; line-height: 1.8;">
              <p><strong>Class:</strong> ${className}</p>
              <p><strong>Date:</strong> ${new Date(sessionDetails?.session_date || new Date()).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${sessionDetails?.start_time || "10:00 AM"} - ${sessionDetails?.end_time || "12:00 PM"}</p>
              <p><strong>Location:</strong> ${classDetails?.location_details || "Test Location"}</p>
              <p><strong>Status:</strong> <span style="color: #ffc107; font-weight: bold;">⏳ Pending Approval</span></p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://yjchildcareplus.com/profile?section=enrollments" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View My Enrollments
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="color: #95a5a6; font-size: 12px; margin: 0;">
              Best regards,<br>
              <strong>The YJ Child Care Plus Team</strong>
            </p>
          </div>
        </div>
      </div>
    `;

    const result = await emailService.sendEmail({
      to: userEmail,
      subject: `⏳ Enrollment Submitted: ${className} - Pending Approval`,
      html: testEmailHtml
    });

    console.log(`🧪 Test email result:`, result);
    res.json({
      success: true,
      message: "Test email sent successfully",
      result: result
    });
  } catch (error) {
    console.error("🧪 Test email error:", error);
    res.status(500).json({
      error: "Failed to send test email",
      details: error.message
    });
  }
};

// @desc    Send enrollment email for existing enrollment (admin only)
// @route   POST /api/enrollments/:id/send-email
// @access  Admin
const sendEnrollmentEmailForExisting = async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`📧 Sending enrollment email for existing enrollment ID: ${id}`);

    // Get enrollment details
    const enrollment = await getEnrollmentById(id);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    // Get class and session details
    const classDetails = await getClassWithDetails(enrollment.class_id);
    if (!classDetails) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Send the enrollment pending email
    const result = await emailService.sendEnrollmentPendingEmail(
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
      }
    );

    console.log(`✅ Enrollment email sent for existing enrollment ID: ${id}`);
    res.json({
      success: true,
      message: "Enrollment email sent successfully",
      result: result
    });
  } catch (error) {
    console.error("❌ Error sending enrollment email for existing enrollment:", error);
    res.status(500).json({
      error: "Failed to send enrollment email",
      details: error.message
    });
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
  testEnrollmentEmail,
  sendEnrollmentEmailForExisting,
};
