const {
  getAllUsers,
  searchUsers
} = require('../models/userModel');

const {
  getAllClassesFromDB,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassSessions,
  getClassWaitlist,
  updateClassStatus,
  updateWaitlistStatus,
  getClassWithDetails,
  getClassParticipants,
  createClassWithSessions,
  updateClassWithSessions,
  addToWaitlist,
  getHistoricalEnrollments,
  getAllEnrollmentsForClass
} = require('../models/classModel');

const {
  getAllEnrollments,
  getPendingEnrollments,
  getEnrollmentById,
  approveEnrollment,
  rejectEnrollment,
  cancelEnrollment
} = require('../models/enrollmentModel');

const {
  getAllPayments,
  getPaymentById,
  getFinancialSummary,
  getRevenueByClass,
  processRefund,
  getOutstandingPayments
} = require('../models/paymentModel');

const pool = require('../config/db'); // for direct deletes

const { getDashboardStats } = require('../models/dashboardModel');

const { getAllWaitlistEntries } = require('../models/adminModel');

// @desc    Get all users (with optional search, pagination, and role filter)
const adminGetUsers = async (req, res) => {
  try {
    console.log('adminGetUsers: Starting to fetch users...');
    const { page, limit, search, role } = req.query;
    if (page || limit || search || role) {
      // Use searchUsers for advanced queries
      const result = await searchUsers({
        searchTerm: search || '',
        role: role && role !== 'all' ? role : null,
        limit: limit ? parseInt(limit) : 50,
        offset: page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0,
        includeInactive: true
      });
      res.json({ users: result.users, pagination: { total: result.total, page: parseInt(page) || 1, limit: parseInt(limit) || 50, totalPages: Math.ceil(result.total / (parseInt(limit) || 50)) } });
      return;
    }
    // Default: return all users
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('adminGetUsers: Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Delete user by ID
const adminDeleteUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// @desc    Get all classes with session and enrollment counts
const adminGetClasses = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.title, c.description, c.price, c.location_type, c.location_details, 
        c.recurrence_pattern, c.prerequisites, c.materials_needed, c.image_url,
        c.created_at, c.updated_at,
        (SELECT CONCAT(u.first_name, ' ', u.last_name) 
         FROM class_sessions cs 
         JOIN users u ON u.id = cs.instructor_id 
         WHERE cs.class_id = c.id AND cs.deleted_at IS NULL 
         LIMIT 1) as instructor_name,
        (SELECT COUNT(*) FROM class_sessions cs WHERE cs.class_id = c.id AND cs.deleted_at IS NULL) as total_sessions,
        (SELECT COUNT(*) 
         FROM enrollments e 
         JOIN class_sessions cs ON cs.id = e.session_id AND cs.deleted_at IS NULL
         WHERE e.class_id = c.id 
         AND e.enrollment_status IN ('approved', 'pending')
         AND (
           (cs.end_date IS NOT NULL AND cs.end_date > CURRENT_DATE) OR
           (cs.end_date IS NULL AND cs.session_date > CURRENT_DATE)
         )
        ) as total_enrollments
      FROM classes c
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get classes error:', err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

// @desc    Edit class
const adminEditClass = async (req, res) => {
  const classId = req.params.classId;
  const updates = req.body;

  try {
    console.log('📝 adminEditClass called for class:', classId);
    console.log('📝 Updates received:', JSON.stringify(updates, null, 2));
    console.log('📝 Dates array:', updates.dates ? JSON.stringify(updates.dates, null, 2) : 'No dates');

    const classItem = await getClassById(classId);
    if (!classItem) return res.status(404).json({ error: 'Class not found' });

    // Validate dates array if provided
    if (updates.dates && Array.isArray(updates.dates)) {
      for (const dateData of updates.dates) {
        console.log('📝 Validating session:', dateData);
        if (!dateData.date || !dateData.start_time || !dateData.end_time || !dateData.instructor_id) {
          return res.status(400).json({ error: 'Each session must have date, start_time, end_time, and instructor_id' });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateData.date)) {
          return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
        }

        // Validate time format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(dateData.start_time) || !timeRegex.test(dateData.end_time)) {
          return res.status(400).json({ error: 'Time must be in HH:MM format' });
        }

        // Validate end_date if provided
        if (dateData.end_date && !dateRegex.test(dateData.end_date)) {
          return res.status(400).json({ error: 'End date must be in YYYY-MM-DD format' });
        }

        // Validate that end_date is not before start date
        if (dateData.end_date && new Date(dateData.end_date) < new Date(dateData.date)) {
          return res.status(400).json({ error: 'End date cannot be before start date' });
        }
      }
    }

    // Use the new function that handles sessions
    const updatedClass = await updateClassWithSessions(classId, updates);
    res.json(updatedClass);
  } catch (err) {
    console.error('Update class error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint
    });
    res.status(500).json({
      error: 'Failed to update class',
      message: err.message,
      detail: err.detail || undefined
    });
  }
};

