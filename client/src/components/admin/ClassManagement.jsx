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

function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [form, setForm] = useState({
    title: "",
    instructor_id: "",
    description: "",
    dates: [{ date: "", end_date: "", start_time: "", end_time: "", location: "", capacity: "" }],
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
      const data = await classService.getAllClasses();
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
      dates: [{ date: "", end_date: "", start_time: "", end_time: "", location: "", capacity: "" }],
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
      let formattedDates = [{ date: "", end_date: "", start_time: "", end_time: "", location: "", capacity: "" }];

      // Only try to format dates if sessions exist and are in the expected format
      if (Array.isArray(classDetails.sessions) && classDetails.sessions.length > 0) {
        formattedDates = classDetails.sessions.map(session => ({
          id: session.id,
          date: session.session_date ? new Date(session.session_date).toISOString().split('T')[0] : "",
          end_date: session.end_date ? new Date(session.end_date).toISOString().split('T')[0] : "",
          start_time: session.start_time ? session.start_time.substring(0, 5) : "",
          end_time: session.end_time ? session.end_time.substring(0, 5) : "",
          location: session.location_details || "",
          capacity: session.capacity || ""
        }));
      }

      setForm({
        ...classDetails,
        instructor_id: classDetails.instructor_id || "",
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
      dates: [...prev.dates, { date: "", end_date: "", start_time: "", end_time: "", location: "", capacity: "" }]
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
      if (!form.title || !form.instructor_id || !form.description ||
        !form.price || form.dates.length === 0) {
        throw new Error("Please fill in all required fields");
      }

      // Validate dates
      for (const date of form.dates) {
        if (!date.date || !date.end_date || !date.start_time || !date.end_time ||
          !date.location || !date.capacity) {
          throw new Error("Please fill in all date fields including location and capacity");
        }

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
    <Box className="class-management">
      {error && !showModal && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h5" component="h2" gutterBottom>
        Class Management
      </Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={handleAdd}
        sx={{ mb: 2 }}
        disabled={loading}
      >
        Add Class
      </Button>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <PersonIcon color="action" fontSize="small" />
                      {cls.title}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={<Typography sx={{ fontSize: '1rem', fontWeight: 400 }}>More Actions</Typography>} placement="top" arrow sx={{ '& .MuiTooltip-tooltip': { fontSize: '1rem', fontWeight: 400 } }}>
                      <IconButton
                        color="primary"
                        onClick={(e) => handleMenuClick(e, cls)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleMenuClose}
                      PaperProps={{
                        elevation: 0,
                        sx: {
                          overflow: 'visible',
                          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                          mt: 1.5,
                          '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1,
                          },
                        },
                      }}
                      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                      <MenuItem onClick={() => handleMenuAction('edit')}>
                        <ListItemIcon>
                          <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Edit Class</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => handleMenuAction('enrollments')}>
                        <ListItemIcon>
                          <PeopleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>View All Enrollments</ListItemText>
                      </MenuItem>
                    </Menu>
                    <Tooltip title={<Typography sx={{ fontSize: '1rem', fontWeight: 400 }}>View Students</Typography>} placement="top" arrow sx={{ '& .MuiTooltip-tooltip': { fontSize: '1rem', fontWeight: 400 } }}>
                      <IconButton
                        color="info"
                        onClick={() => handleViewStudents(cls)}
                        size="small"
                      >
                        <PeopleIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={<Typography sx={{ fontSize: '1rem', fontWeight: 400 }}>Delete Class</Typography>} placement="top" arrow sx={{ '& .MuiTooltip-tooltip': { fontSize: '1rem', fontWeight: 400 } }}>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(cls.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Class Modal */}
      {showModal && (
        <IOSDialog
          open={showModal}
          onClose={() => !loading && handleCloseModal()}
          maxWidth="md"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              maxHeight: { xs: '90vh', sm: '90vh' },
              margin: { xs: '20px', sm: '20px' },
              position: 'relative',
              top: { xs: '5vh', sm: '5vh' },
              display: 'flex',
              flexDirection: 'column',
              minHeight: { xs: 'auto', sm: 'auto' },
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
            maxHeight: { xs: 'calc(90vh - 200px)', sm: '70vh' },
            px: { xs: 2, sm: 3 },
            pb: { xs: '160px', sm: 3 },
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
              <FormControl fullWidth required>
                <InputLabel>Instructor</InputLabel>
                <Select
                  name="instructor_id"
                  value={form.instructor_id}
                  onChange={handleChange}
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
              <TextField
                name="description"
                label="Description"
                value={form.description}
                onChange={handleChange}
                multiline
                rows={{ xs: 2, sm: 4 }}
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
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={{ xs: 1, sm: 2 }}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
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
                      <TextField
                        label="Location"
                        value={date.location}
                        onChange={(e) => handleDateChange(index, 'location', e.target.value)}
                        required
                        fullWidth
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
                      {form.dates.length > 1 && (
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveDate(index)}
                          size="small"
                          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
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
            py: { xs: 2, sm: 1 },
            gap: { xs: 2, sm: 1 },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            alignItems: { xs: 'stretch', sm: 'center' },
            minHeight: { xs: '80px', sm: 'auto' },
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
              minWidth: { xs: '100%', sm: 'auto' },
              height: { xs: '48px', sm: 'auto' },
              fontSize: { xs: '16px', sm: '14px' },
              marginBottom: { xs: '8px', sm: '0px' },
              borderRadius: { xs: '8px', sm: '4px' },
              fontWeight: { xs: 600, sm: 500 },
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

      {sessionsClass && (
        <Dialog
          open={!!sessionsClass}
          onClose={() => setSessionsClass(null)}
          maxWidth="sm"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              maxHeight: '90vh',
              margin: '20px',
              position: 'relative',
              top: '5vh'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon color="primary" />
              Sessions for {sessionsClass.title}
            </Box>
          </DialogTitle>
          <DialogContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : sessionsClass.sessions?.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessionsClass.sessions.map((session, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {new Date(session.session_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {session.start_time} - {session.end_time}
                        </TableCell>
                        <TableCell>
                          {session.session_location || session.location_details || 'TBA'}
                        </TableCell>
                        <TableCell>
                          {session.enrolled_count || 0} / {session.capacity}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={session.status || 'Scheduled'}
                            color={session.status === 'completed' ? 'success' :
                              session.status === 'cancelled' ? 'error' :
                                'primary'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No sessions found for this class
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSessionsClass(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {statusClass && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[1350]">
          <div className="bg-white rounded-lg p-10">
            <h3 className="text-lg font-medium mb-4">
              Update Status for {statusClass.title}
            </h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border px-2 py-1 rounded mb-4"
            >
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setStatusClass(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={handleStatusSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Enrollments Modal */}
      {allEnrollmentsClass && (
        <Dialog
          open={!!allEnrollmentsClass}
          onClose={() => setAllEnrollmentsClass(null)}
          maxWidth="lg"
          fullWidth
          sx={{
            zIndex: 1450,
            '& .MuiDialog-paper': {
              maxHeight: '90vh',
              margin: '20px',
              position: 'relative',
              top: '5vh'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon color="primary" />
              All Enrollments for {allEnrollmentsClass.title}
            </Box>
          </DialogTitle>
          <DialogContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                {/* Active Enrollments */}
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Active Enrollments ({allEnrollmentsClass.enrollments?.active?.length || 0})
                </Typography>
                {allEnrollmentsClass.enrollments?.active?.length > 0 ? (
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Session Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Enrolled</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allEnrollmentsClass.enrollments.active.map((enrollment) => (
                          <TableRow key={enrollment.enrollment_id}>
                            <TableCell>{enrollment.name}</TableCell>
                            <TableCell>{enrollment.email}</TableCell>
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
                ) : (
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    No active enrollments
                  </Typography>
                )}

                {/* Historical Enrollments */}
                <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                  Historical Enrollments ({allEnrollmentsClass.enrollments?.historical?.length || 0})
                </Typography>
                {allEnrollmentsClass.enrollments?.historical?.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Session Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Completed/Archived</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allEnrollmentsClass.enrollments.historical.map((enrollment) => (
                          <TableRow key={enrollment.enrollment_id}>
                            <TableCell>{enrollment.name}</TableCell>
                            <TableCell>{enrollment.email}</TableCell>
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
                  <Typography color="text.secondary">
                    No historical enrollments
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAllEnrollmentsClass(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default ClassManagement;
