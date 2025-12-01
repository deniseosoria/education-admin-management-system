import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Paper,
  Tab,
  Tabs,
  Alert,
  Tooltip,
  Autocomplete,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
  FormHelperText,
} from "@mui/material";
import {
  Notifications as NotificationIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Add as AddIcon,
  Announcement as BroadcastIcon,
  Edit as EditIcon,
  CloudUpload as UploadIcon,
  AttachFile as AttachFileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import adminService from "../../services/adminService";
import { useSnackbar } from "notistack";
import { useAuth } from "../../contexts/AuthContext";
import supabaseStorageService from "../../services/supabaseStorageService";

const NotificationCenter = () => {
  console.log('NotificationCenter: Component rendering...');

  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const errorTimeoutRef = React.useRef();

  const [activeTab, setActiveTab] = useState(0); // Start with Sent Notifications
  const [notifications, setNotifications] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastProgress, setBroadcastProgress] = useState({ isProcessing: false, message: "" });
  const [broadcastStats, setBroadcastStats] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    content: "",
    recipientType: "user",
    variables: [],
  });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [classes, setClasses] = useState([]);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [selectedRecipientType, setSelectedRecipientType] = useState("user");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [detailedMessage, setDetailedMessage] = useState("");
  const [notificationLinks, setNotificationLinks] = useState([{ label: '', url: '' }]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = React.useRef(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Add refs to prevent duplicate API calls
  const hasInitialized = React.useRef(false);
  const hasFetchedUsers = React.useRef(false);
  const hasFetchedClasses = React.useRef(false);
  const hasFetchedTemplates = React.useRef(false);
  const hasFetchedNotifications = React.useRef(false);
  const isMounted = React.useRef(false);

  // Add state flags as backup for duplicate prevention
  const [dataFetched, setDataFetched] = useState({
    users: false,
    classes: false,
    templates: false,
    notifications: false,
  });


  // Check session storage for already fetched data
  const checkSessionStorage = () => {
    const storageKey = 'NotificationCenter_DataFetched';
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Don't call setDataFetched here to avoid re-renders during initial check
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse localStorage:', error);
    }
    return null;
  };

  // Save to localStorage
  const saveToLocalStorage = (key, value) => {
    const storageKey = 'NotificationCenter_DataFetched';
    try {
      const current = { ...dataFetched, [key]: value };
      setDataFetched(current);
      localStorage.setItem(storageKey, JSON.stringify(current));
      console.log(`NotificationCenter: Saved ${key} to localStorage:`, current);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };

  // Global flag to prevent multiple instances from running simultaneously
  const globalInitKey = 'NotificationCenter_GlobalInit';
  const isGlobalInitializing = () => {
    try {
      return localStorage.getItem(globalInitKey) === 'true';
    } catch (error) {
      return false;
    }
  };

  const setGlobalInitializing = (value) => {
    try {
      localStorage.setItem(globalInitKey, value.toString());
    } catch (error) {
      console.warn('Failed to set global init flag:', error);
    }
  };

  // Fetch users and classes when component mounts
  useEffect(() => {
    // Prevent multiple executions
    if (isMounted.current) {
      console.log('NotificationCenter: Component already mounted, skipping...');
      return;
    }

    isMounted.current = true;

    // Check if another instance is already initializing
    if (isGlobalInitializing()) {
      console.log('NotificationCenter: Another instance is initializing, skipping...');
      return;
    }

    // Set global initialization flag
    setGlobalInitializing(true);

    // Check localStorage first
    const storedData = checkSessionStorage();
    console.log('NotificationCenter: Users/Classes useEffect - localStorage data:', storedData);

    // Set dataFetched state once based on localStorage data
    if (storedData) {
      setDataFetched(storedData);
    }

    // Only fetch if not already fetched
    if (!storedData?.users) {
      fetchUsers();
    } else {
      console.log('NotificationCenter: Users already in localStorage, skipping fetchUsers');
    }

    if (!storedData?.classes) {
      fetchClasses();
    } else {
      console.log('NotificationCenter: Classes already in localStorage, skipping fetchClasses');
    }

    // Clear global initialization flag after a short delay
    setTimeout(() => {
      setGlobalInitializing(false);
    }, 1000);
  }, []);

  const fetchUsers = React.useCallback(async () => {
    try {
      // Prevent duplicate API calls using both refs and state
      if (hasFetchedUsers.current || dataFetched.users) {
        console.log('NotificationCenter: Users already fetched, skipping...');
        return;
      }

      setLoadingUsers(true);
      console.log('Fetching users in NotificationCenter...');
      hasFetchedUsers.current = true;
      saveToLocalStorage('users', true);

      const response = await adminService.getAllUsers();
      console.log('Users fetched in NotificationCenter:', response);

      // Handle paginated response from search endpoint
      if (response && response.users && response.pagination) {
        const validUsers = response.users.filter(user => {
          const isValid = user &&
            user.id &&
            (user.first_name || user.last_name || user.email);

          if (!isValid) {
            console.warn('Invalid user data:', user);
          }
          return isValid;
        })
          .map(user => ({
            ...user,
            displayName: user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.email || 'Unnamed User'
          }));

        console.log('Filtered valid users:', validUsers);
        setUsers(validUsers);
      } else {
        console.error('Invalid response format:', response);
        setError('Invalid response format from server');
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to fetch users');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [dataFetched.users]);

  const fetchClasses = React.useCallback(async () => {
    try {
      // Prevent duplicate API calls using both refs and state
      if (hasFetchedClasses.current || dataFetched.classes) {
        console.log('NotificationCenter: Classes already fetched, skipping...');
        return;
      }

      setLoading(true);
      setError(false);
      hasFetchedClasses.current = true;
      saveToLocalStorage('classes', true);

      const response = await adminService.getAllClasses();
      console.log('Fetched classes:', response);
      setClasses(response);
      setClassesLoaded(true);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(true);
      handleError(err, "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [dataFetched.classes]);

  useEffect(() => {
    // Only fetch notifications and templates once when component mounts
    if (!hasInitialized.current && isMounted.current) {
      console.log('NotificationCenter: Initializing notifications and templates...');
      hasInitialized.current = true;

      // Check if we already have data from localStorage
      const storedData = checkSessionStorage();
      if (storedData?.templates) {
        console.log('NotificationCenter: Templates already fetched, skipping...');
        return;
      }

      fetchTemplates();
    }

    return () => {
      // Clear any pending error timeout when component unmounts
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      // Reset refs when component unmounts
      hasInitialized.current = false;
      hasFetchedUsers.current = false;
      hasFetchedClasses.current = false;
      hasFetchedTemplates.current = false;
      hasFetchedNotifications.current = false;
      isMounted.current = false;

      // Clear localStorage on unmount
      try {
        localStorage.removeItem('NotificationCenter_DataFetched');
        localStorage.removeItem(globalInitKey);
      } catch (error) {
        console.warn('Failed to clear localStorage:', error);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate effect for sent notifications when tab changes
  useEffect(() => {
    if (activeTab === 0) { // If on sent notifications tab
      fetchSentNotifications();
    }
  }, [activeTab]); // Only depend on activeTab

  // Filter students based on search term
  useEffect(() => {
    if (!Array.isArray(users)) {
      setFilteredStudents([]);
      return;
    }

    if (studentSearchTerm) {
      const searchTerm = studentSearchTerm.toLowerCase().trim();
      const filtered = users.filter(user => {
        if (!user) return false;
        const firstName = (user.first_name || '').toLowerCase();
        const lastName = (user.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
      });
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(users.filter(user => user && (user.first_name || user.last_name || user.email))); // Only include valid users
    }
  }, [studentSearchTerm, users]);

  const fetchNotifications = React.useCallback(async () => {
    try {
      // Prevent duplicate API calls using both refs and state
      if (hasFetchedNotifications.current || dataFetched.notifications) {
        console.log('NotificationCenter: Notifications already fetched, skipping...');
        return;
      }

      console.log('NotificationCenter: Fetching notifications...');
      setLoading(true);
      hasFetchedNotifications.current = true;
      saveToLocalStorage('notifications', true);

      const response = await adminService.getNotifications();
      setNotifications(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError(error.message || 'Failed to fetch notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [dataFetched.notifications]);

  const fetchSentNotifications = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSentNotifications();
      console.log('Fetched from /admin/sent:', response);

      if (!Array.isArray(response)) {
        setSentNotifications([]);
        return;
      }

      // Group notifications by title and message to identify broadcasts
      const groupedNotifications = response.reduce((groups, notification) => {
        const key = `${notification.title}|${notification.message}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(notification);
        return groups;
      }, {});

      console.log('Grouped notifications:', groupedNotifications);

      // Process notifications to handle broadcasts
      const processedNotifications = [];

      Object.entries(groupedNotifications).forEach(([key, notifications]) => {
        const [title, message] = key.split('|');
        const firstNotification = notifications[0];

        // Check if this is a broadcast by looking for broadcast indicators
        const isBroadcast = firstNotification.type === 'broadcast' ||
          firstNotification.metadata?.isBroadcast === true ||
          firstNotification.metadata?.type === 'broadcast' ||
          (notifications.length > 3 &&
            notifications.every(n => n.title === title && n.message === message)); // If sent to more than 3 people with same content, likely a broadcast

        console.log(`Processing group "${title}":`, {
          isBroadcast,
          type: firstNotification.type,
          metadata: firstNotification.metadata,
          count: notifications.length
        });

        if (isBroadcast) {
          // Create a single consolidated broadcast entry
          const broadcastEntry = {
            ...firstNotification,
            is_broadcast: true,
            sent_count: notifications.length,
            recipient_name: 'Everyone',
            // Use the earliest created_at time
            created_at: new Date(Math.min(...notifications.map(n => new Date(n.created_at).getTime()))).toISOString(),
            // Combine all recipient names for display (optional)
            all_recipients: notifications.map(n => n.recipient_name).filter(Boolean),
            // Store all the original notification IDs for deletion
            original_notification_ids: notifications.map(n => n.id)
          };

          console.log('Created broadcast entry:', broadcastEntry);
          processedNotifications.push(broadcastEntry);
        } else {
          // Add individual notifications as is
          processedNotifications.push(...notifications);
        }
      });

      // Sort by created_at descending
      processedNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setSentNotifications(processedNotifications);
    } catch (error) {
      console.error('Failed to fetch sent notifications:', error);
      setError(error.message || 'Failed to fetch sent notifications');
      setSentNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = React.useCallback(async () => {
    try {
      // Prevent duplicate API calls using both refs and state
      if (hasFetchedTemplates.current || dataFetched.templates) {
        console.log('NotificationCenter: Templates already fetched, skipping...');
        return;
      }

      setLoading(true);
      console.log('Fetching templates...');
      hasFetchedTemplates.current = true;
      saveToLocalStorage('templates', true);

      const response = await adminService.getTemplates();
      console.log('Templates fetched:', response);

      if (!Array.isArray(response)) {
        console.error('Invalid templates response format:', response);
        setError('Failed to fetch templates: Invalid response format');
        setTemplates([]);
        return;
      }

      const validTemplates = response.filter(template => {
        const isValid = template && template.id && template.name && template.message_template;
        if (!isValid) {
          console.warn('Invalid template data:', template);
        }
        return isValid;
      });

      console.log('Filtered valid templates:', validTemplates);
      setTemplates(validTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError(error.message || 'Failed to fetch templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [dataFetched.templates]);

  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      setLoading(true);
      await adminService.markNotificationAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      handleError(error, "Failed to mark notification as read");
    } finally {
      setLoading(false);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await adminService.markAllNotificationsAsRead(); // <-- new endpoint
      await fetchNotifications();
    } catch (err) {
      handleError(err, "Failed to mark all notifications as read");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      setLoading(true);
      await adminService.deleteNotification(notificationId);
      await fetchNotifications();
      enqueueSnackbar("Notification deleted successfully", {
        variant: "success",
        style: { zIndex: 1450 }
      });
    } catch (error) {
      handleError(error, "Failed to delete notification");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSentNotification = async (notificationId) => {
    try {
      setLoading(true);

      // Find the notification to determine if it's a broadcast
      const notification = sentNotifications.find(n => n.id === notificationId);

      if (notification && notification.is_broadcast) {
        // For broadcast notifications, delete all the original individual notifications
        if (notification.original_notification_ids && notification.original_notification_ids.length > 0) {
          console.log('Deleting broadcast notification with IDs:', notification.original_notification_ids);

          const deletePromises = notification.original_notification_ids.map(id =>
            adminService.deleteNotification(id)
          );

          await Promise.all(deletePromises);
          enqueueSnackbar("Broadcast notification deleted successfully", {
            variant: "success",
            style: { zIndex: 1450 }
          });
        } else {
          // Fallback: delete the current notification
          console.log('No original notification IDs found, deleting current notification:', notificationId);
          await adminService.deleteNotification(notificationId);
          enqueueSnackbar("Notification deleted successfully", {
            variant: "success",
            style: { zIndex: 1450 }
          });
        }
      } else {
        // For regular notifications, delete just the one
        await adminService.deleteNotification(notificationId);
        enqueueSnackbar("Notification deleted successfully", {
          variant: "success",
          style: { zIndex: 1450 }
        });
      }

      await fetchSentNotifications();
    } catch (error) {
      handleError(error, "Failed to delete notification");
    } finally {
      setLoading(false);
    }
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
        enqueueSnackbar(error, { variant: "error", style: { zIndex: 1450 } });
      });
    }

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleSendNotification = async () => {
    try {
      setLoading(true);

      if (!notificationTitle.trim() || !detailedMessage.trim()) {
        enqueueSnackbar("Please provide both a title and message", { variant: "error", style: { zIndex: 1450 } });
        return;
      }

      if (selectedRecipientType === "user" && !selectedRecipient?.id) {
        enqueueSnackbar("Please select a recipient", { variant: "error", style: { zIndex: 1450 } });
        return;
      }

      if (selectedRecipientType === "class" && !selectedClass) {
        enqueueSnackbar("Please select a class", { variant: "error", style: { zIndex: 1450 } });
        return;
      }

      const selectedClassDetails = selectedRecipientType === "class"
        ? classes.find(c => Number(c.id) === Number(selectedClass))
        : null;

      if (selectedRecipientType === "class" && !selectedClassDetails) {
        console.error('Class not found in available classes:', {
          selectedClass,
          availableClasses: classes.map(c => ({ id: c.id, title: c.title }))
        });
        enqueueSnackbar("Selected class not found", { variant: "error", style: { zIndex: 1450 } });
        return;
      }

      // For class notifications, check if there are students first
      if (selectedRecipientType === "class") {
        try {
          console.log('Fetching students for class:', selectedClass);
          const response = await adminService.getClassStudents(selectedClass);
          console.log('Raw response from getClassStudents:', response);

          // Ensure we have an array of students
          const students = Array.isArray(response) ? response : [];
          console.log('Processed students array:', students);

          // Filter out any duplicate students (since they might have multiple enrollments)
          const uniqueStudents = students.filter((student, index, self) =>
            index === self.findIndex((s) => s.id === student.id)
          );

          console.log('Unique students in class:', uniqueStudents);

          if (uniqueStudents.length === 0) {
            console.log('No unique students found in class');
            enqueueSnackbar(`No students are currently enrolled in ${selectedClassDetails.title}`, {
              variant: "warning",
              style: { zIndex: 1450 },
              action: (key) => (
                <Button color="inherit" size="small" onClick={() => {
                  enqueueSnackbar("Please enroll students in the class first", { variant: "info", style: { zIndex: 1450 } });
                }}>
                  View Class
                </Button>
              )
            });
            return;
          }

          // Log the notification data we're about to send
          console.log('Preparing to send notification with data:', {
            title: notificationTitle,
            message: detailedMessage,
            recipient: selectedClass,
            recipientType: selectedRecipientType,
            templateId: selectedTemplateId,
            students: uniqueStudents
          });
        } catch (error) {
          console.error('Error checking class students:', error);
          enqueueSnackbar("Failed to check class enrollment. Please try again.", { variant: "error", style: { zIndex: 1450 } });
          return;
        }
      }

      // Filter out empty links
      const validLinks = notificationLinks.filter(link => link.label.trim() && link.url.trim());

      // Upload attached files if any
      let uploadedFiles = [];
      if (attachedFiles.length > 0 && user?.id) {
        setUploadingFiles(true);
        try {
          const uploadPromises = attachedFiles.map(file =>
            supabaseStorageService.uploadNotificationAttachment(file.file, user.id)
          );
          uploadedFiles = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          enqueueSnackbar("Failed to upload files. Please try again.", { variant: "error", style: { zIndex: 1450 } });
          setUploadingFiles(false);
          return;
        } finally {
          setUploadingFiles(false);
        }
      }

      const notificationData = {
        title: notificationTitle,
        message: detailedMessage.trim(), // Use detailed message as the main message
        recipient: selectedRecipientType === "class" ? selectedClass : selectedRecipient.id,
        recipientType: selectedRecipientType,
        templateId: selectedTemplateId || undefined,
        template: selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : undefined,
        user: selectedRecipientType === "user" ? selectedRecipient : undefined,
        // Include links and files in metadata
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

      console.log('Sending notification with data:', notificationData);
      await adminService.sendNotification(notificationData);

      // Refresh sent notifications
      await fetchSentNotifications();

      enqueueSnackbar(
        selectedRecipientType === "class"
          ? `Notification sent to all students in ${selectedClassDetails?.title}`
          : "Notification sent successfully",
        { variant: "success", style: { zIndex: 1450 } }
      );
      setShowSendDialog(false);
      // Reset form
      setSelectedRecipientType("user");
      setSelectedRecipient(null);
      setSelectedClass(null);
      setNotificationTitle("");
      setSelectedTemplateId("");
      setDetailedMessage("");
      setNotificationLinks([{ label: '', url: '' }]);
      setAttachedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending notification:', error);

      // Provide more specific error messages
      let errorMessage = "Failed to send notification";
      if (error.message) {
        if (error.message.includes('No students found')) {
          errorMessage = "No students are enrolled in this class";
        } else if (error.message.includes('No recipient specified')) {
          errorMessage = "Please select a recipient";
        } else if (error.message.includes('bulk')) {
          errorMessage = "Failed to send notification to multiple recipients";
        } else {
          errorMessage = error.message;
        }
      }

      handleError(error, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      content: template.message_template,
      recipientType: template.type === "user_notification" ? "user" : "class",
      variables: template.metadata?.variables || [],
    });
    setShowTemplateDialog(true);
  };

  const handleCreateOrUpdateTemplate = async () => {
    try {
      setLoading(true);
      const templateData = {
        name: newTemplate.name,
        type: newTemplate.recipientType === "user" ? "user_notification" : "class_notification",
        title_template: newTemplate.name,
        message_template: newTemplate.content,
        metadata: {
          recipientType: newTemplate.recipientType,
          variables: newTemplate.variables
        }
      };

      if (editingTemplate) {
        // Update existing template
        await adminService.updateTemplate(editingTemplate.id, templateData);
        enqueueSnackbar("Template updated successfully", { variant: "success", style: { zIndex: 1450 } });
      } else {
        // Create new template
        await adminService.createTemplate(templateData);
        enqueueSnackbar("Template created successfully", { variant: "success", style: { zIndex: 1450 } });
      }

      await fetchTemplates();
      setShowTemplateDialog(false);
      setNewTemplate({
        name: "",
        content: "",
        recipientType: "user",
        variables: [],
      });
      setEditingTemplate(null);
    } catch (error) {
      handleError(error, editingTemplate ? "Failed to update template" : "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    try {
      setLoading(true);
      setBroadcastProgress({ isProcessing: true, message: "Preparing broadcast..." });

      if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
        enqueueSnackbar("Please provide both a title and message for the broadcast", { variant: "error", style: { zIndex: 1450 } });
        setBroadcastProgress({ isProcessing: false, message: "" });
        return;
      }

      setBroadcastProgress({ isProcessing: true, message: "Sending broadcast to all users..." });

      const response = await adminService.sendBroadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        is_broadcast: true
      });

      // Show immediate success feedback
      setBroadcastProgress({ isProcessing: false, message: "Broadcast sent successfully! Processing emails in background..." });
      setBroadcastStats({
        sent_count: response.data?.sent_count || 0,
        total_users: response.data?.total_users || 0,
        failed_count: response.data?.failed_count || 0
      });

      // Show success message
      enqueueSnackbar(
        `Broadcast sent successfully to ${response.data?.sent_count || 0} recipients! Emails are being processed in the background.`,
        { variant: "success", style: { zIndex: 1450 } }
      );

      // Close dialog after a short delay to show the success state
      setTimeout(() => {
        setShowBroadcastDialog(false);
        setBroadcastMessage("");
        setBroadcastTitle("");
        setBroadcastProgress({ isProcessing: false, message: "" });
        setBroadcastStats(null);
      }, 3000);

      // Refresh sent notifications to get the updated list from server
      await fetchSentNotifications();

    } catch (error) {
      console.error('Broadcast error:', error);
      setBroadcastProgress({ isProcessing: false, message: "" });
      handleError(error, "Failed to send broadcast");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      setLoading(true);
      await adminService.deleteTemplate(templateId);
      await fetchTemplates(); // Refresh templates after deletion
      enqueueSnackbar("Template deleted successfully", { variant: "success", style: { zIndex: 1450 } });
    } catch (error) {
      handleError(error, "Failed to delete template");
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error, customMessage = "An error occurred") => {
    console.error(error);
    setError(error.message || customMessage);
    enqueueSnackbar(error.message || customMessage, { variant: "error", style: { zIndex: 1450 } });

    // Clear any existing timeout before setting a new one
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    // Set new timeout and store its ID in the ref
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
      errorTimeoutRef.current = null;
    }, 5000);
  };

  const formatTemplateName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
        <Box>
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
            <NotificationIcon sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
            Notification Center
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#6b7280',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              mb: 3
            }}
          >
            Manage notifications, send messages, and broadcast announcements
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            flexWrap: 'wrap'
          }}>
            <Button
              startIcon={<SendIcon />}
              onClick={() => setShowSendDialog(true)}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Send Notification
            </Button>
            <Button
              startIcon={<BroadcastIcon />}
              onClick={() => setShowBroadcastDialog(true)}
              variant="contained"
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              Broadcast
            </Button>
          </Box>
        </Box>
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

      {/* Modern Tabs */}
      <Box sx={{
        maxWidth: { xs: '100%', sm: '1200px' },
        mx: 'auto',
        mb: 4,
        px: { xs: 2, sm: 3 }
      }}>
        <Paper sx={{
          borderRadius: '16px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #e5e7eb'
        }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minHeight: { xs: '48px', sm: '40px' },
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': {
                  color: '#3b82f6'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3b82f6',
                height: 3,
                borderRadius: '2px 2px 0 0'
              }
            }}
          >
            <Tab label="Sent Notifications" />
            <Tab label="Templates" />
          </Tabs>
        </Paper>
      </Box>

      {/* Sent Notifications Tab */}
      {activeTab === 0 && (
        <Box sx={{
          maxWidth: { xs: '100%', sm: '1200px' },
          mx: 'auto',
          px: { xs: 2, sm: 3 }
        }}>
          {sentNotifications.length === 0 ? (
            <Paper sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: '16px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <SendIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No notifications sent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send your first notification to see it here
              </Typography>
            </Paper>
          ) : (
            <Box sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(400px, 1fr))' }
            }}>
              {sentNotifications.map((notification, index) => (
                <Paper
                  key={`sent-notification-${notification.id || index}`}
                  onClick={() => navigate(`/notifications/${notification.id}`)}
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    transition: 'all 0.2s ease-in-out',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transform: 'translateY(-1px)'
                    },
                    position: 'relative',
                    ...(notification.is_broadcast && {
                      borderLeft: '4px solid #3b82f6',
                      bgcolor: '#f0f9ff'
                    })
                  }}
                >
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SendIcon sx={{ color: notification.is_broadcast ? '#3b82f6' : '#6b7280' }} />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: '#111827'
                        }}
                      >
                        {notification.title}
                      </Typography>
                      {notification.is_broadcast && (
                        <Chip
                          label="Broadcast"
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSentNotification(notification.id);
                        }}
                        sx={{ color: '#ef4444' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Sent to: {notification.is_broadcast ? "Everyone" : (notification.recipient_name || 'Multiple recipients')}
                      {notification.is_broadcast && notification.sent_count && (
                        <span> ({notification.sent_count} recipients)</span>
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {new Date(notification.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Templates Tab */}
      {activeTab === 1 && (
        <Box sx={{
          maxWidth: { xs: '100%', sm: '1200px' },
          mx: 'auto',
          px: { xs: 2, sm: 3 }
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            mb: 3
          }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setShowTemplateDialog(true)}
              variant="contained"
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              New Template
            </Button>
          </Box>
          {templates.length === 0 ? (
            <Paper sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: '16px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <AddIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No templates created
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first template to get started
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setShowTemplateDialog(true)}
                variant="contained"
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5
                }}
              >
                Create Template
              </Button>
            </Paper>
          ) : (
            <Box sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(400px, 1fr))' }
            }}>
              {templates.map((template) => (
                <Paper
                  key={template.id}
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    transition: 'all 0.2s ease-in-out',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    '&:hover': {
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2
                  }}>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: '#111827',
                          mb: 0.5
                        }}
                      >
                        {formatTemplateName(template.name)}
                      </Typography>
                      <Chip
                        label={template.type.replace('_', ' ')}
                        size="small"
                        color="secondary"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit Template">
                        <IconButton
                          size="small"
                          onClick={() => handleEditTemplate(template)}
                          sx={{ color: '#3b82f6' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Template">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTemplate(template.id)}
                          sx={{ color: '#ef4444' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 500, mb: 0.5 }}
                    >
                      Title Template:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        bgcolor: '#f8fafc',
                        p: 1,
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    >
                      {template.title_template}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 500, mb: 0.5 }}
                    >
                      Message Template:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        bgcolor: '#f8fafc',
                        p: 1,
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        maxHeight: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {template.message_template.length > 100
                        ? `${template.message_template.substring(0, 100)}...`
                        : template.message_template}
                    </Typography>
                  </Box>

                  {template.metadata?.variables?.length > 0 && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 500, mb: 0.5 }}
                      >
                        Variables:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {template.metadata.variables.map((variable, index) => (
                          <Chip
                            key={index}
                            label={`{${variable}}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Modern Send Notification Dialog */}
      <Dialog
        open={showSendDialog}
        onClose={() => {
          setShowSendDialog(false);
          setSelectedRecipientType("user");
          setSelectedRecipient(null);
          setSelectedClass(null);
          setNotificationTitle("");
          setSelectedTemplateId("");
          setDetailedMessage("");
          setNotificationLinks([{ label: '', url: '' }]);
        }}
        aria-labelledby="send-notification-dialog-title"
        keepMounted={false}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 1450 }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#111827',
          pb: 1
        }}>
          Send Notification
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Notification Type</InputLabel>
              <Select
                value={selectedRecipientType}
                label="Notification Type"
                onChange={(e) => {
                  setSelectedRecipientType(e.target.value);
                  setSelectedRecipient(null);
                  setSelectedClass(null);
                  setSelectedTemplateId('');
                  setNotificationTitle('');
                  setDetailedMessage('');
                }}
                MenuProps={{
                  sx: { zIndex: 1500 }
                }}
              >
                <MenuItem value="user">Send to Student</MenuItem>
                <MenuItem value="class">Send to Class</MenuItem>
              </Select>
            </FormControl>

            {selectedRecipientType === "user" ? (
              <Box sx={{ mb: 2 }}>
                {/* Autocomplete for selecting student */}
                <Box sx={{ position: 'relative' }}>
                  <Autocomplete
                    value={selectedRecipient}
                    onChange={(event, newValue) => {
                      setSelectedRecipient(newValue);
                    }}
                    options={users || []}
                    filterOptions={(options, { inputValue }) => {
                      if (!inputValue) return options;
                      return options.filter(option => {
                        const searchTerm = inputValue.toLowerCase();
                        const name = option.displayName?.toLowerCase() || '';
                        const email = option.email?.toLowerCase() || '';
                        const firstName = option.first_name?.toLowerCase() || '';
                        const lastName = option.last_name?.toLowerCase() || '';

                        return name.includes(searchTerm) ||
                          email.includes(searchTerm) ||
                          firstName.includes(searchTerm) ||
                          lastName.includes(searchTerm);
                      });
                    }}
                    getOptionLabel={(option) => {
                      if (!option) return '';
                      return option.displayName || `${option.first_name} ${option.last_name}`.trim() || option.email || 'Unnamed User';
                    }}
                    isOptionEqualToValue={(option, value) => {
                      return option?.id === value?.id;
                    }}
                    PopperProps={{
                      sx: {
                        zIndex: 1500,
                        '& .MuiPaper-root': {
                          zIndex: 1500,
                          position: 'relative'
                        }
                      },
                      placement: 'bottom-start',
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altAxis: true,
                            tether: false,
                            rootBoundary: 'viewport'
                          }
                        }
                      ]
                    }}
                    ListboxProps={{
                      sx: {
                        zIndex: 1500,
                        maxHeight: '200px'
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search and Select Student"
                        placeholder="Type to search..."
                        error={!!error}
                        helperText={error || "Type to search for a student"}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <li key={option.id || key} {...otherProps}>
                          <Box>
                            <Typography variant="body1">
                              {option.displayName || `${option.first_name} ${option.last_name}`.trim() || option.email || 'Unnamed User'}
                            </Typography>
                            {option.email && (
                              <Typography variant="body2" color="text.secondary">
                                {option.email}
                              </Typography>
                            )}
                            {option.role && (
                              <Typography variant="caption" color="text.secondary">
                                Student
                              </Typography>
                            )}
                          </Box>
                        </li>
                      );
                    }}
                    noOptionsText={loadingUsers ? "Loading..." : "No students found"}
                    loadingText="Loading students..."
                    clearText="Clear"
                    openText="Open"
                    closeText="Close"
                    loading={loadingUsers}
                    fullWidth
                    disablePortal={false}
                    disableScrollLock={false}
                    slotProps={{
                      popper: {
                        sx: {
                          zIndex: 1500,
                          '& .MuiPaper-root': {
                            zIndex: 1500,
                            position: 'relative',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px'
                          }
                        }
                      }
                    }}
                  />
                </Box>
                {error && (
                  <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                    {error}
                  </Typography>
                )}
              </Box>
            ) : (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={!classesLoaded ? '' : (selectedClass === null ? '' : selectedClass)}
                  label="Select Class"
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log('Selected class value:', value);
                    setSelectedClass(value === '' ? null : Number(value));
                  }}
                  error={!selectedClass && error}
                  disabled={loading || !classesLoaded}
                  MenuProps={{
                    sx: { zIndex: 1500 }
                  }}
                >
                  {loading ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography>Loading classes...</Typography>
                      </Box>
                    </MenuItem>
                  ) : !classesLoaded ? (
                    <MenuItem disabled>
                      <Typography>Loading classes...</Typography>
                    </MenuItem>
                  ) : classes.length === 0 ? (
                    <MenuItem disabled>
                      <Typography color="error">No classes available</Typography>
                    </MenuItem>
                  ) : (
                    classes.map((cls) => {
                      console.log('Rendering class option:', cls);
                      return (
                        <MenuItem key={cls.id} value={Number(cls.id)}>
                          <Box>
                            <Typography variant="body1">{cls.title}</Typography>
                            {cls.description && (
                              <Typography variant="caption" color="text.secondary">
                                {cls.description}
                              </Typography>
                            )}
                            {cls.student_count !== undefined && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Students: {cls.student_count}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
                {error && (
                  <FormHelperText error>
                    Failed to load classes. Please try again.
                  </FormHelperText>
                )}
              </FormControl>
            )}

            {/* Add Template Selection Dropdown */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Template</InputLabel>
              <Select
                value={selectedTemplateId || ''}
                label="Select Template"
                onChange={(e) => {
                  const templateId = e.target.value;
                  setSelectedTemplateId(templateId);

                  if (templateId) {
                    const template = templates.find(t => t.id === templateId);
                    if (template) {
                      // Only update if the template type matches the current recipient type
                      const templateTypeMap = {
                        'user_notification': 'user',
                        'class_notification': 'class',
                        'class_reminder': 'class',
                        'enrollment': 'user',
                        'payment': 'user',
                        'certificate': 'user'
                      };
                      const mappedType = templateTypeMap[template.type] || template.type;

                      if (mappedType === selectedRecipientType) {
                        setNotificationTitle(template.title_template || '');
                        setDetailedMessage(template.message_template || '');
                        // Don't clear links when selecting template
                      } else {
                        // If template type doesn't match, reset the selection
                        setSelectedTemplateId('');
                        setNotificationTitle('');
                        setDetailedMessage('');
                        // Don't clear links when template doesn't match
                        enqueueSnackbar(`This template is for ${mappedType} notifications, not ${selectedRecipientType} notifications`, {
                          variant: "warning",
                          style: { zIndex: 1450 }
                        });
                      }
                    }
                  } else {
                    setNotificationTitle('');
                    setDetailedMessage('');
                    // Don't clear links when clearing template
                  }
                }}
                MenuProps={{
                  sx: { zIndex: 1500 }
                }}
              >
                {loading ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography>Loading templates...</Typography>
                    </Box>
                  </MenuItem>
                ) : templates.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="error">No templates available</Typography>
                  </MenuItem>
                ) : (
                  (() => {
                    console.log('All available templates:', templates);
                    const filteredTemplates = templates.filter(t => {
                      // Map the template types to match what we expect
                      const templateTypeMap = {
                        'user_notification': 'user',
                        'class_notification': 'class',
                        'class_reminder': 'class',
                        'enrollment': 'user',
                        'payment': 'user',
                        'certificate': 'user'
                      };

                      const mappedType = templateTypeMap[t.type] || t.type;
                      return mappedType === selectedRecipientType;
                    });

                    if (filteredTemplates.length === 0) {
                      return (
                        <MenuItem disabled>
                          <Typography color="text.secondary">
                            No templates available for {selectedRecipientType === "user" ? "student" : "class"} notifications
                          </Typography>
                        </MenuItem>
                      );
                    }

                    return filteredTemplates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        <Box>
                          <Typography variant="body1">
                            {formatTemplateName(template.name)}
                          </Typography>
                          {template.message_template && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {template.message_template.length > 50
                                ? `${template.message_template.substring(0, 50)}...`
                                : template.message_template}
                            </Typography>
                          )}
                          {template.metadata?.variables?.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Variables: {template.metadata.variables.map(v => `{${v}}`).join(", ")}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ));
                  })()
                )}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notification Title"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={6}
              label="Message"
              value={detailedMessage}
              onChange={(e) => setDetailedMessage(e.target.value)}
              placeholder="Enter your notification message..."
              required
              sx={{ mb: 2 }}
            />

            {/* Links Section */}
            <Box sx={{ mb: 2 }}>
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
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Attachments (Optional)
              </Typography>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={() => fileInputRef.current?.click()}
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
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => {
              setShowSendDialog(false);
              setSelectedRecipientType("user");
              setSelectedRecipient(null);
              setSelectedClass(null);
              setNotificationTitle("");
              setSelectedTemplateId("");
              setDetailedMessage("");
              setNotificationLinks([{ label: '', url: '' }]);
              setAttachedFiles([]);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendNotification}
            variant="contained"
            color="primary"
            disabled={
              !notificationTitle.trim() ||
              !detailedMessage.trim() ||
              (selectedRecipientType === "user" && !selectedRecipient?.id) ||
              (selectedRecipientType === "class" && !selectedClass) ||
              loading ||
              uploadingFiles
            }
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            {uploadingFiles ? 'Uploading Files...' : loading ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Template Dialog */}
      <Dialog
        open={showTemplateDialog}
        onClose={() => {
          setShowTemplateDialog(false);
          setNewTemplate({
            name: "",
            content: "",
            recipientType: "user",
            variables: [],
          });
          setEditingTemplate(null);
        }}
        aria-labelledby="template-dialog-title"
        keepMounted={false}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 1450 }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#111827',
          pb: 1
        }}>
          {editingTemplate ? `Edit Template: ${formatTemplateName(editingTemplate.name)}` : 'New Template'}
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Template For</InputLabel>
              <Select
                value={newTemplate.recipientType}
                label="Template For"
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    recipientType: e.target.value,
                    variables:
                      e.target.value === "user"
                        ? ["student_name", "class_name", "grade"]
                        : ["class_name", "student_count", "teacher_name"],
                  })
                }
                MenuProps={{
                  sx: { zIndex: 1500 }
                }}
              >
                <MenuItem value="user">Specific Student</MenuItem>
                <MenuItem value="class">Specific Class</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Template Name"
              value={formatTemplateName(newTemplate.name)}
              onChange={(e) => {
                // Convert the formatted name back to snake_case for storage
                const snakeCase = e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '');
                setNewTemplate(prev => ({
                  ...prev,
                  name: snakeCase
                }));
              }}
              placeholder="Enter a descriptive name (e.g., Welcome Message, Class Reminder)"
              required
              error={!newTemplate.name}
              helperText={!newTemplate.name ? "Template name is required" : "Use spaces and proper capitalization"}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Template Content"
              value={newTemplate.content}
              onChange={(e) =>
                setNewTemplate({ ...newTemplate, content: e.target.value })
              }
              helperText={
                <Box component="span">
                  Available variables:{" "}
                  {newTemplate.variables.map((v) => `{${v}}`).join(", ")}
                  <br />
                  {newTemplate.recipientType === "user"
                    ? "Use {student_name} for the student's name, {class_name} for their class, and {grade} for their grade"
                    : "Use {class_name} for the class name, {student_count} for the number of students, and {teacher_name} for the teacher's name"}
                </Box>
              }
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Template Preview:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Typography variant="body2">
                  {newTemplate.content.replace(
                    /\{([^}]+)\}/g,
                    (match, variable) => {
                      switch (variable) {
                        case "student_name":
                          return "{student_name}";
                        case "class_name":
                          return "{class_name}";
                        case "grade":
                          return "A+";
                        case "student_count":
                          return "15";
                        case "teacher_name":
                          return "Mrs. Smith";
                        default:
                          return match;
                      }
                    }
                  )}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => {
              setShowTemplateDialog(false);
              setNewTemplate({
                name: "",
                content: "",
                recipientType: "user",
                variables: [],
              });
              setEditingTemplate(null);
            }}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrUpdateTemplate}
            variant="contained"
            disabled={!newTemplate.name || !newTemplate.content}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Broadcast Dialog */}
      <Dialog
        open={showBroadcastDialog}
        onClose={() => {
          if (!broadcastProgress.isProcessing) {
            setShowBroadcastDialog(false);
            setBroadcastMessage("");
            setBroadcastTitle("");
            setBroadcastProgress({ isProcessing: false, message: "" });
            setBroadcastStats(null);
          }
        }}
        aria-labelledby="broadcast-dialog-title"
        keepMounted={false}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 1450 }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#111827',
          pb: 1
        }}>
          Broadcast Message
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Box sx={{ mt: 2 }}>
            {broadcastProgress.isProcessing && (
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {broadcastProgress.message}
                </Typography>
              </Box>
            )}

            {broadcastStats && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="h6" color="success.dark" gutterBottom>
                  ✅ Broadcast Completed Successfully!
                </Typography>
                <Typography variant="body2" color="success.dark">
                  Sent to: {broadcastStats.sent_count} recipients
                </Typography>
                {broadcastStats.failed_count > 0 && (
                  <Typography variant="body2" color="warning.dark">
                    Failed: {broadcastStats.failed_count} recipients
                  </Typography>
                )}
                <Typography variant="caption" color="success.dark" display="block" sx={{ mt: 1 }}>
                  Emails are being processed in the background. This dialog will close automatically.
                </Typography>
              </Box>
            )}

            <TextField
              fullWidth
              label="Broadcast Title"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Enter a title for your broadcast message"
              disabled={broadcastProgress.isProcessing}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Broadcast Message"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              helperText="This message will be sent to all users"
              disabled={broadcastProgress.isProcessing}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => {
              if (!broadcastProgress.isProcessing) {
                setShowBroadcastDialog(false);
                setBroadcastMessage("");
                setBroadcastTitle("");
                setBroadcastProgress({ isProcessing: false, message: "" });
                setBroadcastStats(null);
              }
            }}
            disabled={broadcastProgress.isProcessing}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBroadcast}
            variant="contained"
            color="primary"
            disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || broadcastProgress.isProcessing}
            startIcon={broadcastProgress.isProcessing ? <CircularProgress size={16} /> : <BroadcastIcon />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.5
            }}
          >
            {broadcastProgress.isProcessing ? 'Broadcasting...' : 'Broadcast'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationCenter;