// @desc    Delete class
const adminDeleteClass = async (req, res) => {
  const classId = req.params.classId;
  try {
    await deleteClass(classId);
    res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
};

// @desc    Get total enrollment count
const adminEnrollmentStats = async (req, res) => {
  try {
    const adminModel = require('../models/adminModel');
    const stats = await adminModel.getEnrollmentStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching enrollment stats:', err);
    res.status(500).json({ error: 'Failed to fetch enrollment stats' });
  }
};

// @desc    Remove a user from a class
const adminRemoveUserFromClass = async (req, res) => {
  const { userId, classId } = req.params;

  try {
    const removed = await cancelEnrollment(userId, classId);
    if (!removed) return res.status(404).json({ error: 'Enrollment not found' });

    res.json({ message: 'User removed from class' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user from class' });
  }
};

// @desc    Get pending enrollments
const adminGetPendingEnrollments = async (req, res) => {
  try {
    const pendingEnrollments = await getPendingEnrollments();
    res.json(pendingEnrollments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending enrollments' });
  }
};

// @desc    Get enrollment details
const adminGetEnrollmentDetails = async (req, res) => {
  try {
    const enrollment = await getEnrollmentById(req.params.enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enrollment details' });
  }
};

// @desc    Approve an enrollment
const adminApproveEnrollment = async (req, res) => {
  const { enrollmentId } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id; // From auth middleware

  try {
    const enrollment = await getEnrollmentById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.enrollment_status !== 'pending') {
      return res.status(400).json({ error: 'Enrollment is not pending approval' });
    }

    const approvedEnrollment = await approveEnrollment(enrollmentId, adminId, adminNotes);
    res.json(approvedEnrollment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve enrollment' });
  }
};

// @desc    Reject an enrollment
const adminRejectEnrollment = async (req, res) => {
  const { enrollmentId } = req.params;
  const { adminNotes } = req.body;
  const adminId = req.user.id; // From auth middleware

  try {
    const enrollment = await getEnrollmentById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (enrollment.enrollment_status !== 'pending') {
      return res.status(400).json({ error: 'Enrollment is not pending approval' });
    }

    const rejectedEnrollment = await rejectEnrollment(enrollmentId, adminId, adminNotes);
    res.json(rejectedEnrollment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject enrollment' });
  }
};

// @desc    Get financial summary
const adminGetFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const summary = await getFinancialSummary(startDate, endDate);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
};

// @desc    Get revenue by class
const adminGetRevenueByClass = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const revenue = await getRevenueByClass(startDate, endDate);
    res.json(revenue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revenue by class' });
  }
};

// @desc    Get all payments with filters
const adminGetAllPayments = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      refundStatus,
      userId,
      classId
    } = req.query;

    const payments = await getAllPayments({
      startDate,
      endDate,
      status,
      refundStatus,
      userId,
      classId
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// @desc    Get payment details
const adminGetPaymentDetails = async (req, res) => {
  try {
    const payment = await getPaymentById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
};

// @desc    Process a refund
const adminProcessRefund = async (req, res) => {
  const { paymentId } = req.params;
  const { refundAmount, refundReason } = req.body;
  const adminId = req.user.id;

  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.refund_status) {
      return res.status(400).json({ error: 'Payment has already been refunded' });
    }

    if (refundAmount > payment.amount) {
      return res.status(400).json({ error: 'Refund amount cannot exceed payment amount' });
    }

    const refundedPayment = await processRefund(paymentId, {
      refundAmount,
      refundReason,
      adminId
    });

    res.json(refundedPayment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

// @desc    Create a new class
// @route   POST /api/admin/classes
// @access  Admin
const adminCreateClass = async (req, res) => {
  const {
    title,
    description,
    dates,
    location_type,
    location_details,
    price,
    capacity,
    instructor_id,
    prerequisites,
    materials_needed,
    image_url
  } = req.body;

  // Validate required fields
  const requiredFields = [
    'title', 'description', 'dates', 'location_details', 'price'
  ];
  const missingFields = requiredFields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      fields: missingFields
    });
  }

  // Validate dates array
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'At least one session date is required' });
  }

  // Validate each date entry
  for (const dateData of dates) {
    if (!dateData.date || !dateData.start_time || !dateData.end_time || !dateData.instructor_id) {
      return res.status(400).json({ error: 'Each session must have date, start_time, end_time, and instructor_id' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateData.date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(dateData.start_time) || !timeRegex.test(dateData.end_time)) {
      return res.status(400).json({ error: 'Time must be in HH:MM format' });
    }

    // Validate end_date if provided
    if (dateData.end_date && !dateRegex.test(dateData.end_date)) {
      return res.status(400).json({ error: 'End date must be in YYYY-MM-DD format' });
    }

    // Validate that end_date is not before start date
    if (dateData.end_date && new Date(dateData.end_date) < new Date(dateData.date)) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }
  }

  // Validate field types
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  if (typeof capacity !== 'number' || capacity <= 0) {
    return res.status(400).json({ error: 'Capacity must be a positive number' });
  }

  try {
    const newClass = await createClassWithSessions({
      title,
      description,
      dates,
      location_type: location_type || 'in-person',
      location_details,
      price,
      capacity,
      instructor_id,
      prerequisites,
      materials_needed,
      image_url
    });

    res.status(201).json(newClass);
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ error: 'Failed to create class' });
  }
};

