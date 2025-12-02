import React, { useState, useCallback, useEffect } from "react";
import ClassStudents from "./ClassStudents";
import classService from "../../services/classService";
import adminService from "../../services/adminService";
import enrollmentService from "../../services/enrollmentService"; // Added import for enrollmentService
import { useNotifications } from '../../utils/notificationUtils';
import { styled } from '@mui/material/styles';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Queue as QueueIcon,
  Update as UpdateIcon,
  Add as AddIcon,
  CheckCircle,
  History as HistoryIcon,
} from "@mui/icons-material";

// iOS-specific styled Dialog for better mobile support
const IOSDialog = styled(Dialog)(({ theme }) => ({
  '@media screen and (-webkit-min-device-pixel-ratio: 0)': {
    '& .MuiDialog-paper': {
      maxHeight: '90vh !important',
      margin: '20px !important',
      top: '5vh !important',
      overflow: 'hidden !important',
      WebkitOverflowScrolling: 'touch',
    },
    '& .MuiDialogContent-root': {
      maxHeight: 'calc(90vh - 200px) !important',
      paddingBottom: '120px !important',
      WebkitOverflowScrolling: 'touch',
    },
    '& .MuiDialogActions-root': {
      minHeight: '100px !important',
      position: 'fixed !important',
      bottom: '0 !important',
      left: '0 !important',
      right: '0 !important',
      backgroundColor: theme.palette.background.paper,
      borderTop: '1px solid',
      borderColor: theme.palette.divider,
      paddingTop: '16px !important',
      paddingBottom: '16px !important',
      zIndex: '9999 !important',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.1) !important',
    }
  }
}));

// Add a helper function for date formatting
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Helper function to format time from 24-hour to 12-hour format
const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  try {
    // Handle both "HH:mm" and "HH:mm:ss" formats
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeString;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
  } catch (error) {
    return timeString;
  }
};

