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
  const { sessionId, paymentMethod } = req.body;

  // Fetch user details from database since JWT only contains id and role
  let userDetails;
  try {
    const userResult = await pool.query(
      'SELECT id, email, name, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    userDetails = userResult.rows[0];
    if (!userDetails) {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error("Error fetching user details:", err);
    return res.status(500).json({ error: "Failed to fetch user details" });
  }

  // Prevent admin or instructor from enrolling
  if (req.user.role === 'admin' || req.user.role === 'instructor') {
    return res.status(403).json({ error: 'Admins and instructors are not allowed to enroll in classes.' });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  // Validate paymentMethod if provided
  if (paymentMethod && paymentMethod !== 'Self' && paymentMethod !== 'EIP') {
    return res.status(400).json({ error: "Payment method must be either 'Self' or 'EIP'" });
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
          userDetails.email,
          userDetails.name || `${userDetails.first_name} ${userDetails.last_name}`,
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
          console.log(`Enrollment email sent for existing enrollment to: ${userDetails.email}`);
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
    const enrollment = await enrollUserInClass(userId, classId, sessionId, "paid", paymentMethod || null);

    // Send pending enrollment email asynchronously (don't wait for it)
    console.log(`📧 Attempting to send enrollment pending email to: ${userDetails.email}`);
    console.log(`📧 User details:`, {
      email: userDetails.email,
      name: userDetails.name || `${userDetails.first_name} ${userDetails.last_name}`,
      classTitle: classDetails.title,
      sessionDate: session.rows[0].session_date,
      startTime: session.rows[0].start_time,
      endTime: session.rows[0].end_time
    });

    // Send enrollment email asynchronously (don't wait for it)
    emailService.sendEnrollmentPendingEmail(
      userDetails.email,
      userDetails.name || `${userDetails.first_name} ${userDetails.last_name}`,
      classDetails.title,
      {
        location_details: classDetails.location_details
      },
      {
        session_date: session.rows[0].session_date,
        start_time: session.rows[0].start_time,
        end_time: session.rows[0].end_time,
        eip_url: session.rows[0].eip_url
      },
      paymentMethod
    ).then(() => {
      console.log(`Enrollment pending email sent to: ${userDetails.email}`);
    }).catch((emailError) => {
      console.error("Email sending failed:", emailError);
    });

    // Send admin notification email (non-blocking)
    emailService.sendAdminEnrollmentNotification(
      userDetails.email,
      userDetails.name || `${userDetails.first_name} ${userDetails.last_name}`,
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
      console.log(`Admin enrollment notification sent for: ${userDetails.email} in ${classDetails.title}`);
    }).catch((emailError) => {
      console.error("Failed to send admin enrollment notification:", emailError);
      // Don't fail the enrollment if email fails
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
    console.log('getMyEnrollments called for user:', userId);
    const enrollments = await getUserEnrollments(userId);
    console.log('getMyEnrollments returning:', enrollments.length, 'enrollments');
    res.json(enrollments);
  } catch (err) {
    console.error("Get enrollments error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ error: "Failed to fetch enrollments", details: err.message });
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

// @desc    Preview enrollment pending email in browser (admin only)
// @route   GET /api/enrollments/preview-email
// @access  Admin
const previewEnrollmentEmail = async (req, res) => {
  const { userEmail, userName, className, classDetails, sessionDetails, paymentMethod } = req.query;

  // Use default values if not provided
  const defaultUserName = userName || 'John Doe';
  const defaultClassName = className || 'Sample Class';
  const defaultPaymentMethod = paymentMethod || null;
  const defaultClassDetails = {
    location_details: classDetails?.location_details || '123 Main St, New York, NY 10001'
  };
  const defaultSessionDetails = {
    session_date: sessionDetails?.session_date || new Date().toISOString(),
    start_time: sessionDetails?.start_time || '10:00:00',
    end_time: sessionDetails?.end_time || '12:00:00',
    eip_url: sessionDetails?.eip_url || null
  };

  try {
    // Generate the email HTML using the actual email service function
    const emailService = require('../utils/emailService');

    // We'll generate the HTML manually here to match the email service
    const formatTime = (timeString) => {
      if (!timeString) return '';
      const [hour, minute] = timeString.split(':');
      const date = new Date();
      date.setHours(Number(hour), Number(minute));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #000000; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Enrollment Submitted</h1>
        <div style="border-bottom: 1px solid #000000; margin-bottom: 30px;"></div>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Hello ${defaultUserName},
        </p>
        
        <p style="color: #000000; line-height: 1.6; margin-bottom: 20px;">
          Thank you for enrolling in <strong>${defaultClassName}</strong>. Your enrollment has been successfully submitted and is now pending approval from our team.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Enrollment Details</h2>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Class:</strong> ${defaultClassName}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Date:</strong> ${new Date(defaultSessionDetails.session_date).toLocaleDateString()}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Time:</strong> ${formatTime(defaultSessionDetails.start_time)} - ${formatTime(defaultSessionDetails.end_time)}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Location:</strong> ${defaultClassDetails.location_details}</p>
          <p style="color: #000000; line-height: 1.8; margin: 5px 0;"><strong>Status:</strong> Pending Approval</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">What Happens Next?</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            ${defaultPaymentMethod === 'EIP' ? `<li>Please apply for scholarship through EIP (Educational Incentive Program) to complete your enrollment <a href="${defaultSessionDetails.eip_url || 'https://www.ecetp.pdp.albany.edu'}" style="color: #ff0000; text-decoration: underline;">(Click here)</a></li>` : ''}
            <li>Our team will review your enrollment request</li>
            <li>You'll receive an email notification once your enrollment is approved or rejected</li>
            <li>If approved, you'll get confirmation details and next steps</li>
            <li>You can check your enrollment status anytime in your profile</li>
            <li>We typically process enrollments within 1-2 business days</li>
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 15px;">Important Notes</h2>
          <ul style="color: #000000; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Please do not make travel arrangements until your enrollment is approved</li>
            <li>If you need to make changes, contact us as soon as possible</li>
            <li>Your spot is reserved while your enrollment is being reviewed</li>
            <li>You'll be notified immediately once a decision is made</li>
          </ul>
        </div>
        
        <div style="margin: 40px 0;">
          <h2 style="color: #000000; font-size: 18px; font-weight: 600; margin-bottom: 20px; border-bottom: 1px solid #000000; padding-bottom: 10px;">
            Policies & Procedures
          </h2>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Registration Fee</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Class must be paid in full before the class start date. Cash, checks, money orders, and EIP award letters are accepted. If using EIP award letter, we must receive the award letter prior to the class start date. Payment plans are available upon request.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Financial Aid</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin-bottom: 8px;">
              Scholarship funding to participate in this training may be available through the Educational Incentive Program (EIP). For more information or to apply for a scholarship, please visit <a href="https://www.ecetp.pdp.albany.edu" style="color: #000000; text-decoration: underline;">www.ecetp.pdp.albany.edu</a>.
            </p>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              You may also contact EIP by email at <a href="mailto:eip@albany.edu" style="color: #000000; text-decoration: underline;">eip@albany.edu</a>, or by phone at either (800) 295-9616 or (518) 442-6575. Call us for more information.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Refunds</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Participants waiting for an EIP award letter must pay for the class and payment will be reimbursed once EIP award letter is received.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Cancellation and Credit</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Cancellations must be made at least 3 days prior to the training session. A credit or refund will be issued for advanced cancellations or if cancellation was made by YJ Child Care Plus, Inc. No credits will be granted to EIP award recipients. In case of any cancellations unused awards must be returned to EIP and you must reapply online for the next available class.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Certificates</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              A certificate will be provided to each attendee after the completion of training and receipt of full payment. Certificates will include the name of the workshop, class date and expiration date, number of training hours completed and the trainer's name and Aspire ID number.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Participant's Responsibilities</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Participants are responsible for attending all training sessions and to complete all class assignments in order to receive a certificate of completion; responsible for purchasing all required class materials; and responsible for making up any missing sessions.
            </p>
          </div>
          
          <div style="margin-bottom: 25px; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Children</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              Child care is not available and children will not be allowed in the training sessions.
            </p>
          </div>
          
          <div style="margin-bottom: 0; padding-top: 20px; border-top: 1px solid #cccccc;">
            <h3 style="color: #000000; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Policy on Non-Discrimination</h3>
            <p style="color: #000000; line-height: 1.7; font-size: 14px; margin: 0;">
              YJ Child Care Plus, Inc does not discriminate on the basis of age, sex, sexual orientation, religion, race, color, nationality, ethnic origin, disability, or veteran or marital status in its participants' access to training, and administration of training policies.
            </p>
          </div>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="https://yjchildcareplus.com/profile?section=enrollments" 
             style="color: #000000; text-decoration: underline; font-weight: 600;">
            View My Enrollments
          </a>
        </div>
        
        <div style="border-top: 1px solid #cccccc; padding-top: 20px; margin-top: 40px;">
          <p style="color: #666666; font-size: 14px; margin-bottom: 10px;">
            <strong>Questions?</strong> Contact our support team if you need assistance.
          </p>
          <p style="color: #666666; font-size: 14px; margin: 0;">
            Contact us at <a href="mailto:yvelisse225@gmail.com" style="color: #000000; text-decoration: underline;">yvelisse225@gmail.com</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #cccccc;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The YJ Child Care Plus Team</strong>
          </p>
        </div>
      </div>
    `;

    // Return HTML directly to browser
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error("Preview email error:", error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Error generating email preview</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
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
  previewEnrollmentEmail,
};
