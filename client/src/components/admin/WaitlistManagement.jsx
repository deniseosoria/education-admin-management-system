import React, { useState, useEffect, useMemo } from "react";
import adminService from "../../services/adminService";
import { useNotifications } from '../../utils/notificationUtils';
import {
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment,
    Stack,
    Tooltip,
    Card,
    CardContent,
    Grid,
} from "@mui/material";
import {
    Queue as QueueIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Schedule as ScheduleIcon,
    LocationOn as LocationIcon,
    School as SchoolIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    FilterList as FilterListIcon,
    Search as SearchIcon,
} from "@mui/icons-material";

// Helper function for date formatting
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Helper function for time formatting
const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
};

function WaitlistManagement() {
    const [waitlistEntries, setWaitlistEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        class: 'all',
        search: ''
    });
    const [classes, setClasses] = useState([]);
    const { showSuccess, showError } = useNotifications();

    // Fetch all waitlist entries on component mount
    useEffect(() => {
        fetchWaitlistEntries();
        fetchClasses();
    }, []);

    const fetchWaitlistEntries = async () => {
        try {
            setLoading(true);
            setError(null);
            const entries = await adminService.getAllWaitlistEntries();
            setWaitlistEntries(entries);
            // Apply default filters after fetching data
            // setTimeout(() => applyFilters(), 0); // This line is removed as applyFilters is now memoized
        } catch (error) {
            handleError(error, "Failed to fetch waitlist entries");
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const classData = await adminService.getAllClasses();
            setClasses(classData);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    // Memoized filtered entries - this will only recalculate when waitlistEntries or filters change
    const filteredEntries = useMemo(() => {
        // Only apply filters if we have entries to filter
        if (waitlistEntries.length === 0) {
            return [];
        }

        // Remove duplicates based on id to prevent React key warnings
        const uniqueEntries = waitlistEntries.reduce((acc, entry) => {
            if (!acc.find(item => item.id === entry.id)) {
                acc.push(entry);
            }
            return acc;
        }, []);

        let filtered = [...uniqueEntries];

        // Filter by class - convert both to strings for comparison
        if (filters.class !== 'all') {
            const classId = filters.class.toString();
            filtered = filtered.filter(entry => {
                const entryClassId = entry.class_id.toString();
                return entryClassId === classId;
            });
        }

        // Filter by search term
        if (filters.search && filters.search.trim()) {
            const searchTerm = filters.search.toLowerCase().trim();
            filtered = filtered.filter(entry =>
                (entry.user_name && entry.user_name.toLowerCase().includes(searchTerm)) ||
                (entry.user_email && entry.user_email.toLowerCase().includes(searchTerm)) ||
                (entry.class_name && entry.class_name.toLowerCase().includes(searchTerm))
            );
        }

        return filtered;
    }, [waitlistEntries, filters]);

    // Memoized unique entries for statistics (without filters)
    const uniqueEntries = useMemo(() => {
        if (waitlistEntries.length === 0) {
            return [];
        }

        // Remove duplicates based on id
        return waitlistEntries.reduce((acc, entry) => {
            if (!acc.find(item => item.id === entry.id)) {
                acc.push(entry);
            }
            return acc;
        }, []);
    }, [waitlistEntries]);

    const handleWaitlistAction = async (entry, action) => {
        try {
            setLoading(true);
            let status;
            let successMessage;

            if (action === 'approved') {
                status = 'approved';
                successMessage = 'Waitlist entry approved and moved to enrollments successfully';
            } else if (action === 'rejected') {
                status = 'rejected';
                successMessage = 'Waitlist entry rejected and moved to enrollments for tracking';
            } else {
                status = action;
                successMessage = `Waitlist entry ${action} successfully`;
            }

            await adminService.updateWaitlistStatus(entry.class_id, entry.id, status);
            showSuccess(successMessage);

            // Remove the processed entry from the list
            setWaitlistEntries(prev => prev.filter(item => item.id !== entry.id));
        } catch (error) {
            handleError(error, `Failed to ${action} waitlist entry`);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const handleError = (error, customMessage = 'An error occurred') => {
        console.error(error);
        setError(error.message || customMessage);
        showError(error.message || customMessage);
    };


    if (loading && waitlistEntries.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
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
                    <QueueIcon sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
                    Waitlist Management
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: '#6b7280',
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                >
                    Manage active waitlist entries (pending and waiting). Approve or reject students to move them to enrollments.
                </Typography>
            </Box>

            {/* Modern Statistics Cards */}
            <Box sx={{
                maxWidth: { xs: '100%', sm: '1200px' },
                mx: 'auto',
                mb: 4,
                px: { xs: 2, sm: 3 }
            }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
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
                                <QueueIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Pending Entries
                                </Typography>
                                <Typography variant="h4" sx={{
                                    color: '#f59e0b',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}>
                                    {uniqueEntries.filter(entry => entry.status === 'pending').length}
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
                                <SchoolIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Active Classes
                                </Typography>
                                <Typography variant="h4" sx={{
                                    color: '#3b82f6',
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '2rem' }
                                }}>
                                    {new Set(uniqueEntries.map(entry => entry.class_id)).size}
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
                        <TextField
                            fullWidth
                            placeholder="Search students or classes..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
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
                            }}>Class</InputLabel>
                            <Select
                                value={filters.class}
                                label="Class"
                                onChange={(e) => handleFilterChange('class', e.target.value)}
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
                                <MenuItem value="all">All Classes</MenuItem>
                                {classes.map((cls) => (
                                    <MenuItem key={cls.id} value={cls.id}>
                                        {cls.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Paper>
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

            {/* Modern Waitlist Cards */}
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
                ) : filteredEntries.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
                        <QueueIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            {filters.class !== 'all' || filters.search
                                ? 'No waitlist entries match your filters'
                                : 'No waitlist entries found'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {filters.class !== 'all' || filters.search
                                ? 'Try adjusting your search criteria or filters'
                                : 'Students will appear here when they join a waitlist'}
                        </Typography>
                    </Paper>
                ) : (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                        gap: { xs: 2, sm: 3 }
                    }}>
                        {filteredEntries.map((entry) => (
                            <Box key={entry.id} sx={{ width: '100%', minWidth: 0 }}>
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
                                    {/* Entry Header */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                            <Box sx={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: '12px',
                                                bgcolor: entry.status === 'pending' ? '#f59e0b' : '#6b7280',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <PersonIcon sx={{ color: 'white', fontSize: 24 }} />
                                            </Box>
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
                                                    {entry.user_name || entry.student_name || entry.user || entry.name || 'N/A'}
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
                                                    {entry.user_email || entry.student_email || entry.email || 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip
                                            label={entry.status === 'pending' ? 'Pending' : entry.status === 'waiting' ? 'Waiting' : entry.status}
                                            color={entry.status === 'pending' ? 'warning' : entry.status === 'waiting' ? 'info' : 'default'}
                                            size="small"
                                            sx={{ fontSize: '0.75rem' }}
                                        />
                                    </Box>

                                    {/* Entry Details */}
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
                                                {entry.class_name || entry.class_title || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <LocationIcon sx={{ fontSize: 16, color: '#6b7280' }} />
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
                                                {entry.location_details || entry.location || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <QueueIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: '#374151',
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                }}
                                            >
                                                Position: {entry.position || 'N/A'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ScheduleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: '#374151',
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                }}
                                            >
                                                Next: {entry.next_session_date ? formatDate(entry.next_session_date) : 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Entry Actions */}
                                    <Box sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        pt: 2,
                                        borderTop: '1px solid #f3f4f6'
                                    }}>
                                        {(entry.status === 'waiting' || entry.status === 'pending') ? (
                                            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => handleWaitlistAction(entry, 'approved')}
                                                    disabled={loading}
                                                    startIcon={<CheckCircleIcon />}
                                                    sx={{
                                                        flex: 1,
                                                        borderRadius: '8px',
                                                        textTransform: 'none',
                                                        fontWeight: 500,
                                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                    }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="error"
                                                    onClick={() => handleWaitlistAction(entry, 'rejected')}
                                                    disabled={loading}
                                                    startIcon={<CancelIcon />}
                                                    sx={{
                                                        flex: 1,
                                                        borderRadius: '8px',
                                                        textTransform: 'none',
                                                        fontWeight: 500,
                                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                    }}
                                                >
                                                    Reject
                                                </Button>
                                            </Box>
                                        ) : (
                                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                <Chip
                                                    label={entry.status === 'approved' ? 'Approved' : 'Rejected'}
                                                    color={entry.status === 'approved' ? 'success' : 'error'}
                                                    size="small"
                                                    icon={entry.status === 'approved' ? <CheckCircleIcon /> : <CancelIcon />}
                                                    sx={{ fontSize: '0.75rem' }}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
}

export default WaitlistManagement;