// Helper function to format date range for sessions
const formatSessionDate = (startDate, endDate) => {
  if (!startDate) return 'N/A';
  try {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return 'Invalid Date';

    const end = endDate ? new Date(endDate) : null;

    const startFormatted = start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // If no end date or same day, return just the start date
    if (!end || isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
      return startFormatted;
    }

    // If different dates, show range
    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
    });

    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({
    title: "",
    instructor_id: "",
    description: "",
    dates: [{ date: "", end_date: "", start_time: "", end_time: "", location: "", capacity: "", duration: "" }],
    price: "",
  });
  const [sessionsClass, setSessionsClass] = useState(null);
  const [statusClass, setStatusClass] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [allEnrollmentsClass, setAllEnrollmentsClass] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedClassForMenu, setSelectedClassForMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useNotifications();
  const [deletedSessionIds, setDeletedSessionIds] = useState([]);

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch instructors on component mount
  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllClasses();
      setClasses(data);
    } catch (error) {
      handleError(error, "Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await adminService.getInstructors();
      setInstructors(response || []);  // Remove .data since response is already the array
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
      setInstructors([]);  // Set empty array on error
      handleError(error, "Failed to fetch instructors");
    }
  };

  const handleAdd = () => {
    setError(null);
    setEditClass(null);
    setForm({
      title: "",
      instructor_id: "",
      description: "",
      dates: [{ date: "", end_date: "", start_time: "", end_time: "", location: "", location_type: "in-person", capacity: "", duration: "" }],
      price: "",
    });
    setShowModal(true);
  };

  const handleEdit = async (cls) => {
    try {
      setError(null);
      setLoading(true);
      // Fetch complete class details including sessions using admin endpoint
      const response = await adminService.getClassDetails(cls.id);
      const classDetails = response;  // Remove .data since response is already the class details

      if (!classDetails) {
        console.error('No class details found in response');
        throw new Error('Class details not found');
      }

      // Initialize with empty dates array if no sessions exist
      let formattedDates = [{ date: "", end_date: "", start_time: "", end_time: "", location: "", location_type: "", capacity: "", instructor_id: "", duration: "" }];

      // Only try to format dates if sessions exist and are in the expected format
      if (Array.isArray(classDetails.sessions) && classDetails.sessions.length > 0) {
        formattedDates = classDetails.sessions.map(session => {
          console.log('Loading session for edit:', session.id, 'duration:', session.duration);
          return {
            id: session.id,
            date: session.session_date ? new Date(session.session_date).toISOString().split('T')[0] : "",
            end_date: session.end_date ? new Date(session.end_date).toISOString().split('T')[0] : "",
            start_time: session.start_time ? session.start_time.substring(0, 5) : "",
            end_time: session.end_time ? session.end_time.substring(0, 5) : "",
            location: session.location_details || "",
            location_type: session.location_type || "in-person",
            capacity: session.capacity || "",
            instructor_id: session.instructor_id || "",
            duration: session.duration || ""
          };
        });
      }

      setForm({
        ...classDetails,
        description: classDetails.description || "",
        dates: formattedDates,
        price: classDetails.price || "",
        // Remove enrolled from form data since it's managed by the system
        enrolled: undefined
      });
      setEditClass({
        ...classDetails,
        enrolled_count: classDetails.total_enrollments || 0  // Use total_enrollments from the query
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error in handleEdit:', error);
      handleError(error, "Failed to fetch class details");
      handleCloseModal(); // Close modal on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      if (window.confirm("Are you sure you want to delete this class?")) {
        setLoading(true);
        await classService.deleteClass(id);
        await fetchClasses(); // Refresh the list
        showSuccess("Class deleted successfully");
      }
    } catch (error) {
      handleError(error, "Failed to delete class");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'date') {
      // Convert the date to YYYY-MM-DD format
      const date = new Date(value);
      const formattedDate = date.toISOString().split('T')[0];
      setForm({ ...form, [name]: formattedDate });
    } else if (name === 'start_time' || name === 'end_time') {
      // Ensure time is in HH:mm format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (value === '' || timeRegex.test(value)) {
        setForm({ ...form, [name]: value });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAddDate = () => {
    setForm(prev => ({
      ...prev,
      dates: [...prev.dates, { date: "", end_date: "", start_time: "", end_time: "", location: "", capacity: "", instructor_id: "", duration: "" }]
    }));
  };

  const handleRemoveDate = (index) => {
    if (!window.confirm("Are you sure you want to delete this session?")) return;
    setForm(prev => {
      const removed = prev.dates[index];
      if (removed && removed.id) {
        setDeletedSessionIds(ids => [...ids, removed.id]);
      }
      return {
        ...prev,
        dates: prev.dates.filter((_, i) => i !== index)
      };
    });
  };

  const handleDateChange = (index, field, value) => {
    setForm(prev => {
      const updatedDates = prev.dates.map((date, i) => {
        if (i === index) {
          const updatedDate = { ...date, [field]: value };

          // If start date is changed, automatically set end date to the same date if it's currently empty or different
          if (field === 'date' && value) {
            const currentEndDate = date.end_date;
            if (!currentEndDate || currentEndDate !== value) {
              updatedDate.end_date = value;
            }
          }

          return updatedDate;
        }
        return date;
      });

      return {
        ...prev,
        dates: updatedDates
      };
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!form.title || !form.description || !form.price || form.dates.length === 0) {
        throw new Error("Please fill in all required fields");
      }

      // Validate dates
      for (const date of form.dates) {
        if (!date.date || !date.end_date || !date.start_time || !date.end_time ||
          !date.location || !date.capacity || !date.instructor_id) {
          throw new Error("Please fill in all date fields including location, capacity, and instructor");
        }
        // Duration is optional, so we don't validate it

        // Validate that end_date is not before start date
        const startDate = new Date(date.date);
        const endDate = new Date(date.end_date);
        if (endDate < startDate) {
          throw new Error("End date cannot be before start date");
        }

        // Validate capacity is a positive number
        if (isNaN(Number(date.capacity)) || Number(date.capacity) <= 0) {
          throw new Error("Capacity must be a positive number for each session");
        }
      }

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      for (const date of form.dates) {
        if (!timeRegex.test(date.start_time) || !timeRegex.test(date.end_time)) {
          throw new Error("Invalid time format. Use HH:mm format (e.g., 09:30)");
        }
      }

      // Validate price
      if (isNaN(Number(form.price)) || Number(form.price) < 0) {
        throw new Error("Price must be a non-negative number");
      }

      // Format the data before sending
      const formattedData = {
        ...form,
        price: Number(form.price),
        deletedSessionIds: deletedSessionIds
      };

      // Debug: Log the data being sent
      console.log('Saving class with dates:', formattedData.dates);

      if (editClass) {
        await classService.updateClass(editClass.id, formattedData);
        showSuccess("Class updated successfully");
      } else {
        await classService.createClass(formattedData);
        showSuccess("Class created successfully");
      }
      await fetchClasses(); // Refresh the list
      handleCloseModal();
      setDeletedSessionIds([]);
    } catch (error) {
      handleError(error, "Failed to save class");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSessions = async (cls) => {
    try {
      setLoading(true);
      const sessions = await adminService.getClassSessions(cls.id);
      setSessionsClass({ ...cls, sessions });
    } catch (error) {
      handleError(error, "Failed to fetch class sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllEnrollments = async (cls) => {
    try {
      setLoading(true);
      const enrollments = await adminService.getAllEnrollments(cls.id);
      setAllEnrollmentsClass({ ...cls, enrollments });
    } catch (error) {
      handleError(error, "Failed to fetch all enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (cls) => {
    setStatusClass(cls);
    setNewStatus(cls.status || "scheduled");
  };

  const handleStatusSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await classService.updateClassStatus(statusClass.id, newStatus);
      await fetchClasses(); // Refresh the list
      showSuccess("Class status updated successfully");
      setStatusClass(null);
      setNewStatus("");
    } catch (error) {
      handleError(error, "Failed to update class status");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = (cls) => {
    setSelectedClass(cls);
  };

  const handleCloseStudents = () => {
    setSelectedClass(null);
  };

  const handleMenuClick = (event, cls) => {
    setAnchorEl(event.currentTarget);
    setSelectedClassForMenu(cls);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClassForMenu(null);
  };

  const handleMenuAction = (action) => {
    if (selectedClassForMenu) {
      switch (action) {
        case "edit":
          handleEdit(selectedClassForMenu);
          break;
        case "sessions":
          handleViewSessions(selectedClassForMenu);
          break;
        case "status":
          handleUpdateStatus(selectedClassForMenu);
          break;
        case "enrollments":
          handleViewAllEnrollments(selectedClassForMenu);
          break;
        case "viewStudents":
          handleViewStudents(selectedClassForMenu);
          break;
        case "delete":
          handleDelete(selectedClassForMenu.id);
          break;
        default:
          break;
      }
    }
    handleMenuClose();
  };

  const handleError = (error, customMessage = 'An error occurred') => {
    console.error(error);
    setError(error.message || customMessage);
    // Only show notification if dialog is not open (to avoid duplicate error displays)
    if (!showModal) {
      showError(error.message || customMessage);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError(null); // Clear any errors when closing modal
  };

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
            mb: 1
          }}
        >
          Class Management
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: '#6b7280',
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Manage classes, sessions, and enrollments
        </Typography>
      </Box>

      {error && !showModal && (
        <Box sx={{ px: { xs: 2, sm: 3 }, mb: 3 }}>
          <Alert severity="error" sx={{ borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Add Class Button */}
      <Box sx={{
        maxWidth: { xs: '100%', sm: '1200px' },
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        mb: 4
      }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAdd}
          disabled={loading}
          startIcon={<AddIcon />}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Add New Class
        </Button>
      </Box>

      {/* Modern Class Cards */}
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
        ) : classes.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
            <EventIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No classes found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first class to get started
            </Typography>
          </Paper>
        ) : (
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'row', sm: 'row', md: 'column' },
            flexWrap: { xs: 'wrap', sm: 'wrap', md: 'nowrap' },
            gap: { xs: 2, sm: 2.5, md: 2 },
            justifyContent: { xs: 'center', sm: 'flex-start', md: 'stretch' },
            width: '100%'
          }}>
            {classes.map((cls) => (
              <Paper key={cls.id} sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: '16px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s ease-in-out',
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 10px)', md: '0 0 auto' },
                minWidth: { xs: '280px', sm: '250px', md: 'auto' },
                maxWidth: { xs: '100%', sm: 'calc(50% - 10px)', md: '100%' },
                width: { xs: '100%', sm: 'auto', md: '100%' },
                '&:hover': {
                  boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transform: 'translateY(-1px)',
                  borderColor: '#3b82f6'
                }
              }}>
                {/* Class Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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
                      {cls.title}
                    </Typography>
                  </Box>
                  <Tooltip title="More Actions">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, cls)}
                      sx={{
                        color: '#6b7280',
                        '&:hover': { color: '#3b82f6' }
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Class Details */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    onClick={() => handleViewSessions(cls)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        '& .MuiSvgIcon-root': {
                          color: '#3b82f6'
                        },
                        '& .MuiTypography-root': {
                          color: '#3b82f6'
                        }
                      },
                      transition: 'color 0.2s ease-in-out'
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#374151',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      {cls.total_sessions || 0} sessions
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => handleViewAllEnrollments(cls)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        '& .MuiSvgIcon-root': {
                          color: '#3b82f6'
                        },
                        '& .MuiTypography-root': {
                          color: '#3b82f6'
                        }
                      },
                      transition: 'color 0.2s ease-in-out'
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#374151',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      {cls.total_enrollments || 0} enrollments
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        disableScrollLock={false}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            borderRadius: '12px',
            minWidth: 200,
            maxWidth: 'calc(100vw - 24px)',
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
              fontSize: '0.875rem'
            }
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            style: {
              maxHeight: '80vh',
              overflow: 'auto'
            }
          }
        }}
      >
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Class</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('viewStudents')}>
          <ListItemIcon>
            <ScheduleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Sessions</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('enrollments')}>
          <ListItemIcon>
            <PeopleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View All Enrollments</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Class</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Class Modal */}
      {showModal && (
        <IOSDialog
          open={showModal}
          onClose={() => !loading && handleCloseModal()}
          maxWidth="lg"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              maxHeight: '100vh',
              height: '100vh',
              margin: 0,
              position: 'relative',
              top: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
              borderRadius: 0,
              // iOS Safari specific fixes
              WebkitOverflowScrolling: 'touch',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ flexShrink: 0 }}>
            {editClass ? "Edit Class" : "Add New Class"}
          </DialogTitle>
          {error && (
            <Box sx={{ px: 3, pt: 1, flexShrink: 0 }}>
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Box>
          )}
          <DialogContent sx={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            maxHeight: 'calc(100vh - 120px)',
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2 },
            // iOS Safari specific
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              width: '4px'
            }
          }}>
            <Box sx={{
              mt: { xs: 0.5, sm: 2 },
              mb: { xs: 4, sm: 2 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, sm: 2 }
            }}>
              <TextField
                name="title"
                label="Class Title"
                value={form.title}
                onChange={handleChange}
                fullWidth
                required
              />
              <TextField
                name="description"
                label="Description"
                value={form.description}
                onChange={handleChange}
                multiline
                rows={4}
                fullWidth
                required
              />
              <TextField
                name="price"
                label="Price"
                type="number"
                value={form.price}
                onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
              <Typography variant="subtitle1" sx={{ mt: { xs: 1, sm: 2 } }}>
                Class Dates and Times
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: { xs: 1, sm: 2 }, display: 'block' }}>
                For one-day classes (like CPR), set the same date for both start and end dates.
              </Typography>
              {form.dates.map((date, index) => {
                return (
                  <Box key={index} sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: { xs: 1, sm: 2 },
                    mb: { xs: 1, sm: 2 }
                  }}>
                    <Stack
                      direction="column"
                      spacing={1}
                      alignItems="stretch"
                    >
                      <TextField
                        label="Date"
                        type="date"
                        value={date.date}
                        onChange={(e) => handleDateChange(index, 'date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required
                        fullWidth
                      />
                      <Tooltip title="For one-day classes, set the same date as the start date" placement="top" arrow>
                        <TextField
                          label="End Date"
                          type="date"
                          value={date.end_date}
                          onChange={(e) => handleDateChange(index, 'end_date', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          required
                          fullWidth
                        />
                      </Tooltip>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={date.start_time}
                        onChange={(e) => handleDateChange(index, 'start_time', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        required
                        fullWidth
                      />
                      <TextField
                        label="End Time"
                        type="time"
                        value={date.end_time}
                        onChange={(e) => handleDateChange(index, 'end_time', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ step: 300 }}
                        required
                        fullWidth
                      />
                      <FormControl fullWidth required>
                        <InputLabel>Location Type</InputLabel>
                        <Select
                          value={date.location_type || "in-person"}
                          onChange={(e) => handleDateChange(index, 'location_type', e.target.value)}
                          label="Location Type"
                          MenuProps={{
                            sx: { zIndex: 1500 }
                          }}
                        >
                          <MenuItem value="in-person">In-Person</MenuItem>
                          <MenuItem value="zoom">Zoom (Online)</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Location"
                        value={date.location}
                        onChange={(e) => handleDateChange(index, 'location', e.target.value)}
                        required
                        fullWidth
                        helperText={date.location_type === 'zoom' ? 'Enter Zoom link or meeting details' : 'Enter physical address or room number'}
                      />
                      <TextField
                        label="Capacity"
                        type="number"
                        value={date.capacity}
                        onChange={(e) => handleDateChange(index, 'capacity', e.target.value)}
                        required
                        fullWidth
                        inputProps={{ min: 1 }}
                      />
                      <TextField
                        label="Duration"
                        value={date.duration || ""}
                        onChange={(e) => handleDateChange(index, 'duration', e.target.value)}
                        placeholder="e.g., 4 weeks, 3 months, 1 day"
                        fullWidth
                        helperText="Enter the duration of this session (optional)"
                      />
                      <FormControl fullWidth required>
                        <InputLabel>Instructor</InputLabel>
                        <Select
                          value={date.instructor_id || ""}
                          onChange={(e) => handleDateChange(index, 'instructor_id', e.target.value)}
                          label="Instructor"
                          MenuProps={{
                            sx: { zIndex: 1500 }
                          }}
                        >
                          {Array.isArray(instructors) && instructors.map((instructor) => (
                            <MenuItem key={instructor.id} value={instructor.id}>
                              {instructor.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {form.dates.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveDate(index)}
                          size="small"
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Stack>
                  </Box>
                );
              })}
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddDate}
                variant="outlined"
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  mb: { xs: 2, sm: 1 }
                }}
              >
                Add Another Date
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{
            flexShrink: 0,
            px: { xs: 2, sm: 3 },
            py: { xs: 1, sm: 1 },
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'stretch', sm: 'center' },
            alignItems: { xs: 'stretch', sm: 'center' },
            minHeight: { xs: '60px', sm: 'auto' },
            position: { xs: 'fixed', sm: 'sticky' },
            bottom: { xs: 0, sm: 0 },
            left: { xs: 0, sm: 'auto' },
            right: { xs: 0, sm: 'auto' },
            zIndex: { xs: 9999, sm: 10 },
            backgroundColor: 'background.paper',
            borderTop: { xs: '1px solid', sm: 'none' },
            borderColor: 'divider',
            boxShadow: { xs: '0 -2px 8px rgba(0,0,0,0.1)', sm: 'none' },
            // iOS Safari specific fixes
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            '& .MuiButton-root': {
              minWidth: { xs: '100%', sm: '120px' },
              height: { xs: '40px', sm: 'auto' },
              fontSize: { xs: '14px', sm: '14px' },
              marginBottom: { xs: '4px', sm: '0px' },
              borderRadius: { xs: '8px', sm: '4px' },
              fontWeight: { xs: 500, sm: 500 },
              '&:last-child': {
                marginBottom: { xs: '0px', sm: '0px' }
              }
            }
          }}>
            <Button onClick={handleCloseModal} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Save"}
            </Button>
          </DialogActions>
        </IOSDialog>
      )}

      {/* View Students Modal */}
      <Dialog
        open={!!selectedClass}
        onClose={handleCloseStudents}
        maxWidth="lg"
        fullWidth
        sx={{
          zIndex: 1200,
          '& .MuiDialog-paper': {
            maxHeight: '90vh',
            margin: '20px',
            position: 'relative',
            top: '5vh'
          }
        }}
      >
        <DialogContent>
          {selectedClass && (
            <ClassStudents
              classId={selectedClass.id}
              className={selectedClass.title}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modern Sessions Dialog */}
      {sessionsClass && (
        <Dialog
          open={!!sessionsClass}
          onClose={() => setSessionsClass(null)}
          maxWidth="md"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              borderRadius: '16px',
              maxHeight: '90vh',
              margin: '20px'
            }
          }}
        >
          <DialogTitle sx={{
            pb: 2,
            borderBottom: '1px solid #e5e7eb'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ScheduleIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                  Class Sessions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sessionsClass.title}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={40} />
              </Box>
            ) : sessionsClass.sessions?.length > 0 ? (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 2
              }}>
                {sessionsClass.sessions.map((session, idx) => (
                  <Paper key={idx} sx={{
                    p: 3,
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                      borderColor: '#3b82f6'
                    }
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', mb: 0.5 }}>
                          {formatSessionDate(session.session_date, session.end_date)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#374151',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            <ScheduleIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={session.status || 'Scheduled'}
                        color={session.status === 'completed' ? 'success' :
                          session.status === 'cancelled' ? 'error' :
                            'primary'}
                        size="small"
                        sx={{ fontSize: '0.75rem', ml: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {session.session_location || session.location_details || 'TBA'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                      <Typography variant="body2" sx={{ color: '#374151' }}>
                        {session.enrolled_count || 0} / {session.capacity} enrolled
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <ScheduleIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No sessions found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This class doesn't have any sessions yet
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setSessionsClass(null)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modern Status Update Dialog */}
      {statusClass && (
        <Dialog
          open={!!statusClass}
          onClose={() => setStatusClass(null)}
          maxWidth="sm"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              borderRadius: '16px',
              maxHeight: '90vh',
              margin: '20px'
            }
          }}
        >
          <DialogTitle sx={{
            pb: 2,
            borderBottom: '1px solid #e5e7eb'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UpdateIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                  Update Class Status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statusClass.title}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <FormControl fullWidth>
              <InputLabel sx={{
                '&.Mui-focused': { color: '#3b82f6' }
              }}>Status</InputLabel>
              <Select
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value)}
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
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setStatusClass(null)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusSave}
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modern All Enrollments Dialog */}
      {allEnrollmentsClass && (
        <Dialog
          open={!!allEnrollmentsClass}
          onClose={() => setAllEnrollmentsClass(null)}
          maxWidth="lg"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              borderRadius: '16px',
              maxHeight: '90vh',
              margin: '20px'
            }
          }}
        >
          <DialogTitle sx={{
            pb: 2,
            borderBottom: '1px solid #e5e7eb'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PeopleIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                  Class Enrollments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {allEnrollmentsClass.title}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={40} />
              </Box>
            ) : (
              <Box>
                {/* Active Enrollments */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{
                    mb: 2,
                    color: '#3b82f6',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <CheckCircle sx={{ fontSize: 20 }} />
                    Active Enrollments ({allEnrollmentsClass.enrollments?.active?.length || 0})
                  </Typography>
                  {allEnrollmentsClass.enrollments?.active?.length > 0 ? (
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                      gap: 2
                    }}>
                      {allEnrollmentsClass.enrollments.active.map((enrollment) => (
                        <Paper key={enrollment.enrollment_id} sx={{
                          p: 3,
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                            borderColor: '#3b82f6'
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              bgcolor: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {enrollment.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {enrollment.email}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Chip
                              label={enrollment.enrollment_status}
                              color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                              size="small"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Session: {enrollment.session_date ? new Date(enrollment.session_date).toLocaleDateString() : 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
                      <PeopleIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        No active enrollments
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Students haven't enrolled in this class yet
                      </Typography>
                    </Paper>
                  )}
                </Box>

                {/* Historical Enrollments */}
                <Box>
                  <Typography variant="h6" sx={{
                    mb: 2,
                    color: '#6b7280',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <HistoryIcon sx={{ fontSize: 20 }} />
                    Historical Enrollments ({allEnrollmentsClass.enrollments?.historical?.length || 0})
                  </Typography>
                  {allEnrollmentsClass.enrollments?.historical?.length > 0 ? (
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                      gap: 2
                    }}>
                      {allEnrollmentsClass.enrollments.historical.map((enrollment) => (
                        <Paper key={enrollment.enrollment_id} sx={{
                          p: 3,
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.1)',
                            borderColor: '#6b7280'
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              bgcolor: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {enrollment.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {enrollment.email}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Chip
                              label={enrollment.enrollment_status}
                              color={enrollment.enrollment_status === 'approved' ? 'success' : 'warning'}
                              size="small"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Session: {enrollment.session_date ? new Date(enrollment.session_date).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Completed: {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() :
                                enrollment.archived_at ? new Date(enrollment.archived_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                          {enrollment.completion_reason || enrollment.archived_reason ? (
                            <Tooltip title={enrollment.completion_reason || enrollment.archived_reason}>
                              <Typography variant="body2" color="text.secondary" sx={{
                                fontSize: '0.75rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                Reason: {(enrollment.completion_reason || enrollment.archived_reason).substring(0, 30)}...
                              </Typography>
                            </Tooltip>
                          ) : null}
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
                      <HistoryIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        No historical enrollments
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No completed or archived enrollments for this class
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setAllEnrollmentsClass(null)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ClassManagement;
