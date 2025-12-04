import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/layout/Footer';
import classService from '../services/classService';
import enrollmentService from '../services/enrollmentService';
import { useNotifications } from '../utils/notificationUtils';
import { format, parseISO, addDays, addWeeks, addMonths } from 'date-fns';
import EnrollmentFormModal from '../components/enrollment/EnrollmentFormModal';

// Helper function to format date
const formatDate = (date) => {
    if (!date) return '';
    return format(parseISO(date), 'MMMM d, yyyy');
};

// Helper function to format time to user-friendly format
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

// Helper function to get duration string based on class title
const getDurationString = (classItem) => {
    if (!classItem) return '';
    if (classItem.title === "Development and Operations") return "4 weeks";
    if (classItem.title === "Child Development Associate (CDA)") return "3 months";
    if (classItem.title === "CPR and First Aid Certification") return "1 day";
    // fallback if needed
    return "";
};

// Helper function to calculate end date from start date and duration string
const calculateEndDate = (startDateStr, durationStr) => {
    if (!startDateStr || !durationStr) return null;
    let startDate;
    try {
        startDate = parseISO(startDateStr);
    } catch {
        return null;
    }
    const [amountStr, unit] = durationStr.split(' ');
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) return null;
    let daysToAdd = 0;
    switch (unit.toLowerCase()) {
        case 'day':
        case 'days':
            daysToAdd = amount - 1;
            break;
        case 'week':
        case 'weeks':
            daysToAdd = (amount * 7) - 1;
            break;
        case 'month':
        case 'months':
            daysToAdd = (amount * 30) - 1;
            break;
        default:
            return null;
    }
    return addDays(startDate, daysToAdd);
};

function ClassDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading, initialized } = useAuth();
    const { showSuccess, showError } = useNotifications();
    const [classData, setClassData] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrollError, setEnrollError] = useState('');
    const [roleEnrollError, setRoleEnrollError] = useState('');
    const [enrollSuccess, setEnrollSuccess] = useState('');
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [selectedDateIndex, setSelectedDateIndex] = useState(null);
    const [waitlistStatus, setWaitlistStatus] = useState({});
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [userEnrollments, setUserEnrollments] = useState([]);
    const [userWaitlist, setUserWaitlist] = useState({});
    const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [enrollmentError, setEnrollmentError] = useState('');
    const [enrollmentSuccess, setEnrollmentSuccess] = useState('');
    const isAdminOrInstructor = user && (user.role === 'admin' || user.role === 'instructor');

    // Memoize the class data fetching effect
    useEffect(() => {
        const fetchClassDetails = async () => {
            if (!initialized) return;
            setLoading(true);
            setError(null);
            try {
                const data = await classService.getClassById(id);
                setClassData(data);
                // Fetch sessions for this class
                const sessionData = await classService.getClassSessions(id);
                setSessions(sessionData);

                // Only check enrollment and waitlist status if user is logged in
                if (user) {
                    try {
                        const enrollments = await enrollmentService.getUserEnrollments();
                        // Check if user has pending or approved enrollment in this class for a FUTURE session
                        // Only block if enrollment is active (future session), not historical (past)
                        // Convert both to strings for comparison to handle type mismatch
                        const activeEnrollment = enrollments.find(
                            enrollment => String(enrollment.class_id) === String(id) &&
                                (enrollment.enrollment_status === 'pending' || enrollment.enrollment_status === 'approved') &&
                                enrollment.enrollment_type === 'active' // Only block active (future) enrollments
                        );
                        const isUserEnrolled = !!activeEnrollment;
                        setIsEnrolled(isUserEnrolled);
                        setUserEnrollments(enrollments);

                        // Check waitlist status for each session
                        const sessionWaitlistStatus = {};
                        for (const session of sessionData) {
                            if (session.available_spots === 0) {
                                try {
                                    const waitlistData = await enrollmentService.getWaitlistStatus(id, session.id);
                                    sessionWaitlistStatus[session.id] = waitlistData;
                                } catch (err) {
                                    // Handle 404 'Not on waitlist' gracefully without logging
                                    if (err.message === 'Not on waitlist' ||
                                        (err.response?.status === 404 && err.message === 'Not on waitlist')) {
                                        // Not on waitlist for this session - this is expected
                                        sessionWaitlistStatus[session.id] = null;
                                    } else {
                                        console.error(`Error fetching waitlist status for session ${session.id}:`, err);
                                    }
                                }
                            }
                        }
                        setWaitlistStatus(sessionWaitlistStatus);
                        setUserWaitlist(sessionWaitlistStatus);
                    } catch (err) {
                        // Only log if not a waitlist-related error
                        if (err.message !== 'Not on waitlist' &&
                            !(err.response?.status === 404 && err.message === 'Not on waitlist')) {
                            console.error('Error fetching user enrollment data:', err);
                        }
                        // Don't set error state for enrollment data, as it's not critical
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load class details');
            } finally {
                setLoading(false);
            }
        };

        fetchClassDetails();
    }, [id, user, initialized]);

    const handleEnroll = (sessionId) => {
        if (!user) {
            navigate('/login', { state: { from: `/classes/${id}` } });
            return;
        }
        if (user.role === 'admin' || user.role === 'instructor') {
            setRoleEnrollError('Admins and Instructors cannot enroll in classes.');
            return;
        }
        // Open enrollment modal
        setSelectedSessionId(sessionId);
        setEnrollmentModalOpen(true);
    };

    const handleEnrollSubmit = async (sessionId, paymentMethod) => {
        setEnrollLoading(true);
        setEnrollmentError('');
        setEnrollmentSuccess('');
        try {
            await enrollmentService.enrollInClass(id, { sessionId, paymentMethod });
            setIsEnrolled(true);
            setEnrollmentSuccess('Successfully enrolled in class');
            // Close modal after a short delay to show success message
            setTimeout(() => {
                setEnrollmentModalOpen(false);
                setSelectedSessionId(null);
                setEnrollmentSuccess('');
            }, 2000);
        } catch (err) {
            setEnrollmentError(err.message || 'Enrollment operation failed');
            console.error('Enrollment error:', err);
        } finally {
            setEnrollLoading(false);
        }
    };

    const handleCloseEnrollmentModal = () => {
        setEnrollmentModalOpen(false);
        setSelectedSessionId(null);
        setEnrollmentError('');
        setEnrollmentSuccess('');
    };

    const handleWaitlistAction = async (sessionId) => {
        if (!user) {
            navigate('/login', { state: { from: `/classes/${id}` } });
            return;
        }

        setWaitlistLoading(true);
        try {
            if (waitlistStatus[sessionId]) {
                await enrollmentService.leaveWaitlist(id, sessionId);
                setWaitlistStatus({ ...waitlistStatus, [sessionId]: null });
                showSuccess('Removed from waitlist');
            } else {
                const result = await enrollmentService.joinWaitlist(id, sessionId);
                setWaitlistStatus({ ...waitlistStatus, [sessionId]: result });
                showSuccess('Added to waitlist');
            }
        } catch (err) {
            showError(err.message || 'Failed to update waitlist status');
        } finally {
            setWaitlistLoading(false);
        }
    };

    // Show loading state while auth is initializing or class data is loading
    if (authLoading || !initialized || loading) {
        return (
            <div className="min-h-screen bg-white font-montserrat">
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-xl text-gray-600">Loading class details...</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white font-montserrat">
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-xl text-red-600">{error}</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="min-h-screen bg-white font-montserrat">
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-xl text-gray-600">Class not found</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[400px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-6" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-4xl md:text-5xl font-normal mb-4">{classData.title}</h1>
                    <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">{classData.duration}</p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Class Details */}
            <section className="py-16 max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Left Column - Class Information */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-semibold mb-4 text-gray-900">About This Class</h2>
                            <p className="text-gray-700 leading-relaxed">{classData.description}</p>
                        </div>

                        {/* Location Information */}
                        <div>
                            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Location Information</h2>
                            <p className="text-gray-700">
                                <span className="font-medium">Default Location:</span> {classData.location_details || 'See individual sessions for specific locations'}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                                Each session may have a different location and type. Check the session details below for specific location information.
                            </p>
                        </div>

                        {/* Enrollment Card - Mobile Only */}
                        <div className="md:hidden">
                            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                                <div className="space-y-4">
                                    <div>
                                        <h2 className="text-xl font-semibold mb-2 text-gray-900">Enrollment</h2>
                                        <p className="text-2xl font-semibold text-blue-600">${classData.price}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Certificate of Completion</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Expert Instruction</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-sm text-gray-700">Hands-on Learning</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Show single Enroll button if user is not logged in */}
                        {!user && sessions.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">Ready to Enroll?</h2>
                                <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                                    <p className="text-gray-700 mb-4">
                                        Log in to view available sessions and enroll in this class.
                                    </p>
                                    <button
                                        className="px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                                        onClick={() => navigate('/login', { state: { from: `/classes/${id}` } })}
                                    >
                                        Enroll Now
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Show Available Sessions if user is logged in */}
                        {user && sessions.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900">Available Sessions</h2>
                                <div className="space-y-6">
                                    {sessions.map((session) => {
                                        // Calculate hours per day
                                        const [startHour, startMinute] = session.start_time.split(':').map(Number);
                                        const [endHour, endMinute] = session.end_time.split(':').map(Number);
                                        const hoursPerDay = Math.round((endHour + endMinute / 60) - (startHour + startMinute / 60));

                                        // Use explicit end_date from database
                                        const formattedStartDate = formatDate(session.start_date || session.session_date);
                                        const formattedEndDate = session.end_date ? formatDate(session.end_date) : null;
                                        const showEndDate = formattedEndDate && formattedEndDate !== formattedStartDate;

                                        // Button logic
                                        const notLoggedIn = !user;
                                        const isAdminOrInstructor = user && (user.role === 'admin' || user.role === 'instructor');
                                        // Check if user has pending or approved enrollment in this class for a FUTURE session
                                        // Only block if enrollment is active (future session), not historical (past)
                                        // Convert both to strings for comparison to handle type mismatch
                                        const hasActiveEnrollment = userEnrollments.some(
                                            enrollment => String(enrollment.class_id) === String(id) &&
                                                (enrollment.enrollment_status === 'pending' || enrollment.enrollment_status === 'approved') &&
                                                enrollment.enrollment_type === 'active' // Only block active (future) enrollments
                                        );
                                        const canEnroll = !notLoggedIn && !isAdminOrInstructor && !hasActiveEnrollment;

                                        return (
                                            <div key={session.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                                                <div className="space-y-3">
                                                    <div className="font-semibold text-lg text-gray-900">
                                                        {formattedStartDate}
                                                        {showEndDate ? ` - ${formattedEndDate}` : ''}
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="font-medium">Location:</span> {
                                                            session.location_type
                                                                ? `${session.location_type === 'zoom' ? 'Zoom (Online)' : 'In-Person'} - ${session.session_location || session.location_details || 'TBA'}`
                                                                : (session.session_location || session.location_details || 'TBA')
                                                        }
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="font-medium">Time:</span> {formatTime(session.start_time)} - {formatTime(session.end_time)} ({hoursPerDay} hours/day)
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="font-medium">Duration:</span> {session.duration || getDurationString(classData)}
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="font-medium">Instructor:</span> {session.instructor_name || 'TBA'}
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex justify-start">
                                                    <button
                                                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${canEnroll
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            }`}
                                                        disabled={!canEnroll}
                                                        onClick={() => canEnroll && handleEnroll(session.id)}
                                                    >
                                                        {enrollLoading ? 'Enrolling...' : 'Enroll Now'}
                                                    </button>
                                                </div>
                                                {notLoggedIn && <div className="text-sm text-red-500 mt-2">Please log in to enroll</div>}
                                                {isAdminOrInstructor && <div className="text-sm text-red-500 mt-2">Admins and instructors cannot enroll</div>}
                                                {hasActiveEnrollment && (
                                                    <div className="text-sm text-yellow-600 mt-2">
                                                        {userEnrollments.find(e => String(e.class_id) === String(id) && (e.enrollment_status === 'pending' || e.enrollment_status === 'approved') && e.enrollment_type === 'active')?.enrollment_status === 'pending'
                                                            ? 'You have a pending enrollment in this class. Please wait for approval.'
                                                            : 'You are already enrolled in this class. Only one enrollment per class is allowed.'}
                                                    </div>
                                                )}

                                                {/* Waitlist section */}
                                                {session.available_spots === 0 && canEnroll && (
                                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                                        <p className="text-sm text-yellow-800 mb-2">This session is full</p>
                                                        {waitlistStatus[session.id] ? (
                                                            <div className="space-y-2">
                                                                <p className="text-xs text-yellow-700">You are on the waitlist</p>
                                                                <button
                                                                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                                    onClick={() => handleWaitlistAction(session.id)}
                                                                    disabled={waitlistLoading}
                                                                >
                                                                    {waitlistLoading ? 'Removing...' : 'Leave Waitlist'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                                                onClick={() => handleWaitlistAction(session.id)}
                                                                disabled={waitlistLoading}
                                                            >
                                                                {waitlistLoading ? 'Adding...' : 'Join Waitlist'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Session-specific messages are now displayed inline with each session */}

                    {/* Right Column - Enrollment Card - Desktop Only */}
                    <div className="hidden md:block bg-gray-50 p-8 rounded-lg shadow-sm">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-semibold mb-2 text-gray-900">Enrollment</h2>
                                <p className="text-3xl font-semibold text-blue-600">${classData.price}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700">Certificate of Completion</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700">Expert Instruction</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-700">Hands-on Learning</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="bg-gray-100 py-16 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-semibold mb-4 text-gray-900">Ready to Learn?</h2>
                    <p className="mb-8 text-gray-700">Join us for this exciting class and take the next step in your professional development.</p>
                </div>
            </section>

            {/* Show error if admin/instructor tries to enroll */}
            {roleEnrollError && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-700 rounded flex items-center justify-between">
                    <span>{roleEnrollError}</span>
                    <button
                        onClick={() => setRoleEnrollError('')}
                        className="ml-4 text-red-700 hover:text-red-900 font-bold text-lg focus:outline-none"
                        aria-label="Close error message"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Enrollment Form Modal */}
            <EnrollmentFormModal
                open={enrollmentModalOpen}
                onClose={handleCloseEnrollmentModal}
                onEnroll={handleEnrollSubmit}
                sessionId={selectedSessionId}
                loading={enrollLoading}
                enrollmentError={enrollmentError}
                enrollmentSuccess={enrollmentSuccess}
            />

            <Footer />
        </div>
    );
}

const MemoizedClassDetails = React.memo(ClassDetails);
export default MemoizedClassDetails; 