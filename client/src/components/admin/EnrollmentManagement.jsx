import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import enrollmentService from '../../services/enrollmentService';
import {
    Box,
    Chip,
    IconButton,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Tooltip,
    Pagination,
    Avatar,
    InputAdornment,
    TextField
} from '@mui/material';
import {
    Check as CheckIcon,
    Block,
    Download as DownloadIcon,
    Pending as PendingIcon,
    Person as PersonIcon,
    School as SchoolIcon,
    Schedule as ScheduleIcon,
    CalendarToday as CalendarIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { useNotifications } from '../../utils/notificationUtils';

function EnrollmentManagement() {
    const { showSuccess, showError } = useNotifications();
    const [enrollments, setEnrollments] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [filters, setFilters] = useState({
        status: 'all',
        classId: 'all',
        dateRange: {
            start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            end: new Date()
        }
    });

    useEffect(() => {
        fetchEnrollments();
        fetchDashboardStats();
        fetchAnalytics();
    }, [filters, page, pageSize]);

    const fetchDashboardStats = async () => {
        try {
            console.log('Fetching dashboard stats...');
            const data = await adminService.getDashboardStats();
            console.log('Dashboard stats received:', data);
            setStats(data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            handleError(error, 'Failed to fetch dashboard statistics');
        }
    };

    const fetchAnalytics = async () => {
        try {
            console.log('Fetching analytics...');

            // Format dates as YYYY-MM-DD to avoid timezone issues and future date validation errors
            const formatLocalDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const data = await adminService.getAnalytics('enrollments', {
                startDate: formatLocalDate(filters.dateRange.start),
                endDate: formatLocalDate(filters.dateRange.end)
            });
            console.log('Analytics data received:', data);
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            handleError(error, 'Failed to fetch analytics data');
        }
    };

    // Deduplicate enrollments by user_id and session_id
    // Keep only one enrollment per user per session
    // When filtering by specific status, ONLY keep enrollments matching that status
    // When filtering by 'all', prefer highest priority status, then most recent
    const deduplicateEnrollments = (enrollments, filterStatus = 'all') => {
        if (!enrollments || enrollments.length === 0) {
            return enrollments;
        }

        const enrollmentMap = new Map();

        // Status priority: approved (3) > pending (2) > rejected (1) > others (0)
        const getStatusPriority = (status) => {
            switch (status?.toLowerCase()) {
                case 'approved': return 3;
                case 'pending': return 2;
                case 'rejected': return 1;
                default: return 0;
            }
        };

        // Check if status matches the filter
        const matchesFilter = (status) => {
            if (filterStatus === 'all') return true;
            return status?.toLowerCase() === filterStatus?.toLowerCase();
        };

        enrollments.forEach((enrollment) => {
            // Get user_id and session_id - handle both snake_case and camelCase
            const userId = enrollment.user_id || enrollment.userId;
            const sessionId = enrollment.session_id || enrollment.sessionId;

            // Skip if we don't have both IDs
            if (!userId || !sessionId) {
                console.warn('Enrollment missing user_id or session_id:', enrollment);
                return;
            }

            // When filtering by specific status, ONLY process enrollments that match the filter
            if (filterStatus !== 'all' && !matchesFilter(enrollment.enrollment_status)) {
                return; // Skip enrollments that don't match the filter
            }

            // Create a unique key for user_id and session_id combination
            const key = `${userId}_${sessionId}`;

            if (!enrollmentMap.has(key)) {
                enrollmentMap.set(key, enrollment);
            } else {
                const existing = enrollmentMap.get(key);

                // If filtering by specific status, both should match (we already filtered above)
                // So just keep the most recent one
                if (filterStatus !== 'all') {
                    const existingDate = new Date(existing.enrolled_at || existing.enrollment_date || 0);
                    const currentDate = new Date(enrollment.enrolled_at || enrollment.enrollment_date || 0);
                    if (currentDate > existingDate) {
                        enrollmentMap.set(key, enrollment);
                    }
                } else {
                    // If filter is 'all', use priority logic
                    const existingPriority = getStatusPriority(existing.enrollment_status);
                    const currentPriority = getStatusPriority(enrollment.enrollment_status);

                    // Keep the enrollment with higher priority status
                    if (currentPriority > existingPriority) {
                        enrollmentMap.set(key, enrollment);
                    } else if (currentPriority === existingPriority) {
                        // If same priority, keep the most recent one
                        const existingDate = new Date(existing.enrolled_at || existing.enrollment_date || 0);
                        const currentDate = new Date(enrollment.enrolled_at || enrollment.enrollment_date || 0);
                        if (currentDate > existingDate) {
                            enrollmentMap.set(key, enrollment);
                        }
                    }
                }
            }
        });

        return Array.from(enrollmentMap.values());
    };

    const fetchEnrollments = async () => {
        try {
            setLoading(true);

            // Format dates as YYYY-MM-DD to avoid timezone issues
            const formatLocalDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const formattedFilters = {
                status: filters.status || 'all',
                startDate: formatLocalDate(filters.dateRange.start),
                endDate: formatLocalDate(filters.dateRange.end),
                page,
                limit: pageSize
            };

            console.log('Fetching enrollments with filters:', formattedFilters);
            console.log('Status filter value:', formattedFilters.status);
            const { enrollments: data, total } = await enrollmentService.getEnrollments(formattedFilters);
            console.log('Enrollments data received:', data, 'Total:', total);

            // First, strictly filter by status if a specific status is selected (defensive check)
            let filteredData = data;
            if (formattedFilters.status && formattedFilters.status !== 'all') {
                filteredData = data.filter(enrollment => {
                    const status = enrollment.enrollment_status?.toLowerCase();
                    const filterStatus = formattedFilters.status.toLowerCase();
                    return status === filterStatus;
                });
                console.log('After strict status filtering:', filteredData.length, 'from', data.length);
                console.log('Status breakdown:', {
                    requested: formattedFilters.status,
                    found: filteredData.map(e => e.enrollment_status),
                    allStatuses: [...new Set(data.map(e => e.enrollment_status))]
                });
            }

            // Always deduplicate to ensure only one enrollment card per user per session
            // The deduplication will prefer enrollments matching the filter status when filtering
            const processedData = deduplicateEnrollments(filteredData, formattedFilters.status);
            console.log('Deduplicated enrollments:', processedData.length, 'from', filteredData.length);

            setEnrollments(processedData);
            // Use deduplicated count for total to reflect what's actually displayed
            setTotal(processedData.length);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
            handleError(error, 'Failed to fetch enrollments');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (enrollmentId, newStatus) => {
        try {
            setLoading(true);
            const response = await enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus);
            if (response.error) {
                throw new Error(response.error);
            }
            await fetchEnrollments();
            showSuccess(`Enrollment ${newStatus} successfully`);
        } catch (error) {
            handleError(error, `Failed to ${newStatus} enrollment`);
        } finally {
            setLoading(false);
        }
    };


    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleExportEnrollments = async () => {
        try {
            setLoading(true);
            // Format dates for export filename
            const formatLocalDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const data = await enrollmentService.exportEnrollments(filters);
            // Create and download CSV file
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `enrollments-${formatLocalDate(filters.dateRange.start)}-to-${formatLocalDate(filters.dateRange.end)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showSuccess('Enrollments exported successfully');
        } catch (error) {
            handleError(error, 'Failed to export enrollments');
        } finally {
            setLoading(false);
        }
    };

    const handleError = (error, message) => {
        setError(message);
        console.error(error);
        showError(message);
        // Auto-clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'success';
            case 'pending':
                return 'warning';
            case 'rejected':
                return 'error';
            default:
                return 'default';
        }
    };

    // Group enrollments by session
    const groupEnrollmentsBySession = (enrollments) => {
        const grouped = new Map();

        enrollments.forEach((enrollment) => {
            const sessionId = enrollment.session_id || enrollment.sessionId;
            const sessionDate = enrollment.session_date;

            // Create a key for grouping - use session_id if available, otherwise use session_date
            const key = sessionId || (sessionDate ? new Date(sessionDate).toISOString() : 'no-session');

            if (!grouped.has(key)) {
                grouped.set(key, {
                    sessionId: sessionId,
                    sessionDate: sessionDate,
                    class_name: enrollment.class_name,
                    display_date: enrollment.display_date,
                    enrollments: []
                });
            }

            grouped.get(key).enrollments.push(enrollment);
        });

        // Convert to array and sort by session date (earliest first, or no date last)
        return Array.from(grouped.values()).sort((a, b) => {
            if (!a.sessionDate && !b.sessionDate) return 0;
            if (!a.sessionDate) return 1;
            if (!b.sessionDate) return -1;
            return new Date(a.sessionDate) - new Date(b.sessionDate);
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <CircularProgress />
            </div>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            maxWidth: '100vw',
            overflow: 'hidden'
        }}>
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
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                    }}
                >
                    <PersonIcon sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
                    Enrollment Management
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: '#6b7280',
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                >
                    Manage student enrollments, track status, and monitor enrollment analytics
                </Typography>
            </Box>

            {/* Error Display */}
            {error && (
                <Box sx={{
                    maxWidth: { xs: '100%', sm: '1200px' },
                    mx: 'auto',
                    mb: 3,
                    px: { xs: 2, sm: 3 }
                }}>
                    <Alert severity="error" sx={{ borderRadius: '12px' }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Box>
            )}

            {/* Modern Statistics Cards */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                mb: 4,
                px: { xs: 2, sm: 3 }
            }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: { xs: 2, sm: 3 }
                }}>
                    <Paper sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transform: 'translateY(-1px)',
                            borderColor: '#3b82f6'
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Active Enrollments
                                </Typography>
                                <Typography variant="h4" sx={{
                                    color: '#3b82f6',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}>
                                    {stats?.totalEnrollments || 0}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                    <Paper sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transform: 'translateY(-1px)',
                            borderColor: '#f59e0b'
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: '#f59e0b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <PendingIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Pending Approvals
                                </Typography>
                                <Typography variant="h4" sx={{
                                    color: '#f59e0b',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}>
                                    {stats?.pendingEnrollments || 0}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                    <Paper sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transform: 'translateY(-1px)',
                            borderColor: '#10b981'
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <CheckIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Active Students
                                </Typography>
                                <Typography variant="h4" sx={{
                                    color: '#10b981',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}>
                                    {stats?.activeStudents || 0}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                    <Paper sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: '16px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            transform: 'translateY(-1px)',
                            borderColor: '#8b5cf6'
                        }
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '10px',
                                bgcolor: '#8b5cf6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <CalendarIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Enrollment Rate
                                </Typography>
                                <Typography variant="h4" sx={{
                                    color: '#8b5cf6',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}>
                                    {analytics?.enrollmentRate ? `${analytics.enrollmentRate}%` : '0%'}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Box>



            {/* Modern Filters */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                mb: 4,
                px: { xs: 2, sm: 3 }
            }}>
                <Paper sx={{
                    p: { xs: 3, sm: 4 },
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
                            fontSize: { xs: '1rem', sm: '1.125rem' },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <FilterListIcon sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }} />
                        Filters
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel sx={{
                                '&.Mui-focused': { color: '#3b82f6' }
                            }}>Status</InputLabel>
                            <Select
                                value={filters.status}
                                label="Status"
                                onChange={(e) => handleFilterChange({ status: e.target.value })}
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
                                <MenuItem value="all">All Statuses</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Paper>
            </Box>

            {/* Modern Enrollment Cards */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                mb: 4,
                px: { xs: 2, sm: 3 }
            }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={40} />
                    </Box>
                ) : enrollments.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
                        <PersonIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            No enrollments found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Students will appear here when they enroll in classes
                        </Typography>
                    </Paper>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {groupEnrollmentsBySession(enrollments).map((sessionGroup, sessionIndex) => (
                            <Paper
                                key={sessionGroup.sessionId || sessionIndex}
                                sx={{
                                    p: { xs: 2, sm: 3 },
                                    borderRadius: '16px',
                                    border: '2px solid #e5e7eb',
                                    bgcolor: '#ffffff',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: '#3b82f6',
                                        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }
                                }}
                            >
                                {/* Session Header */}
                                <Box sx={{
                                    p: { xs: 2, sm: 2.5 },
                                    mb: 3,
                                    borderRadius: '12px',
                                    bgcolor: '#f9fafb',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                        <ScheduleIcon sx={{ fontSize: 24, color: '#3b82f6' }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                                                {sessionGroup.class_name || 'Unknown Class'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                                {sessionGroup.display_date ||
                                                    (sessionGroup.sessionDate ? new Date(sessionGroup.sessionDate).toLocaleDateString() : 'No date')}
                                                {' • '}
                                                {sessionGroup.enrollments.length} {sessionGroup.enrollments.length === 1 ? 'enrollment' : 'enrollments'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Enrollment Cards for this Session */}
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                                    gap: { xs: 2, sm: 3 }
                                }}>
                                    {sessionGroup.enrollments.map((enrollment) => (
                                        <Box key={enrollment.id} sx={{ width: '100%', minWidth: 0 }}>
                                            <Paper sx={{
                                                p: { xs: 2, sm: 3 },
                                                borderRadius: '16px',
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
                                                {/* Enrollment Header */}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                                        <Avatar sx={{
                                                            bgcolor: getStatusColor(enrollment.enrollment_status) === 'success' ? '#10b981' :
                                                                getStatusColor(enrollment.enrollment_status) === 'warning' ? '#f59e0b' :
                                                                    getStatusColor(enrollment.enrollment_status) === 'error' ? '#ef4444' : '#6b7280',
                                                            width: 48,
                                                            height: 48
                                                        }}>
                                                            {enrollment.student_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S'}
                                                        </Avatar>
                                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                                            <Typography
                                                                variant="h6"
                                                                sx={{
                                                                    fontWeight: 600,
                                                                    fontSize: { xs: '1rem', sm: '1.125rem' },
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {enrollment.student_name}
                                                            </Typography>
                                                            <Typography
                                                                variant="body2"
                                                                color="text.secondary"
                                                                sx={{
                                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {enrollment.class_name}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Chip
                                                        label={enrollment.enrollment_status}
                                                        color={getStatusColor(enrollment.enrollment_status)}
                                                        size="small"
                                                        sx={{ fontSize: '0.75rem' }}
                                                    />
                                                </Box>

                                                {/* Enrollment Details */}
                                                <Box sx={{ mb: 3 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <SchoolIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: '#374151',
                                                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {enrollment.class_name}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <ScheduleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: '#374151',
                                                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                            }}
                                                        >
                                                            Session: {new Date(enrollment.session_date).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <CalendarIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: '#374151',
                                                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                            }}
                                                        >
                                                            Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                    {enrollment.payment_method && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                                            <SchoolIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    color: '#374151',
                                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                                }}
                                                            >
                                                                Payment: {enrollment.payment_method}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* Enrollment Actions */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    pt: 2,
                                                    borderTop: '1px solid #f3f4f6'
                                                }}>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        {enrollment.enrollment_status === 'pending' ? (
                                                            <>
                                                                <Tooltip title="Approve">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleStatusUpdate(enrollment.id, 'approved')}
                                                                        sx={{
                                                                            color: '#6b7280',
                                                                            '&:hover': { color: '#10b981' }
                                                                        }}
                                                                    >
                                                                        <CheckIcon sx={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Reject">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleStatusUpdate(enrollment.id, 'rejected')}
                                                                        sx={{
                                                                            color: '#6b7280',
                                                                            '&:hover': { color: '#ef4444' }
                                                                        }}
                                                                    >
                                                                        <Block sx={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </>
                                                        ) : (
                                                            <Tooltip title="Set Pending">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleStatusUpdate(enrollment.id, 'pending')}
                                                                    sx={{
                                                                        color: '#6b7280',
                                                                        '&:hover': { color: '#f59e0b' }
                                                                    }}
                                                                >
                                                                    <PendingIcon sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Modern Pagination */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                mb: 4,
                px: { xs: 2, sm: 3 }
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={Math.ceil(total / pageSize)}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        size="small"
                        showFirstButton
                        showLastButton
                        sx={{
                            '& .MuiPaginationItem-root': {
                                borderRadius: '8px',
                                '&.Mui-selected': {
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#2563eb'
                                    }
                                }
                            }
                        }}
                    />
                </Box>
            </Box>

        </Box>
    );
}

export default EnrollmentManagement; 