// @desc    Get class details with enhanced information
// @route   GET /api/admin/classes/:classId
// @access  Admin
const adminGetClassDetails = async (req, res) => {
  try {
    const classDetails = await getClassWithDetails(req.params.classId);
    if (!classDetails) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(classDetails);
  } catch (err) {
    console.error('Get class details error:', err);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
};

// @desc    Get class sessions
// @route   GET /api/admin/classes/:classId/sessions
// @access  Admin
const adminGetClassSessions = async (req, res) => {
  try {
    const sessions = await getClassSessions(req.params.classId);
    res.json(sessions);
  } catch (err) {
    console.error('Get class sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch class sessions' });
  }
};

// @desc    Update class status
// @route   PUT /api/admin/classes/:classId/status
// @access  Admin
const adminUpdateClassStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['active', 'cancelled', 'completed', 'scheduled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      validStatuses
    });
  }

  try {
    const updatedClass = await updateClassStatus(req.params.classId, status);
    if (!updatedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(updatedClass);
  } catch (err) {
    console.error('Update class status error:', err);
    res.status(500).json({ error: 'Failed to update class status' });
  }
};

// @desc    Get class waitlist
// @route   GET /api/admin/classes/:classId/waitlist
// @access  Admin
const adminGetClassWaitlist = async (req, res) => {
  try {
    const waitlist = await getClassWaitlist(req.params.classId);
    res.json(waitlist);
  } catch (err) {
    console.error('Get class waitlist error:', err);
    res.status(500).json({ error: 'Failed to fetch class waitlist' });
  }
};

// @desc    Update waitlist status
// @route   PUT /api/admin/classes/:classId/waitlist/:waitlistId
// @access  Admin
const adminUpdateWaitlistStatus = async (req, res) => {
  const { status } = req.body;
  const { classId, waitlistId } = req.params;

  const validStatuses = ['waiting', 'pending', 'approved', 'rejected', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      validStatuses
    });
  }

  try {
    const updatedWaitlist = await updateWaitlistStatus(waitlistId, status);
    if (!updatedWaitlist) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }
    res.json(updatedWaitlist);
  } catch (err) {
    console.error('Update waitlist status error:', err);
    res.status(500).json({ error: 'Failed to update waitlist status' });
  }
};

