import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Tooltip,
    Menu,
    ListItemIcon,
    ListItemText,
    Alert,
    Snackbar,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    Tabs,
    Tab,
} from "@mui/material";
import {
    Search as SearchIcon,
    MoreVert as MoreIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
    School as InstructorIcon,
    Person as UserIcon,
    Block as BlockIcon,
    CheckCircle as ActiveIcon,
    Warning as WarningIcon,
    Send as SendIcon,
    Visibility as ViewIcon,
    VisibilityOff as ViewOffIcon,
    Lock as LockIcon,
    History as HistoryIcon,
    Close as CloseIcon,
    Email as EmailIcon,
    Add as AddIcon,
    AttachFile as AttachFileIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
} from "@mui/icons-material";
import adminService from "../../services/adminService";
import { useNotifications } from '../../utils/notificationUtils';
import { useAuth } from '../../contexts/AuthContext';
import supabaseStorageService from '../../services/supabaseStorageService';

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const UserManagement = () => {
    const { showSuccess, showError } = useNotifications();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
    const [userEnrollments, setUserEnrollments] = useState({ active: [], historical: [] });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState("");
    const [notificationMessage, setNotificationMessage] = useState("");
    const [notificationLinks, setNotificationLinks] = useState([{ label: '', url: '' }]);
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const notificationFileInputRef = useRef(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [userActivity, setUserActivity] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotal, setActivityTotal] = useState(0);
    const [userProfile, setUserProfile] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [updatingRole, setUpdatingRole] = useState(false);
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.limit, searchTerm, selectedRole]);

    // Debug pagination changes
    useEffect(() => {
        console.log('Pagination state changed:', pagination);
    }, [pagination]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAllUsers({
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm,
                role: selectedRole !== 'all' ? selectedRole : undefined
            });

            // Handle paginated response from search endpoint
            if (response && response.users && response.pagination) {
                console.log('Received paginated response:', response);
                setUsers(response.users);
                setPagination(prev => {
                    const same =
                        prev.page === response.pagination.page &&
                        prev.limit === response.pagination.limit &&
                        prev.total === response.pagination.total;
                    const newPagination = same ? prev : { ...prev, ...response.pagination };
                    console.log('Updated pagination:', newPagination);
                    return newPagination;
                });
            } else {
                console.log('Invalid response format:', response);
                setUsers([]);
            }
        } catch (error) {
            handleError(error, "Failed to fetch users");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        try {
            setLoading(true);
            await adminService.deleteUser(userId);
            await fetchUsers();
            showSuccess('User deleted successfully');
        } catch (error) {
            handleError(error, 'Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    const handleMenuOpen = (event, user) => {
        setMenuAnchor(event.currentTarget);
        setSelectedUser(user);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleNotificationDialogOpen = (user) => {
        if (!user?.id) {
            showError('Invalid user selected');
            return;
        }
        setSelectedUser(user);
        setNotificationTitle("");
        setNotificationMessage("");
        setNotificationLinks([{ label: '', url: '' }]);
        setAttachedFiles([]);
        if (notificationFileInputRef.current) {
            notificationFileInputRef.current.value = '';
        }
        setNotificationDialogOpen(true);
        handleMenuClose();
    };

    // File upload handlers
    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const validFiles = [];
        const errors = [];

        files.forEach(file => {
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                errors.push(`${file.name}: Invalid file type. Only PDF and images (JPEG, PNG) are allowed.`);
                return;
            }

            // Validate file size (5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                errors.push(`${file.name}: File size too large. Maximum size is 5MB.`);
                return;
            }

            validFiles.push({ file, fileName: file.name, fileSize: file.size, fileType: file.type });
        });

        if (errors.length > 0) {
            errors.forEach(error => {
                showError(error);
            });
        }

        if (validFiles.length > 0) {
            setAttachedFiles(prev => [...prev, ...validFiles]);
        }

        // Reset input
        if (notificationFileInputRef.current) {
            notificationFileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const fetchUserActivity = async (userId, page = 1) => {
        try {
            setActivityLoading(true);
            const data = await adminService.getUserActivity(userId, page);
            setUserActivity(data.activities || []);
            setActivityTotal(data.total || 0);
        } catch (error) {
            handleError(error, "Failed to fetch user activity");
            setUserActivity([]);
            setActivityTotal(0);
        } finally {
            setActivityLoading(false);
        }
    };

    const fetchUserProfile = async (userId) => {
        try {
            setActivityLoading(true);
            const profile = await adminService.getUserProfile(userId);
            setUserProfile(profile);
        } catch (error) {
            handleError(error, "Failed to fetch user profile");
            setUserProfile(null);
        } finally {
            setActivityLoading(false);
        }
    };

    const handleViewEnrollments = async (user) => {
        try {
            setLoading(true);
            const response = await adminService.getUserEnrollments(user.id);
            // Handle both array and object responses
            const enrollments = Array.isArray(response) ? response : (response.data || response.enrollments || []);
            const categorized = categorizeEnrollments(enrollments);
            setUserEnrollments(categorized);
            setSelectedUser(user);
            setEnrollmentDialogOpen(true);
        } catch (error) {
            handleError(error, "Failed to fetch user enrollments");
            setUserEnrollments({ active: [], historical: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseEnrollmentDialog = () => {
        setEnrollmentDialogOpen(false);
        setTimeout(() => {
            setSelectedUser(null);
            setUserEnrollments({ active: [], historical: [] });
        }, 150);
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case "admin":
                return <AdminIcon color="error" />;
            case "instructor":
                return <InstructorIcon color="primary" />;
            default:
                return <UserIcon color="action" />;
        }
    };

    const getStatusChip = (status) => {
        switch (status) {
            case "active":
                return (
                    <Chip
                        icon={<ActiveIcon />}
                        label="Active"
                        color="success"
                        size="small"
                    />
                );
            case "inactive":
                return (
                    <Chip
                        icon={<BlockIcon />}
                        label="Inactive"
                        color="error"
                        size="small"
                    />
                );
            case "suspended":
                return (
                    <Chip
                        icon={<WarningIcon />}
                        label="Suspended"
                        color="warning"
                        size="small"
                    />
                );
            default:
                return null;
        }
    };

    const handleProfileDialogOpen = async (user) => {
        setSelectedUser(user);
        setProfileDialogOpen(true);
        await fetchUserProfile(user.id);
        await fetchUserActivity(user.id);
        await fetchUserEnrollments(user.id);
    };

    const handleActivityPageChange = async (_, newPage) => {
        setActivityPage(newPage + 1);
        if (selectedUser) {
            await fetchUserActivity(selectedUser.id, newPage + 1);
        }
    };

    const handleError = (error, customMessage = "An error occurred") => {
        console.error(error);
        setError(error.message || customMessage);
        showError(error.message || customMessage);
    };

    const handleSendNotification = async () => {
        try {
            if (!selectedUser?.id) {
                showError('Invalid user selected');
                return;
            }

            if (!notificationTitle.trim() || !notificationMessage.trim()) {
                showError('Please provide both a title and message');
                return;
            }

            setUploadingFiles(true);

            // Upload files if any
            let uploadedFiles = [];
            if (attachedFiles.length > 0 && currentUser?.id) {
                try {
                    const uploadPromises = attachedFiles.map(file =>
                        supabaseStorageService.uploadNotificationAttachment(file.file, currentUser.id)
                    );
                    uploadedFiles = await Promise.all(uploadPromises);
                } catch (uploadError) {
                    console.error('Error uploading files:', uploadError);
                    showError('Failed to upload files. Please try again.');
                    setUploadingFiles(false);
                    return;
                }
            }

            // Validate and filter links
            const validLinks = notificationLinks
                .filter(link => link.label.trim() && link.url.trim())
                .map(link => ({
                    label: link.label.trim(),
                    url: link.url.trim()
                }));

            // Create notification data
            const notificationData = {
                title: notificationTitle.trim(),
                message: notificationMessage.trim(),
                recipient: selectedUser.id,
                recipientType: "user",
                metadata: {
                    ...(validLinks.length > 0 && { links: validLinks }),
                    ...(uploadedFiles.length > 0 && {
                        attachments: uploadedFiles.map(f => ({
                            fileName: f.fileName,
                            fileUrl: f.publicUrl,
                            fileSize: f.fileSize,
                            fileType: f.fileType
                        }))
                    })
                }
            };

            // Send notification using the notification service
            await adminService.sendNotification(notificationData);

            showSuccess('Notification sent successfully');
            setNotificationDialogOpen(false);
            // Reset form
            setNotificationTitle("");
            setNotificationMessage("");
            setNotificationLinks([{ label: '', url: '' }]);
            setAttachedFiles([]);
            if (notificationFileInputRef.current) {
                notificationFileInputRef.current.value = '';
            }
        } catch (error) {
            handleError(error, 'Failed to send notification');
        } finally {
            setUploadingFiles(false);
        }
    };

    const handlePasswordReset = async () => {
        try {
            setPasswordError('');

            // Validate passwords
            if (!newPassword || !confirmPassword) {
                setPasswordError('Both password fields are required');
                return;
            }
            if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match');
                return;
            }
            if (newPassword.length < 8) {
                setPasswordError('Password must be at least 8 characters long');
                return;
            }

            setLoading(true);
            await adminService.resetUserPassword(selectedUser.id, newPassword);
            showSuccess('Password reset successfully');
            setPasswordDialogOpen(false);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
        } catch (error) {
            handleError(error, 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async () => {
        try {
            setUpdatingRole(true);
            await adminService.updateUserRole(selectedUser.id, selectedUser.role);
            await fetchUsers(); // Refresh the user list
            showSuccess('User role updated successfully');
            setRoleDialogOpen(false);
        } catch (error) {
            handleError(error, 'Failed to update user role');
        } finally {
            setUpdatingRole(false);
        }
    };

    const handlePageChange = (_, newPage) => {
        console.log('Page change requested:', { currentPage: pagination.page, newPage: newPage + 1 });
        setPagination(prev => ({ ...prev, page: newPage + 1 }));
    };

    const handleRowsPerPageChange = (event) => {
        setPagination(prev => ({
            ...prev,
            page: 1, // Reset to first page when changing rows per page
            limit: parseInt(event.target.value, 10)
        }));
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        try {
            // Handle different date formats
            let date;
            if (typeof dateValue === 'string') {
                // Try parsing as-is first
                date = new Date(dateValue);
                // If that fails, try parsing common formats
                if (isNaN(date.getTime())) {
                    // Try MM/DD/YY format
                    const parts = dateValue.split('/');
                    if (parts.length === 3) {
                        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                        date = new Date(`${parts[0]}/${parts[1]}/${year}`);
                    }
                }
            } else {
                date = new Date(dateValue);
            }

            if (isNaN(date.getTime())) {
                return 'N/A';
            }
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            console.warn('Date formatting error:', e, 'for value:', dateValue);
            return 'N/A';
        }
    };

    const formatEnrollmentSessionDate = (enrollment) => {
        // Try multiple date fields from backend
        const dateValue = enrollment.session_date ||
            enrollment.display_date ||
            enrollment.formatted_date ||
            enrollment.end_date;

        if (!dateValue) {
            return 'N/A';
        }

        return formatDate(dateValue);
    };

    const categorizeEnrollments = (enrollments) => {
        const active = [];
        const historical = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of day for comparison

        enrollments.forEach(enrollment => {
            // Check if enrollment is completed
            const isCompleted = enrollment.completed_at ||
                enrollment.enrollment_status === 'completed' ||
                enrollment.enrollment_status === 'finished' ||
                enrollment.archived_at;

            // Check if session date or end date is in the past
            let sessionDate = null;
            let endDate = null;

            if (enrollment.session_date) {
                try {
                    sessionDate = new Date(enrollment.session_date);
                    sessionDate.setHours(0, 0, 0, 0);
                    if (isNaN(sessionDate.getTime())) {
                        sessionDate = null;
                    }
                } catch (e) {
                    sessionDate = null;
                }
            }

            if (enrollment.end_date) {
                try {
                    endDate = new Date(enrollment.end_date);
                    endDate.setHours(0, 0, 0, 0);
                    if (isNaN(endDate.getTime())) {
                        endDate = null;
                    }
                } catch (e) {
                    endDate = null;
                }
            }

            // Session is past if session_date is past, or if end_date exists and is past
            const isSessionPast = (sessionDate && sessionDate < now) ||
                (endDate && endDate < now) ||
                (!sessionDate && !endDate && enrollment.enrollment_type === 'historical');

            // Use backend's enrollment_type as primary, but also check our logic
            // If backend says historical OR our checks say it's past/completed, it's historical
            if (enrollment.enrollment_type === 'historical' || isCompleted || isSessionPast) {
                historical.push(enrollment);
            } else {
                active.push(enrollment);
            }
        });

        return { active, historical };
    };

    const fetchUserEnrollments = async (userId) => {
        try {
            setEnrollmentsLoading(true);
            const response = await adminService.getUserEnrollments(userId);
            // Handle both array and object responses
            const enrollments = Array.isArray(response) ? response : (response.data || response.enrollments || []);

            console.log('Fetched enrollments:', enrollments);
            console.log('Sample enrollment:', enrollments[0]);

            const categorized = categorizeEnrollments(enrollments);
            console.log('Categorized enrollments:', categorized);

            setUserEnrollments(categorized);
        } catch (error) {
            handleError(error, "Failed to fetch user enrollments");
            setUserEnrollments({ active: [], historical: [] });
        } finally {
            setEnrollmentsLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        try {
            setUpdatingStatus(true);
            await adminService.updateUserStatus(selectedUser.id, selectedUser.status);
            await fetchUsers(); // Refresh the user list
            showSuccess('User status updated successfully');
            setStatusDialogOpen(false);
        } catch (error) {
            handleError(error, 'Failed to update user status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const renderActivityValue = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return value.length > 0 ? value.join(', ') : 'None';
            }
            // Handle objects - format as key-value pairs
            return Object.entries(value)
                .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v === true ? 'Yes' : v === false ? 'No' : v}`)
                .join(', ');
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        return String(value);
    };

    const formatActivityAction = (action, details = null) => {
        // Handle enrollment actions with more context
        if (action === 'enrollment' || action?.includes('enrollment')) {
            if (details) {
                const status = details.enrollment_status || details.status;
                if (status === 'cancelled' || status === 'withdrawn') {
                    return 'Enrollment Cancelled';
                }
                if (status === 'completed' || status === 'finished') {
                    return 'Enrollment Completed';
                }
                if (status === 'approved') {
                    return 'Enrollment Approved';
                }
                if (status === 'pending' || status === 'waiting') {
                    return 'Enrollment Pending';
                }
            }
            return 'Enrolled';
        }

        const actionMap = {
            'role_update': 'Role Changed',
            'status_update': 'Status Changed',
            'profile_update': 'Profile Updated',
            'email_preferences_update': 'Email Preferences Updated',
            'password_reset': 'Password Reset',
            'login': 'User Login',
            'payment': 'Payment'
        };
        return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getEnrollmentInfo = (activity) => {
        // Check if this is an enrollment-related activity
        const isEnrollment = activity.action === 'enrollment' ||
            activity.action?.includes('enrollment') ||
            activity.action === 'enrolled' ||
            activity.action === 'unenrolled';

        if (!activity.details || !isEnrollment) {
            return null;
        }

        const details = activity.details;
        const classTitle = details.class_title ||
            details.class_name ||
            details.class || null;
        const enrollmentStatus = details.enrollment_status || details.status || null;
        const sessionDate = details.session_date || details.date || null;

        if (!classTitle) {
            return null;
        }

        // Format class title nicely
        let info = classTitle;

        // Add session date if available (more important than status)
        if (sessionDate) {
            try {
                const date = new Date(sessionDate);
                const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                info = `${classTitle} - ${formattedDate}`;
            } catch (e) {
                // If date parsing fails, just use class title
            }
        }

        return info;
    };

    const isFieldList = (value) => {
        if (typeof value !== 'string') return false;
        // Check if it looks like a list of database fields
        const fieldListIndicators = [
            'id,', 'name,', 'email,', 'password,', 'role,', 'status,',
            'first_name,', 'last_name,', 'created_at,', 'updated_at,',
            'reset_token', 'total_enrollments', 'active_enrollments'
        ];
        // If string contains multiple field indicators and is long, it's likely a field list
        const matches = fieldListIndicators.filter(indicator => value.includes(indicator)).length;
        return (value.includes(',') && value.length > 50 && matches >= 3) || value.length > 200;
    };

    const formatActivityDetails = (activity) => {
        if (!activity.details) return null;

        const details = activity.details;

        // Fields to exclude (technical/internal data)
        const excludeFields = [
            'id', 'password', 'reset_token', 'reset_token_expires',
            'created_at', 'updated_at', 'updated', 'fields',
            'total_enrollments', 'active_enrollments', 'total_payments',
            'pending_payments', 'certificates', 'payment_methods',
            'recent_activity', 'notifications', 'enrollments', 'waitlist_entries',
            'updated_fields', 'changed_fields', 'modified_fields'
        ];

        // Handle email preferences update
        if (activity.action === 'email_preferences_update' && details.preferences && typeof details.preferences === 'object') {
            const prefs = details.preferences;
            const preferenceLabels = {
                'class_reminders': 'Class Reminders',
                'general_updates': 'General Updates',
                'payment_reminders': 'Payment Reminders',
                'email_notifications': 'Email Notifications',
                'certificate_notifications': 'Certificate Notifications'
            };

            const activePrefs = Object.entries(prefs)
                .filter(([_, value]) => value === true)
                .map(([key, _]) => preferenceLabels[key] || key.replace(/_/g, ' '))
                .join(', ');

            if (activePrefs) {
                return `Enabled: ${activePrefs}`;
            }
            return 'No preferences enabled';
        }

        // Handle role update
        if (activity.action === 'role_update') {
            if (details.old_role && details.new_role) {
                return `Changed from ${details.old_role} to ${details.new_role}`;
            }
            if (details.role) {
                return `Role set to ${details.role}`;
            }
        }

        // Handle status update
        if (activity.action === 'status_update') {
            if (details.old_status && details.new_status) {
                return `Changed from ${details.old_status} to ${details.new_status}`;
            }
            if (details.status) {
                return `Status set to ${details.status}`;
            }
        }

        // For profile updates, show only meaningful changes
        if (activity.action === 'profile_update') {
            const meaningfulFields = ['first_name', 'last_name', 'email', 'phone_number', 'address', 'emergency_contact'];
            const filteredDetails = {};

            Object.entries(details).forEach(([key, value]) => {
                const lowerKey = key.toLowerCase();

                // Skip excluded fields
                if (excludeFields.includes(lowerKey)) {
                    return;
                }

                // Skip field lists
                if (isFieldList(value)) {
                    return;
                }

                // Only include meaningful fields with actual values
                if (meaningfulFields.includes(lowerKey)) {
                    if (value && value !== 'null' && value !== 'undefined' && typeof value !== 'object') {
                        filteredDetails[key] = value;
                    }
                }
            });

            // If we only have technical data, show a simple message
            if (Object.keys(filteredDetails).length === 0) {
                // Check if there are any non-excluded, non-field-list values
                const hasAnyValidData = Object.entries(details).some(([key, value]) => {
                    const lowerKey = key.toLowerCase();
                    return !excludeFields.includes(lowerKey) && !isFieldList(value) &&
                        value && value !== 'null' && value !== 'undefined';
                });

                if (!hasAnyValidData) {
                    return 'Profile information updated';
                }
                return null;
            }
            return filteredDetails;
        }

        // For other activities, filter and format details
        const filteredDetails = {};
        Object.entries(details).forEach(([key, value]) => {
            const lowerKey = key.toLowerCase();

            // Skip excluded fields
            if (excludeFields.includes(lowerKey)) {
                return;
            }

            // Skip field lists
            if (isFieldList(value)) {
                return;
            }

            // Skip empty or invalid values
            if (value && value !== 'null' && value !== 'undefined') {
                filteredDetails[key] = value;
            }
        });

        // If no meaningful details after filtering, return null
        if (Object.keys(filteredDetails).length === 0) {
            return null;
        }

        return filteredDetails;
    };

    return (
        <Box>
            {/* Modern Header */}
            <Box sx={{
                mb: 4,
                px: { xs: 2, sm: 3 }
            }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        fontWeight: 700,
                        color: '#111827',
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        mb: 1
                    }}
                >
                    User Management
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: '#6b7280',
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                >
                    Manage user accounts, roles, and permissions
                </Typography>
            </Box>

            {/* Modern Filters */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                px: { xs: 2, sm: 0 }
            }}>
                <Paper sx={{
                    p: { xs: 3, sm: 4 },
                    mb: 4,
                    borderRadius: '16px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e5e7eb'
                }}>
                    <Typography
                        variant="h6"
                        sx={{
                            mb: 3,
                            fontWeight: 600,
                            color: '#111827',
                            fontSize: { xs: '1rem', sm: '1.125rem' }
                        }}
                    >
                        Filters
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#6b7280' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    height: { xs: '48px', sm: '44px' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#3b82f6'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#3b82f6',
                                        borderWidth: '2px'
                                    }
                                }
                            }}
                        />
                        <FormControl fullWidth>
                            <InputLabel sx={{
                                '&.Mui-focused': { color: '#3b82f6' }
                            }}>Role</InputLabel>
                            <Select
                                value={selectedRole}
                                label="Role"
                                onChange={(e) => setSelectedRole(e.target.value)}
                                MenuProps={{
                                    sx: { zIndex: 1500 }
                                }}
                                sx={{
                                    borderRadius: '12px',
                                    height: { xs: '48px', sm: '44px' },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#d1d5db'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#3b82f6'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#3b82f6',
                                        borderWidth: '2px'
                                    }
                                }}
                            >
                                <MenuItem value="all">All Roles</MenuItem>
                                <MenuItem value="user">Users</MenuItem>
                                <MenuItem value="student">Students</MenuItem>
                                <MenuItem value="instructor">Instructors</MenuItem>
                                <MenuItem value="admin">Admins</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Paper>
            </Box>

            {/* Modern User Cards */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                mb: 4,
                px: { xs: 2, sm: 0 }
            }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={40} />
                    </Box>
                ) : error ? (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
                        <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
                    </Paper>
                ) : users.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
                        <PersonIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            No users found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Try adjusting your search criteria or filters
                        </Typography>
                    </Paper>
                ) : (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: { xs: 2, sm: 3 },
                        width: '100%'
                    }}>
                        {users.map((user) => (
                            <Box key={user.id} sx={{ width: '100%', minWidth: 0 }}>
                                <Paper sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                                    border: '1px solid #e5e7eb',
                                    transition: 'all 0.2s ease-in-out',
                                    width: '100%',
                                    minWidth: 0,
                                    '&:hover': {
                                        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                        transform: 'translateY(-1px)',
                                        borderColor: '#3b82f6'
                                    }
                                }}>
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        alignItems: { xs: 'flex-start', sm: 'center' },
                                        gap: { xs: 1.5, sm: 2 },
                                        width: '100%'
                                    }}>
                                        {/* Top Row: Name/Email */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: { xs: 1.5, sm: 2 },
                                            width: { xs: '100%', sm: 'auto' },
                                            flex: { xs: '1 1 auto', sm: '0 1 auto' },
                                            minWidth: 0
                                        }}>
                                            <Box sx={{ minWidth: 0, flex: '1 1 auto', maxWidth: { xs: 'none', sm: '200px' } }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {user.first_name} {user.last_name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'block'
                                                    }}
                                                >
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Bottom Row (Mobile) / Inline (Desktop): Details */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: { xs: 1, sm: 2 },
                                            width: { xs: '100%', sm: 'auto' },
                                            flexWrap: 'wrap',
                                            flex: { xs: '0 0 auto', sm: '1 1 auto' },
                                            justifyContent: { xs: 'flex-start', sm: 'flex-end' }
                                        }}>
                                            {/* Role */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                {getRoleIcon(user.role)}
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        textTransform: "capitalize",
                                                        fontWeight: 500,
                                                        color: '#374151',
                                                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {user.role}
                                                </Typography>
                                            </Box>

                                            {/* Status */}
                                            <Box sx={{ flexShrink: 0 }}>
                                                {getStatusChip(user.status)}
                                            </Box>

                                            {/* Created Date */}
                                            <Box sx={{ flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                    Created
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </Typography>
                                            </Box>

                                            {/* Updated Date */}
                                            <Box sx={{ flexShrink: 0, display: { xs: 'none', lg: 'block' } }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                                    Updated
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                                    {new Date(user.updated_at).toLocaleDateString()}
                                                </Typography>
                                            </Box>

                                            {/* Action Button */}
                                            <Tooltip title="More Actions">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleMenuOpen(e, user)}
                                                    sx={{
                                                        color: '#6b7280',
                                                        flexShrink: 0,
                                                        ml: { xs: 'auto', sm: 0 },
                                                        '&:hover': { color: '#3b82f6' }
                                                    }}
                                                >
                                                    <MoreIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Modern Pagination */}
            {users.length > 0 && (
                <Box sx={{
                    maxWidth: { xs: '100%', sm: '1200px' },
                    mx: 'auto',
                    px: { xs: 2, sm: 0 }
                }}>
                    <Paper sx={{
                        p: 2,
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb'
                    }}>
                        <TablePagination
                            component="div"
                            count={pagination.total}
                            page={pagination.page - 1}
                            onPageChange={handlePageChange}
                            rowsPerPage={pagination.limit}
                            rowsPerPageOptions={[10, 25, 50]}
                            onRowsPerPageChange={handleRowsPerPageChange}
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
                            }
                            sx={{
                                '& .MuiTablePagination-toolbar': {
                                    flexWrap: 'wrap',
                                    gap: 1
                                },
                                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                }
                            }}
                        />
                    </Paper>
                </Box>
            )}

            {/* User Actions Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() => {
                        handleProfileDialogOpen(selectedUser);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <ViewIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>View Profile</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => handleNotificationDialogOpen(selectedUser)}
                >
                    <ListItemIcon>
                        <SendIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Send Notification</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        handleViewEnrollments(selectedUser);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <HistoryIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>View Enrollments</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setRoleDialogOpen(true);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Change Role</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setStatusDialogOpen(true);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <BlockIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Change Status</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setPasswordDialogOpen(true);
                        handleMenuClose();
                    }}
                >
                    <ListItemIcon>
                        <LockIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Reset Password</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setDeleteDialogOpen(true);
                        handleMenuClose();
                    }}
                    sx={{ color: "error.main" }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete User</ListItemText>
                </MenuItem>
            </Menu>

            {/* Modern Role Update Dialog */}
            <Dialog
                open={roleDialogOpen}
                onClose={() => setRoleDialogOpen(false)}
                disableEnforceFocus
                keepMounted={false}
                maxWidth="sm"
                fullWidth
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 600
                }}>
                    Change User Role
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel sx={{
                            '&.Mui-focused': { color: '#3b82f6' }
                        }}>New Role</InputLabel>
                        <Select
                            value={selectedUser?.role}
                            label="New Role"
                            onChange={(e) => {
                                setSelectedUser((prev) => ({ ...prev, role: e.target.value }));
                            }}
                            MenuProps={{
                                sx: { zIndex: 1500 }
                            }}
                            sx={{
                                borderRadius: '12px',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#d1d5db'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#3b82f6'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#3b82f6',
                                    borderWidth: '2px'
                                }
                            }}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="student">Student</MenuItem>
                            <MenuItem value="instructor">Instructor</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setRoleDialogOpen(false)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRoleUpdate}
                        disabled={updatingRole}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3
                        }}
                    >
                        {updatingRole ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modern Status Update Dialog */}
            <Dialog
                open={statusDialogOpen}
                onClose={() => setStatusDialogOpen(false)}
                disableEnforceFocus
                keepMounted={false}
                maxWidth="sm"
                fullWidth
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 600
                }}>
                    Change User Status
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel sx={{
                            '&.Mui-focused': { color: '#3b82f6' }
                        }}>New Status</InputLabel>
                        <Select
                            value={selectedUser?.status}
                            label="New Status"
                            onChange={(e) => {
                                setSelectedUser((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                }));
                            }}
                            MenuProps={{
                                sx: { zIndex: 1500 }
                            }}
                            sx={{
                                borderRadius: '12px',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#d1d5db'
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#3b82f6'
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: '#3b82f6',
                                    borderWidth: '2px'
                                }
                            }}
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="suspended">Suspended</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setStatusDialogOpen(false)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleStatusUpdate}
                        disabled={updatingStatus}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3
                        }}
                    >
                        {updatingStatus ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modern Password Reset Dialog */}
            <Dialog
                open={passwordDialogOpen}
                onClose={() => {
                    setPasswordDialogOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                }}
                disableEnforceFocus
                keepMounted={false}
                maxWidth="sm"
                fullWidth
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 600
                }}>
                    Reset User Password
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {passwordError && (
                        <Alert severity="error" sx={{ mt: 2, mb: 2, borderRadius: '12px' }}>
                            {passwordError}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        type={showNewPassword ? "text" : "password"}
                        label="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showNewPassword ? <ViewOffIcon /> : <ViewIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px'
                            }
                        }}
                        error={!!passwordError}
                    />
                    <TextField
                        fullWidth
                        type={showConfirmPassword ? "text" : "password"}
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px'
                            }
                        }}
                        error={!!passwordError}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => {
                            setPasswordDialogOpen(false);
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordError('');
                            setShowNewPassword(false);
                            setShowConfirmPassword(false);
                        }}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handlePasswordReset}
                        disabled={loading}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3
                        }}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modern Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                disableEnforceFocus
                keepMounted={false}
                maxWidth="sm"
                fullWidth
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle sx={{
                    pb: 2,
                    fontSize: { xs: '1.125rem', sm: '1.25rem' },
                    fontWeight: 600,
                    color: '#ef4444'
                }}>
                    Delete User
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: '#fef2f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <DeleteIcon sx={{ color: '#ef4444', fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {selectedUser?.first_name} {selectedUser?.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {selectedUser?.email}
                            </Typography>
                        </Box>
                    </Box>
                    <Alert severity="warning" sx={{ borderRadius: '12px' }}>
                        <Typography variant="body2">
                            Are you sure you want to delete this user? This action cannot be undone and will permanently remove all user data.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            handleDeleteUser(selectedUser.id);
                            setDeleteDialogOpen(false);
                        }}
                        color="error"
                        variant="contained"
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500,
                            px: 3
                        }}
                    >
                        Delete User
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modern Profile Dialog */}
            <Dialog
                open={profileDialogOpen}
                onClose={() => setProfileDialogOpen(false)}
                maxWidth="md"
                fullWidth
                disableEnforceFocus
                keepMounted={false}
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PersonIcon />
                        <Typography variant="h6">
                            {userProfile?.first_name} {userProfile?.last_name}'s Profile
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {activityLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : userProfile ? (
                        <Box sx={{ mt: 2 }}>
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
                            >
                                <Tab label="Profile" />
                                <Tab label="Activity" />
                                <Tab label="Enrollments" />
                            </Tabs>

                            {activeTab === 0 && (
                                <>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Personal Information
                                            </Typography>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Email
                                                </Typography>
                                                <Typography variant="body1">
                                                    {userProfile.email}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Phone
                                                </Typography>
                                                <Typography variant="body1">
                                                    {userProfile.phone_number || "Not provided"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Address
                                                </Typography>
                                                <Typography variant="body1">
                                                    {userProfile.address || "Not provided"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Emergency Contact
                                                </Typography>
                                                <Typography variant="body1">
                                                    {userProfile.emergency_contact || "Not provided"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Role
                                                </Typography>
                                                <Box
                                                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                                                >
                                                    {getRoleIcon(userProfile.role)}
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ textTransform: "capitalize" }}
                                                    >
                                                        {userProfile.role}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Status
                                                </Typography>
                                                {getStatusChip(userProfile.status)}
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Account Information
                                            </Typography>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Member Since
                                                </Typography>
                                                <Typography variant="body1">
                                                    {new Date(
                                                        userProfile.created_at
                                                    ).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Last Updated
                                                </Typography>
                                                <Typography variant="body1">
                                                    {new Date(
                                                        userProfile.updated_at
                                                    ).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Email Notifications
                                                </Typography>
                                                <Typography variant="body1">
                                                    {userProfile.email_notifications
                                                        ? "Enabled"
                                                        : "Disabled"}
                                                </Typography>
                                            </Box>

                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Last Login
                                                </Typography>
                                                <Typography variant="body1">
                                                    {userProfile.last_login
                                                        ? new Date(userProfile.last_login).toLocaleString()
                                                        : "Never"}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                    <Divider sx={{ my: 3 }} />
                                </>
                            )}

                            {activeTab === 1 && (
                                <>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Recent Activity
                                    </Typography>
                                    <List>
                                        {userActivity.map((activity, index) => (
                                            <ListItem
                                                key={activity.id || `activity-${index}`}
                                                alignItems="flex-start"
                                                sx={{
                                                    borderLeft: "4px solid",
                                                    borderColor:
                                                        activity.action === "role_update"
                                                            ? "primary.main"
                                                            : activity.action === "status_update"
                                                                ? "warning.main"
                                                                : activity.action === "email_preferences_update"
                                                                    ? "info.main"
                                                                    : activity.action === "profile_update"
                                                                        ? "success.main"
                                                                        : "grey.500",
                                                    mb: 1,
                                                    bgcolor: "background.paper",
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor:
                                                                activity.action === "role_update"
                                                                    ? "primary.main"
                                                                    : activity.action === "status_update"
                                                                        ? "warning.main"
                                                                        : activity.action === "email_preferences_update"
                                                                            ? "info.main"
                                                                            : activity.action === "profile_update"
                                                                                ? "success.main"
                                                                                : "grey.500",
                                                        }}
                                                    >
                                                        {activity.action === "role_update" ? (
                                                            <AdminIcon />
                                                        ) : activity.action === "status_update" ? (
                                                            <BlockIcon />
                                                        ) : activity.action === "email_preferences_update" ? (
                                                            <EmailIcon />
                                                        ) : activity.action === "profile_update" ? (
                                                            <EditIcon />
                                                        ) : (
                                                            <HistoryIcon />
                                                        )}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 600, mb: 0.5 }}
                                                        >
                                                            {formatActivityAction(activity.action, activity.details)}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            {(() => {
                                                                const enrollmentInfo = getEnrollmentInfo(activity);
                                                                return (
                                                                    <>
                                                                        {enrollmentInfo && (
                                                                            <Typography
                                                                                variant="body2"
                                                                                color="text.secondary"
                                                                                sx={{ mb: 0.5 }}
                                                                            >
                                                                                {enrollmentInfo}
                                                                            </Typography>
                                                                        )}
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                        >
                                                                            {new Date(activity.created_at).toLocaleString()}
                                                                        </Typography>
                                                                    </>
                                                                );
                                                            })()}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                    <TablePagination
                                        component="div"
                                        count={activityTotal}
                                        page={activityPage - 1}
                                        onPageChange={handleActivityPageChange}
                                        rowsPerPage={10}
                                        rowsPerPageOptions={[10]}
                                    />
                                </>
                            )}

                            {activeTab === 2 && (
                                <>
                                    {enrollmentsLoading ? (
                                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                                            <CircularProgress />
                                        </Box>
                                    ) : (
                                        <Box>
                                            {/* Active Enrollments */}
                                            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                                                Active Enrollments ({userEnrollments.active?.length || 0})
                                            </Typography>
                                            {userEnrollments.active?.length > 0 ? (
                                                <TableContainer component={Paper} sx={{ mb: 3 }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow key="enrollment-dialog-active-header">
                                                                <TableCell>Class</TableCell>
                                                                <TableCell>Session Date</TableCell>
                                                                <TableCell>Status</TableCell>
                                                                <TableCell>Enrolled</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(userEnrollments.active || []).map((enrollment, index) => (
                                                                <TableRow key={enrollment.enrollment_id || `active-${enrollment.class_title}-${index}`}>
                                                                    <TableCell>{enrollment.class_title || 'N/A'}</TableCell>
                                                                    <TableCell>
                                                                        {formatEnrollmentSessionDate(enrollment)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={enrollment.enrollment_status}
                                                                            color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {formatDate(enrollment.enrolled_at)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            ) : (
                                                <Typography color="text.secondary" sx={{ mb: 3 }}>
                                                    No active enrollments found
                                                </Typography>
                                            )}

                                            {/* Historical Enrollments */}
                                            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                                                Historical Enrollments ({userEnrollments.historical?.length || 0})
                                            </Typography>
                                            {userEnrollments.historical?.length > 0 ? (
                                                <TableContainer component={Paper} sx={{ mb: 3 }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow key="enrollment-dialog-historical-header">
                                                                <TableCell>Class</TableCell>
                                                                <TableCell>Session Date</TableCell>
                                                                <TableCell>Status</TableCell>
                                                                <TableCell>Completed/Archived</TableCell>
                                                                <TableCell>Reason</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(userEnrollments.historical || []).map((enrollment, index) => (
                                                                <TableRow key={enrollment.enrollment_id || `historical-${enrollment.class_title}-${index}`}>
                                                                    <TableCell>{enrollment.class_title || 'N/A'}</TableCell>
                                                                    <TableCell>
                                                                        {formatEnrollmentSessionDate(enrollment)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={enrollment.enrollment_status}
                                                                            color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {formatDate(enrollment.completed_at || enrollment.archived_at)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Tooltip title={enrollment.completion_reason || enrollment.archived_reason}>
                                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                                {(enrollment.completion_reason || enrollment.archived_reason || 'N/A').substring(0, 20)}...
                                                                            </Typography>
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            ) : (
                                                <Typography color="text.secondary" sx={{ mb: 3 }}>
                                                    No historical enrollments
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                            <Typography color="error">Failed to load profile</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProfileDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Modern Notification Dialog */}
            <Dialog
                open={notificationDialogOpen}
                onClose={() => {
                    setNotificationDialogOpen(false);
                }}
                disableEnforceFocus
                keepMounted={false}
                maxWidth="sm"
                fullWidth
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle>
                    {selectedUser?.id ?
                        `Send Notification to ${selectedUser.first_name} ${selectedUser.last_name}` :
                        'Send Notification'
                    }
                </DialogTitle>
                <DialogContent>
                    {!selectedUser?.id ? (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            No user selected. Please select a user first.
                        </Alert>
                    ) : (
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Notification Title"
                                value={notificationTitle}
                                onChange={(e) => setNotificationTitle(e.target.value)}
                                required
                            />

                            <TextField
                                fullWidth
                                multiline
                                rows={6}
                                label="Message"
                                value={notificationMessage}
                                onChange={(e) => setNotificationMessage(e.target.value)}
                                placeholder="Enter your notification message..."
                                required
                            />

                            {/* Links Section */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Related Links (Optional)
                                </Typography>
                                {notificationLinks.map((link, index) => (
                                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Link Label"
                                            value={link.label}
                                            onChange={(e) => {
                                                const newLinks = [...notificationLinks];
                                                newLinks[index] = { ...newLinks[index], label: e.target.value };
                                                setNotificationLinks(newLinks);
                                            }}
                                            placeholder="e.g., View Class Details"
                                        />
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="URL"
                                            value={link.url}
                                            onChange={(e) => {
                                                const newLinks = [...notificationLinks];
                                                newLinks[index] = { ...newLinks[index], url: e.target.value };
                                                setNotificationLinks(newLinks);
                                            }}
                                            placeholder="https://example.com"
                                        />
                                        {notificationLinks.length > 1 && (
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setNotificationLinks(notificationLinks.filter((_, i) => i !== index));
                                                }}
                                                sx={{ color: '#ef4444' }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                ))}
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        setNotificationLinks([...notificationLinks, { label: '', url: '' }]);
                                    }}
                                    sx={{ mt: 1 }}
                                >
                                    Add Another Link
                                </Button>
                            </Box>

                            {/* File Attachments Section */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    Attachments (Optional)
                                </Typography>
                                <input
                                    type="file"
                                    ref={notificationFileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                    style={{ display: 'none' }}
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AttachFileIcon />}
                                    onClick={() => notificationFileInputRef.current?.click()}
                                    sx={{ mb: 1 }}
                                >
                                    Attach Files
                                </Button>
                                {attachedFiles.length > 0 && (
                                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {attachedFiles.map((fileItem, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    p: 1,
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                    bgcolor: 'background.paper'
                                                }}
                                            >
                                                {fileItem.fileType === 'application/pdf' ? (
                                                    <PdfIcon color="error" fontSize="small" />
                                                ) : (
                                                    <ImageIcon color="primary" fontSize="small" />
                                                )}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" noWrap>
                                                        {fileItem.fileName}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {formatFileSize(fileItem.fileSize)}
                                                    </Typography>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveFile(index)}
                                                    sx={{ color: '#ef4444' }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    Supported formats: PDF, JPEG, PNG (max 5MB per file)
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setNotificationDialogOpen(false);
                        setNotificationTitle("");
                        setNotificationMessage("");
                        setNotificationLinks([{ label: '', url: '' }]);
                        setAttachedFiles([]);
                        if (notificationFileInputRef.current) {
                            notificationFileInputRef.current.value = '';
                        }
                    }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSendNotification}
                        disabled={!selectedUser?.id || !notificationTitle.trim() || !notificationMessage.trim() || uploadingFiles}
                    >
                        {uploadingFiles ? 'Sending...' : 'Send'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                sx={{ zIndex: 1450 }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Modern Enrollment Dialog */}
            <Dialog
                open={enrollmentDialogOpen}
                onClose={handleCloseEnrollmentDialog}
                maxWidth="lg"
                fullWidth
                sx={{
                    zIndex: 1450,
                    '& .MuiDialog-paper': {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                            Enrollment History for {selectedUser?.first_name} {selectedUser?.last_name}
                        </Typography>
                        <IconButton onClick={handleCloseEnrollmentDialog} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={activeTab} onChange={handleTabChange}>
                            <Tab
                                label={`Active (${userEnrollments.active?.length || 0})`}
                                icon={<InstructorIcon />}
                                iconPosition="start"
                            />
                            <Tab
                                label={`Historical (${userEnrollments.historical?.length || 0})`}
                                icon={<HistoryIcon />}
                                iconPosition="start"
                            />
                        </Tabs>
                    </Box>

                    {activeTab === 0 && (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow key="enrollment-dialog-active-header">
                                        <TableCell>Class</TableCell>
                                        <TableCell>Session Date</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Enrolled</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(userEnrollments.active || []).map((enrollment, index) => (
                                        <TableRow key={enrollment.enrollment_id || `active-${enrollment.class_title}-${index}`}>
                                            <TableCell>{enrollment.class_title || 'N/A'}</TableCell>
                                            <TableCell>
                                                {formatEnrollmentSessionDate(enrollment)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={enrollment.enrollment_status}
                                                    color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(enrollment.enrolled_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {activeTab === 1 && (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow key="enrollment-dialog-historical-header">
                                        <TableCell>Class</TableCell>
                                        <TableCell>Session Date</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Completed/Archived</TableCell>
                                        <TableCell>Reason</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(userEnrollments.historical || []).map((enrollment, index) => (
                                        <TableRow key={enrollment.enrollment_id || `historical-${enrollment.class_title}-${index}`}>
                                            <TableCell>{enrollment.class_title || 'N/A'}</TableCell>
                                            <TableCell>
                                                {formatEnrollmentSessionDate(enrollment)}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={enrollment.enrollment_status}
                                                    color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(enrollment.completed_at || enrollment.archived_at)}
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={enrollment.completion_reason || enrollment.archived_reason}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {(enrollment.completion_reason || enrollment.archived_reason || 'N/A').substring(0, 20)}...
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEnrollmentDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagement;
