import React, { useState, useEffect } from "react";
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
    Lock as LockIcon,
    History as HistoryIcon,
    Close as CloseIcon,
} from "@mui/icons-material";
import adminService from "../../services/adminService";
import { useNotifications } from '../../utils/notificationUtils';

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const UserManagement = () => {
    const { showSuccess, showError } = useNotifications();
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
        setSelectedUser({
            ...user,
            notificationMessage: ''
        });
        setNotificationDialogOpen(true);
        handleMenuClose();
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
            const enrollments = await adminService.getUserEnrollments(user.id);
            const active = enrollments.filter(e => e.enrollment_type === 'active');
            const historical = enrollments.filter(e => e.enrollment_type === 'historical');
            setUserEnrollments({ active, historical });
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

            if (!selectedUser.notificationMessage?.trim()) {
                showError('Please enter a notification message');
                return;
            }

            // Create notification data
            const notificationData = {
                title: "Admin Notification",
                message: selectedUser.notificationMessage,
                recipient: selectedUser.id,
                recipientType: "user"
            };

            // Send notification using the notification service
            await fetch('/api/notifications/admin/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(notificationData)
            });

            showSuccess('Notification sent successfully');
            setNotificationDialogOpen(false);
            setSelectedUser(prev => ({ ...prev, notificationMessage: '' }));
        } catch (error) {
            handleError(error, 'Failed to send notification');
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

    const fetchUserEnrollments = async (userId) => {
        try {
            setEnrollmentsLoading(true);
            const enrollments = await adminService.getUserEnrollments(userId);
            const active = enrollments.filter(e => e.enrollment_type === 'active');
            const historical = enrollments.filter(e => e.enrollment_type === 'historical');
            setUserEnrollments({ active, historical });
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

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
                User Management
            </Typography>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={5}>
                        <TextField
                            fullWidth
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiInputBase-root': {
                                    height: { xs: '48px', sm: '40px' }
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={selectedRole}
                                label="Role"
                                onChange={(e) => setSelectedRole(e.target.value)}
                                MenuProps={{
                                    sx: { zIndex: 1500 }
                                }}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        height: { xs: '48px', sm: '40px' }
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
                    </Grid>
                </Grid>
            </Paper>

            {/* Users Table with Pagination */}
            <TableContainer component={Paper} sx={{
                overflowX: 'auto',
                '& .MuiTable-root': {
                    minWidth: { xs: '600px', sm: 'auto' }
                }
            }}>
                <Table>
                    <TableHead>
                        <TableRow key="header">
                            <TableCell sx={{
                                minWidth: { xs: '120px', sm: 'auto' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                User
                            </TableCell>
                            <TableCell sx={{
                                minWidth: { xs: '80px', sm: 'auto' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Role
                            </TableCell>
                            <TableCell sx={{
                                minWidth: { xs: '80px', sm: 'auto' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Status
                            </TableCell>
                            <TableCell sx={{
                                minWidth: { xs: '100px', sm: 'auto' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Created
                            </TableCell>
                            <TableCell sx={{
                                minWidth: { xs: '100px', sm: 'auto' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Last Updated
                            </TableCell>
                            <TableCell align="right" sx={{
                                minWidth: { xs: '100px', sm: 'auto' },
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow key="loading">
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow key="error">
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Alert severity="error">{error}</Alert>
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow key="empty">
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography color="text.secondary">No users found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell sx={{
                                        minWidth: { xs: '120px', sm: 'auto' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <PersonIcon color="action" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" sx={{
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {user.first_name} {user.last_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{
                                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{
                                        minWidth: { xs: '80px', sm: 'auto' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            {getRoleIcon(user.role)}
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    textTransform: "capitalize",
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                }}
                                            >
                                                {user.role}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{
                                        minWidth: { xs: '80px', sm: 'auto' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}>
                                        {getStatusChip(user.status)}
                                    </TableCell>
                                    <TableCell sx={{
                                        minWidth: { xs: '100px', sm: 'auto' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell sx={{
                                        minWidth: { xs: '100px', sm: 'auto' },
                                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                    }}>
                                        {new Date(user.updated_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="More Actions">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, user)}
                                            >
                                                <MoreIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
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
                />
            </TableContainer>

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

            {/* Role Update Dialog */}
            <Dialog
                open={roleDialogOpen}
                onClose={() => setRoleDialogOpen(false)}
                disableEnforceFocus
                keepMounted={false}
                sx={{ zIndex: 1450 }}
            >
                <DialogTitle>Change User Role</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>New Role</InputLabel>
                        <Select
                            value={selectedUser?.role}
                            label="New Role"
                            onChange={(e) => {
                                setSelectedUser((prev) => ({ ...prev, role: e.target.value }));
                            }}
                            MenuProps={{
                                sx: { zIndex: 1500 }
                            }}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="student">Student</MenuItem>
                            <MenuItem value="instructor">Instructor</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleRoleUpdate}
                        disabled={updatingRole}
                    >
                        {updatingRole ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Status Update Dialog */}
            <Dialog
                open={statusDialogOpen}
                onClose={() => setStatusDialogOpen(false)}
                disableEnforceFocus
                keepMounted={false}
                sx={{ zIndex: 1450 }}
            >
                <DialogTitle>Change User Status</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>New Status</InputLabel>
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
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="suspended">Suspended</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleStatusUpdate}
                        disabled={updatingStatus}
                    >
                        {updatingStatus ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Password Reset Dialog */}
            <Dialog
                open={passwordDialogOpen}
                onClose={() => {
                    setPasswordDialogOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                }}
                disableEnforceFocus
                keepMounted={false}
                sx={{ zIndex: 1450 }}
            >
                <DialogTitle>Reset User Password</DialogTitle>
                <DialogContent>
                    {passwordError && (
                        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                            {passwordError}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        sx={{ mt: 2 }}
                        error={!!passwordError}
                    />
                    <TextField
                        fullWidth
                        type="password"
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        sx={{ mt: 2 }}
                        error={!!passwordError}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setPasswordDialogOpen(false);
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                    }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handlePasswordReset}
                        disabled={loading}
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                disableEnforceFocus
                keepMounted={false}
                sx={{ zIndex: 1450 }}
            >
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this user? This action cannot be
                        undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            handleDeleteUser(selectedUser.id);
                            setDeleteDialogOpen(false);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Profile Dialog */}
            <Dialog
                open={profileDialogOpen}
                onClose={() => setProfileDialogOpen(false)}
                maxWidth="md"
                fullWidth
                disableEnforceFocus
                keepMounted={false}
                sx={{ zIndex: 1450 }}
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
                                                                : activity.action === "profile_update"
                                                                    ? "info.main"
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
                                                                        : activity.action === "profile_update"
                                                                            ? "info.main"
                                                                            : "grey.500",
                                                        }}
                                                    >
                                                        {activity.action === "role_update" ? (
                                                            <AdminIcon />
                                                        ) : activity.action === "status_update" ? (
                                                            <BlockIcon />
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
                                                            sx={{ fontWeight: "medium" }}
                                                        >
                                                            {activity.action.replace("_", " ").toUpperCase()}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box component="span" sx={{ display: "block" }}>
                                                            <Typography
                                                                component="span"
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                {new Date(activity.created_at).toLocaleString()}
                                                            </Typography>
                                                            {activity.details && (
                                                                <Box
                                                                    component="span"
                                                                    sx={{ display: "block", mt: 0.5 }}
                                                                >
                                                                    {Object.entries(activity.details).map(
                                                                        ([key, value], index) => (
                                                                            <Box
                                                                                key={`${activity.id}-${key}-${index}`}
                                                                                component="span"
                                                                                sx={{ display: "flex", gap: 1 }}
                                                                            >
                                                                                <Typography
                                                                                    component="span"
                                                                                    sx={{ fontWeight: "bold" }}
                                                                                >
                                                                                    {key.replace("_", " ")}:
                                                                                </Typography>
                                                                                <Typography component="span">
                                                                                    {value}
                                                                                </Typography>
                                                                            </Box>
                                                                        )
                                                                    )}
                                                                </Box>
                                                            )}
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
                                                                        {enrollment.session_date ?
                                                                            new Date(enrollment.session_date).toLocaleDateString() :
                                                                            'N/A'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={enrollment.enrollment_status}
                                                                            color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
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
                                                                        {enrollment.session_date ? new Date(enrollment.session_date).toLocaleDateString() : 'N/A'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={enrollment.enrollment_status}
                                                                            color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                                            size="small"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() :
                                                                            enrollment.archived_at ? new Date(enrollment.archived_at).toLocaleDateString() : 'N/A'}
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

            {/* Notification Dialog */}
            <Dialog
                open={notificationDialogOpen}
                onClose={() => {
                    setNotificationDialogOpen(false);
                }}
                disableEnforceFocus
                keepMounted={false}
                sx={{ zIndex: 1450 }}
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
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Message"
                            placeholder="Enter notification message..."
                            value={selectedUser?.notificationMessage || ''}
                            sx={{ mt: 2 }}
                            onChange={(e) => {
                                setSelectedUser(prev => ({
                                    ...prev,
                                    notificationMessage: e.target.value
                                }));
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setNotificationDialogOpen(false);
                        setSelectedUser(prev => ({ ...prev, notificationMessage: '' }));
                    }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSendNotification}
                        disabled={!selectedUser?.id || !selectedUser?.notificationMessage?.trim()}
                    >
                        Send
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

            {/* Enrollment Dialog */}
            <Dialog
                open={enrollmentDialogOpen}
                onClose={handleCloseEnrollmentDialog}
                maxWidth="lg"
                fullWidth
                sx={{ zIndex: 1450 }}
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
                                                {enrollment.session_date ? new Date(enrollment.session_date).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={enrollment.enrollment_status}
                                                    color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
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
                                                {enrollment.session_date ? new Date(enrollment.session_date).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={enrollment.enrollment_status}
                                                    color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() :
                                                    enrollment.archived_at ? new Date(enrollment.archived_at).toLocaleDateString() : 'N/A'}
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
