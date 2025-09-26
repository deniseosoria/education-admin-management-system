import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    Grid,
    Divider,
    IconButton,
    Tooltip,
    LinearProgress,
    Tabs,
    Tab,
    Button,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    CheckCircle as AcceptedIcon,
    Pending as PendingIcon,
    Cancel as DeclinedIcon,
    Info as InfoIcon,
    CalendarToday as CalendarIcon,
    Person as TeacherIcon,
    AccessTime as ScheduleIcon,
    LocationOn as LocationIcon,
    Group as GroupIcon,
    History as HistoryIcon,
    School as SchoolIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import './EnrollmentsSection.css';

const EnrollmentsSection = ({ enrollments, historicalEnrollments, loading = false, error = null, onRefresh }) => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'pending':
                return 'warning';
            case 'rejected':
                return 'error';
            case 'declined':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <AcceptedIcon />;
            case 'pending':
                return <PendingIcon />;
            case 'rejected':
                return <DeclinedIcon />;
            case 'declined':
                return <DeclinedIcon />;
            default:
                return null;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return 'N/A';
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        try {
            const [hour, minute] = timeString.split(':');
            const date = new Date();
            date.setHours(Number(hour), Number(minute));
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch (error) {
            console.error('Error formatting time:', timeString, error);
            return timeString || 'N/A';
        }
    };

    const calculateCapacityPercentage = (current, total) => {
        if (!current || !total || total === 0) return 0;
        return Math.min((current / total) * 100, 100);
    };

    const renderEnrollmentCard = (enrollment, isHistorical = false) => (
        <Box
            key={enrollment.enrollment_id || enrollment.historical_enrollment_id || `enrollment-${enrollment.class_name || enrollment.class_title}-${isHistorical ? 'historical' : 'active'}`}
            sx={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                overflow: 'hidden',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                minHeight: { xs: 'auto', md: '200px' },
                mb: 3,
                '&:hover': {
                    boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transform: 'translateY(-1px)',
                    borderColor: '#3b82f6'
                }
            }}
        >
            {/* Left Section - Header Info */}
            <Box sx={{
                p: { xs: 3, md: 4 },
                flex: { xs: 'none', md: '0 0 300px' },
                display: 'flex',
                flexDirection: 'column',
                borderBottom: { xs: '1px solid #f3f4f6', md: 'none' }
            }}>
                {/* Status badge at top */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 2,
                            py: 0.5,
                            borderRadius: '12px',
                            backgroundColor: getStatusColor(enrollment.enrollment_status) === 'success' ? '#dcfce7' :
                                getStatusColor(enrollment.enrollment_status) === 'warning' ? '#fef3c7' :
                                    getStatusColor(enrollment.enrollment_status) === 'error' ? '#fee2e2' : '#f3f4f6',
                            color: getStatusColor(enrollment.enrollment_status) === 'success' ? '#166534' :
                                getStatusColor(enrollment.enrollment_status) === 'warning' ? '#92400e' :
                                    getStatusColor(enrollment.enrollment_status) === 'error' ? '#991b1b' : '#6b7280',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                        }}
                    >
                        {getStatusIcon(enrollment.enrollment_status)}
                        <Box component="span" sx={{ ml: 0.5 }}>
                            {enrollment.enrollment_status || 'N/A'}
                        </Box>
                    </Box>
                    {isHistorical && (
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 2,
                                py: 0.5,
                                borderRadius: '12px',
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                fontSize: '0.75rem',
                                fontWeight: 500
                            }}
                        >
                            Historical
                        </Box>
                    )}
                </Box>

                {/* Class name */}
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        color: '#111827',
                        lineHeight: 1.3,
                        mb: 3
                    }}
                >
                    {enrollment.class_name || enrollment.class_title || 'N/A'}
                </Typography>

                {/* Enrollment date */}
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem', mt: 'auto' }}>
                    Enrolled: {enrollment.enrollment_date || enrollment.enrolled_at ? formatDate(enrollment.enrollment_date || enrollment.enrolled_at) : 'N/A'}
                </Typography>
            </Box>

            {/* Right Section - Details */}
            <Box sx={{
                p: { xs: 3, md: 4 },
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderLeft: { xs: 'none', md: '1px solid #f3f4f6' }
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 }, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 } }}>
                        <Box
                            sx={{
                                width: { xs: 28, md: 32 },
                                height: { xs: 28, md: 32 },
                                borderRadius: '8px',
                                backgroundColor: '#eff6ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <TeacherIcon sx={{ fontSize: { xs: 14, md: 16 }, color: '#3b82f6' }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 500, mb: 0.5 }}>
                                Instructor
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#111827', fontWeight: 500, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                {enrollment.instructor_name || 'N/A'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 } }}>
                        <Box
                            sx={{
                                width: { xs: 28, md: 32 },
                                height: { xs: 28, md: 32 },
                                borderRadius: '8px',
                                backgroundColor: '#f0fdf4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <ScheduleIcon sx={{ fontSize: { xs: 14, md: 16 }, color: '#22c55e' }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 500, mb: 0.5 }}>
                                Schedule
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#111827', fontWeight: 500, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                {enrollment.start_time && enrollment.end_time
                                    ? `${formatTime(enrollment.start_time)} - ${formatTime(enrollment.end_time)}`
                                    : 'N/A'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 } }}>
                        <Box
                            sx={{
                                width: { xs: 28, md: 32 },
                                height: { xs: 28, md: 32 },
                                borderRadius: '8px',
                                backgroundColor: '#fef3c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <LocationIcon sx={{ fontSize: { xs: 14, md: 16 }, color: '#f59e0b' }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 500, mb: 0.5 }}>
                                Location
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#111827', fontWeight: 500, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                {enrollment.location || enrollment.location_details || 'N/A'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 } }}>
                        <Box
                            sx={{
                                width: { xs: 28, md: 32 },
                                height: { xs: 28, md: 32 },
                                borderRadius: '8px',
                                backgroundColor: '#fdf2f8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <CalendarIcon sx={{ fontSize: { xs: 14, md: 16 }, color: '#ec4899' }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 500, mb: 0.5 }}>
                                Date
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#111827', fontWeight: 500, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                {enrollment.display_date || (enrollment.start_date ? formatDate(enrollment.start_date) : 'N/A')}
                            </Typography>
                        </Box>
                    </Box>

                    {!isHistorical && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 } }}>
                            <Box
                                sx={{
                                    width: { xs: 28, md: 32 },
                                    height: { xs: 28, md: 32 },
                                    borderRadius: '8px',
                                    backgroundColor: '#f0f9ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                <GroupIcon sx={{ fontSize: { xs: 14, md: 16 }, color: '#0ea5e9' }} />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 500, mb: 0.5 }}>
                                    Class Capacity
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#111827', fontWeight: 500, fontSize: { xs: '0.8rem', md: '0.9rem' }, mb: 1 }}>
                                    {(enrollment.current_students ?? 0)}/{(enrollment.capacity ?? 0)} students
                                </Typography>
                                <Box
                                    sx={{
                                        height: { xs: 4, md: 6 },
                                        backgroundColor: '#e5e7eb',
                                        borderRadius: 3,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            height: '100%',
                                            backgroundColor: '#3b82f6',
                                            width: `${calculateCapacityPercentage(enrollment.current_students, enrollment.capacity)}%`,
                                            transition: 'width 0.3s ease'
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Decline reason if applicable */}
                {enrollment.enrollment_status === 'declined' && enrollment.decline_reason && (
                    <Box
                        sx={{
                            mt: 3,
                            p: 2,
                            backgroundColor: '#fee2e2',
                            borderRadius: '8px',
                            border: '1px solid #f87171'
                        }}
                    >
                        <Typography variant="body2" sx={{ color: '#991b1b', fontSize: '0.8rem', lineHeight: 1.4 }}>
                            Reason: {enrollment.decline_reason}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );

    const hasActiveEnrollments = enrollments && enrollments.length > 0;
    const hasHistoricalEnrollments = historicalEnrollments && historicalEnrollments.length > 0;

    // Show loading state
    if (loading) {
        return (
            <Box className="enrollments-section">
                <Typography variant="h6" component="h2" gutterBottom>
                    Class Enrollments
                </Typography>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    // Show error state
    if (error) {
        return (
            <Box className="enrollments-section">
                <Typography variant="h6" component="h2" gutterBottom>
                    Class Enrollments
                </Typography>
                <Alert
                    severity="error"
                    action={
                        onRefresh && (
                            <Button color="inherit" size="small" onClick={onRefresh} startIcon={<RefreshIcon />}>
                                Retry
                            </Button>
                        )
                    }
                >
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                        fontWeight: 700,
                        color: '#111827',
                        fontSize: { xs: '1.25rem', md: '1.5rem' }
                    }}
                >
                    Class Enrollments
                </Typography>
                {onRefresh && (
                    <Box
                        onClick={onRefresh}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: { xs: 36, md: 40 },
                            height: { xs: 36, md: 40 },
                            borderRadius: '10px',
                            backgroundColor: '#f3f4f6',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                backgroundColor: '#e5e7eb',
                                transform: 'scale(1.05)'
                            }
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: { xs: 18, md: 20 }, color: '#6b7280' }} />
                    </Box>
                )}
            </Box>

            {/* Modern Tabs */}
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        display: 'flex',
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        p: 0.5,
                        border: '1px solid #e5e7eb',
                        maxWidth: { xs: '100%', md: '600px', lg: '700px' }
                    }}
                >
                    <Box
                        onClick={() => setTabValue(0)}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: { xs: 0.5, md: 1 },
                            py: { xs: 1.5, md: 2 },
                            px: { xs: 2, md: 3 },
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor: tabValue === 0 ? 'white' : 'transparent',
                            boxShadow: tabValue === 0 ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
                            border: tabValue === 0 ? '1px solid #e5e7eb' : 'none'
                        }}
                    >
                        <SchoolIcon sx={{ fontSize: { xs: 16, md: 18 }, color: tabValue === 0 ? '#3b82f6' : '#6b7280' }} />
                        <Typography
                            sx={{
                                fontWeight: tabValue === 0 ? 600 : 500,
                                color: tabValue === 0 ? '#3b82f6' : '#6b7280',
                                fontSize: { xs: '0.8rem', md: '0.9rem' }
                            }}
                        >
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                Current Enrollments ({hasActiveEnrollments ? enrollments.length : 0})
                            </Box>
                            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                                Current ({hasActiveEnrollments ? enrollments.length : 0})
                            </Box>
                        </Typography>
                    </Box>
                    <Box
                        onClick={() => setTabValue(1)}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: { xs: 0.5, md: 1 },
                            py: { xs: 1.5, md: 2 },
                            px: { xs: 2, md: 3 },
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor: tabValue === 1 ? 'white' : 'transparent',
                            boxShadow: tabValue === 1 ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
                            border: tabValue === 1 ? '1px solid #e5e7eb' : 'none'
                        }}
                    >
                        <HistoryIcon sx={{ fontSize: { xs: 16, md: 18 }, color: tabValue === 1 ? '#3b82f6' : '#6b7280' }} />
                        <Typography
                            sx={{
                                fontWeight: tabValue === 1 ? 600 : 500,
                                color: tabValue === 1 ? '#3b82f6' : '#6b7280',
                                fontSize: { xs: '0.8rem', md: '0.9rem' }
                            }}
                        >
                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                Past Enrollments ({hasHistoricalEnrollments ? historicalEnrollments.length : 0})
                            </Box>
                            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                                Past ({hasHistoricalEnrollments ? historicalEnrollments.length : 0})
                            </Box>
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Active Enrollments Tab */}
            {tabValue === 0 && (
                <>
                    {!hasActiveEnrollments ? (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 8,
                                px: 4,
                                backgroundColor: '#f9fafb',
                                borderRadius: '16px',
                                border: '2px dashed #d1d5db'
                            }}
                        >
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '16px',
                                    backgroundColor: '#e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 3
                                }}
                            >
                                <SchoolIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
                            </Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: '#6b7280',
                                    fontWeight: 600,
                                    mb: 1
                                }}
                            >
                                No current enrollments
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#9ca3af',
                                    textAlign: 'center',
                                    maxWidth: 300
                                }}
                            >
                                You don't have any active class enrollments at the moment. Browse our available classes to get started.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {(enrollments || []).map((enrollment, index) => renderEnrollmentCard(enrollment, false))}
                        </Box>
                    )}
                </>
            )}

            {/* Historical Enrollments Tab */}
            {tabValue === 1 && (
                <>
                    {!hasHistoricalEnrollments ? (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                py: 8,
                                px: 4,
                                backgroundColor: '#f9fafb',
                                borderRadius: '16px',
                                border: '2px dashed #d1d5db'
                            }}
                        >
                            <Box
                                sx={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: '16px',
                                    backgroundColor: '#e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mb: 3
                                }}
                            >
                                <HistoryIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
                            </Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: '#6b7280',
                                    fontWeight: 600,
                                    mb: 1
                                }}
                            >
                                No past enrollments
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: '#9ca3af',
                                    textAlign: 'center',
                                    maxWidth: 300
                                }}
                            >
                                Your completed and archived enrollments will appear here once you finish your classes.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {(historicalEnrollments || []).map((enrollment, index) => renderEnrollmentCard(enrollment, true))}
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default EnrollmentsSection;