// @desc    Add user to class waitlist (admin)
// @route   POST /api/admin/classes/:classId/waitlist
// @access  Admin
const adminAddToWaitlist = async (req, res) => {
  const { classId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const waitlistEntry = await addToWaitlist(classId, userId);
    res.status(201).json(waitlistEntry);
  } catch (err) {
    console.error('Add to waitlist error:', err);
    res.status(500).json({ error: err.message || 'Failed to add user to waitlist' });
  }
};

// @desc    Get outstanding payments
// @route   GET /api/admin/financial/payments/outstanding
// @access  Admin
const adminGetOutstandingPayments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const outstandingPayments = await getOutstandingPayments({ startDate, endDate });
    res.json(outstandingPayments);
  } catch (err) {
    console.error('Get outstanding payments error:', err);
    res.status(500).json({ error: 'Failed to fetch outstanding payments' });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Admin
const getStats = async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// @desc    Get students in a class
// @route   GET /api/admin/classes/:classId/students
// @access  Admin
const adminGetClassStudents = async (req, res) => {
  try {
    const participants = await getClassParticipants(req.params.classId);
    console.log('Raw class participants:', JSON.stringify(participants, null, 2));

    if (!Array.isArray(participants)) {
      console.error('Invalid participants data:', participants);
      return res.status(500).json({ error: 'Invalid participants data received' });
    }

    // Filter for approved enrollments first
    const approvedParticipants = participants.filter(p => p.enrollment_status === 'approved');
    console.log('Approved participants:', JSON.stringify(approvedParticipants, null, 2));

    // Transform the data to only include necessary student information
    const students = approvedParticipants.map(p => ({
      id: p.user_id,
      first_name: p.name?.split(' ')[0] || '',
      last_name: p.name?.split(' ').slice(1).join(' ') || '',
      email: p.email,
      role: 'student',
      enrollment_status: p.enrollment_status
    }));

    console.log('Transformed students:', JSON.stringify(students, null, 2));
    res.json(students);
  } catch (err) {
    console.error('Get class students error:', err);
    res.status(500).json({ error: 'Failed to fetch class students' });
  }
};

// @desc    Get all enrollments (active and historical) for a class
// @route   GET /api/admin/classes/:classId/enrollments
// @access  Admin
const adminGetAllEnrollments = async (req, res) => {
  try {
    const enrollments = await getAllEnrollmentsForClass(req.params.classId);
    res.json(enrollments);
  } catch (err) {
    console.error('Get all enrollments error:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
};

// @desc    Get historical enrollments for a class
// @route   GET /api/admin/classes/:classId/enrollments/historical
// @access  Admin
const adminGetHistoricalEnrollments = async (req, res) => {
  try {
    const historicalEnrollments = await getHistoricalEnrollments(req.params.classId);
    res.json(historicalEnrollments);
  } catch (err) {
    console.error('Get historical enrollments error:', err);
    res.status(500).json({ error: 'Failed to fetch historical enrollments' });
  }
};

// @desc    Get all waitlist entries across all classes
// @route   GET /api/admin/waitlist
// @access  Admin
const adminGetAllWaitlistEntries = async (req, res) => {
  try {
    const waitlistEntries = await getAllWaitlistEntries();
    res.json(waitlistEntries);
  } catch (err) {
    console.error('Get all waitlist entries error:', err);
    res.status(500).json({ error: 'Failed to fetch waitlist entries' });
  }
};

module.exports = {
  adminGetUsers,
  adminDeleteUser,
  adminGetClasses,
  adminEditClass,
  adminDeleteClass,
  adminEnrollmentStats,
  adminRemoveUserFromClass,
  adminGetPendingEnrollments,
  adminGetEnrollmentDetails,
  adminApproveEnrollment,
  adminRejectEnrollment,
  adminGetFinancialSummary,
  adminGetRevenueByClass,
  adminGetAllPayments,
  adminGetPaymentDetails,
  adminProcessRefund,
  adminCreateClass,
  adminGetClassDetails,
  adminGetClassSessions,
  adminUpdateClassStatus,
  adminGetClassWaitlist,
  adminUpdateWaitlistStatus,
  adminAddToWaitlist,
  adminGetAllWaitlistEntries,
  adminGetOutstandingPayments,
  getStats,
  adminGetClassStudents,
  adminGetAllEnrollments,
  adminGetHistoricalEnrollments
};
