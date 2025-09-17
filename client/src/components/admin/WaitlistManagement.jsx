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
        <Box className="waitlist-management">
            {/* Header */}
            <Box mb={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    <QueueIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Waitlist Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage active waitlist entries (pending and waiting). Approve or reject students to move them to enrollments.
                </Typography>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={6}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Pending Entries
                            </Typography>
                            <Typography variant="h4" component="div" color="warning.main">
                                {waitlistEntries.filter(entry => entry.status === 'pending').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Active Classes
                            </Typography>
                            <Typography variant="h4" component="div" color="primary.main">
                                {new Set(waitlistEntries.map(entry => entry.class_id)).size}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Filters
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        label="Search Students or Classes"
                        variant="outlined"
                        size="small"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ minWidth: 250 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Class</InputLabel>
                        <Select
                            value={filters.class}
                            label="Class"
                            onChange={(e) => handleFilterChange('class', e.target.value)}
                        >
                            <MenuItem value="all">All Classes</MenuItem>
                            {classes.map((cls) => (
                                <MenuItem key={cls.id} value={cls.id}>
                                    {cls.title}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Waitlist Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Student
                                </TableCell>
                                <TableCell>
                                    <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Email
                                </TableCell>
                                <TableCell>
                                    <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Class
                                </TableCell>
                                <TableCell>
                                    <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Location
                                </TableCell>
                                <TableCell>
                                    <QueueIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Position
                                </TableCell>
                                <TableCell>
                                    <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Next Session
                                </TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body1" color="text.secondary">
                                            {filters.class !== 'all' || filters.search
                                                ? 'No active waitlist entries match your filters'
                                                : 'No active waitlist entries found'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <TableRow key={entry.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {entry.user_name || entry.student_name || entry.user || entry.name || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {entry.user_email || entry.student_email || entry.email || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {entry.class_name || entry.class_title || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {entry.location_details || entry.location || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {entry.position || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {entry.next_session_date ? formatDate(entry.next_session_date) : 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {(entry.status === 'waiting' || entry.status === 'pending') && (
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title="Approve and enroll student">
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            onClick={() => handleWaitlistAction(entry, 'approved')}
                                                            disabled={loading}
                                                            startIcon={<CheckCircleIcon />}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Reject waitlist entry">
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="error"
                                                            onClick={() => handleWaitlistAction(entry, 'rejected')}
                                                            disabled={loading}
                                                            startIcon={<CancelIcon />}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </Tooltip>
                                                </Stack>
                                            )}
                                            {entry.status === 'approved' && (
                                                <Chip
                                                    label="Approved"
                                                    color="success"
                                                    size="small"
                                                    icon={<CheckCircleIcon />}
                                                />
                                            )}
                                            {entry.status === 'rejected' && (
                                                <Chip
                                                    label="Rejected"
                                                    color="error"
                                                    size="small"
                                                    icon={<CancelIcon />}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}

export default WaitlistManagement;
