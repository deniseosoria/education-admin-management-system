import React, { useState, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import { getCompletedSessions } from '../services/certificateService';

const CertificateUpload = ({ onUpload, studentId, classId, disabled = false, isCPRClass = false }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedSession, setSelectedSession] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const fileInputRef = useRef(null);

    // Format time to user-friendly format (e.g., "9:00 AM")
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            const [hour, minute] = timeStr.split(':');
            const date = new Date();
            date.setHours(Number(hour), Number(minute), 0, 0);
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (error) {
            console.error('Error formatting time:', timeStr, error);
            return timeStr || '';
        }
    };

    // Fetch completed sessions when classId changes
    React.useEffect(() => {
        if (classId) {
            fetchCompletedSessions();
        }
    }, [classId]);

    const fetchCompletedSessions = async () => {
        try {
            setLoadingSessions(true);
            const sessionsData = await getCompletedSessions(classId);
            setSessions(sessionsData);
        } catch (error) {
            console.error('Error fetching completed sessions:', error);
            setError('Failed to fetch completed sessions');
        } finally {
            setLoadingSessions(false);
        }
    };

    // Handle upload with loading state
    const handleUpload = async () => {
        // For CPR classes, file is optional but expiration date is required
        if (!isCPRClass && !file) return;
        if (isCPRClass && !expirationDate) {
            setError('Expiration date is required for CPR classes');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onUpload(file, selectedSession, expirationDate);
            // Clear the form after successful upload
            setFile(null);
            setPreview(null);
            setSelectedSession('');
            setExpirationDate('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            setError(error.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    // File validation
    const validateFile = (selectedFile) => {
        // Check file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(selectedFile.type)) {
            setError('Invalid file type. Please upload a PDF or image (JPEG, PNG) file.');
            return false;
        }

        // Check file size (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (selectedFile.size > maxSize) {
            setError('File size too large. Maximum size is 5MB.');
            return false;
        }

        return true;
    };

    // Handle file selection
    const handleFileSelect = (event) => {
        const selectedFile = event.target.files[0];
        setError('');

        if (!selectedFile) {
            return;
        }

        if (!validateFile(selectedFile)) {
            setFile(null);
            setPreview(null);
            return;
        }

        setFile(selectedFile);

        // Create preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            // For PDFs, show a PDF icon
            setPreview('pdf');
        }
    };

    // Handle file removal
    const handleRemoveFile = () => {
        setFile(null);
        setPreview(null);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle drag and drop
    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const droppedFile = event.dataTransfer.files[0];
        if (!droppedFile) return;

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;

        handleFileSelect({ target: { files: dataTransfer.files } });
    };

    return (
        <Paper
            elevation={2}
            sx={{
                p: 3,
                maxWidth: 600,
                mx: 'auto',
                my: 2
            }}
        >
            <Typography variant="h6" gutterBottom>
                {isCPRClass ? 'Record Certificate' : 'Upload Certificate'}
            </Typography>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Session Selection */}
            {classId && (
                <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Select Completed Session (Optional)</InputLabel>
                        <Select
                            value={selectedSession}
                            label="Select Completed Session (Optional)"
                            onChange={(e) => setSelectedSession(e.target.value)}
                            disabled={loadingSessions || disabled}
                            MenuProps={{
                                sx: { zIndex: 1500 }
                            }}
                        >
                            <MenuItem value="">
                                <em>No specific session</em>
                            </MenuItem>
                            {sessions.map((session) => (
                                <MenuItem key={session.id} value={session.id}>
                                    {new Date(session.session_date).toLocaleDateString()} - {formatTime(session.start_time)} to {formatTime(session.end_time)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}

            {/* Expiration Date */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    type="date"
                    label={isCPRClass ? "Certificate Expiration Date (Required)" : "Certificate Expiration Date (Optional)"}
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    disabled={disabled}
                    required={isCPRClass}
                    error={isCPRClass && !expirationDate}
                    helperText={isCPRClass && !expirationDate ? "Expiration date is required for CPR classes" : ""}
                    InputLabelProps={{
                        shrink: true,
                    }}
                />
            </Box>

            {/* Upload Area - Optional for CPR classes */}
            {!isCPRClass && (
                <Box
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    sx={{
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        bgcolor: 'action.hover',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.7 : 1,
                        '&:hover': {
                            bgcolor: disabled ? 'action.hover' : 'action.selected'
                        }
                    }}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        disabled={disabled}
                    />

                    {!file ? (
                        <>
                            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                            <Typography variant="body1" gutterBottom>
                                Drag and drop a certificate file here, or click to select
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Supported formats: PDF, JPEG, PNG (max 5MB)
                            </Typography>
                        </>
                    ) : (
                        <Box sx={{ position: 'relative' }}>
                            {preview === 'pdf' ? (
                                <Box sx={{ textAlign: 'center' }}>
                                    <PdfIcon sx={{ fontSize: 64, color: 'error.main' }} />
                                    <Typography variant="body1" sx={{ mt: 1 }}>
                                        {file.name}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                    <img
                                        src={preview}
                                        alt="Certificate preview"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: 200,
                                            borderRadius: 4
                                        }}
                                    />
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {file.name}
                                    </Typography>
                                </Box>
                            )}
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile();
                                }}
                                sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    bgcolor: 'background.paper',
                                    '&:hover': { bgcolor: 'action.hover' }
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    )}
                </Box>
            )}

            {/* Info message for CPR classes */}
            {isCPRClass && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    For CPR classes, certificate upload is optional. Only the expiration date is required.
                </Alert>
            )}

            {/* Upload Button */}
            {((!isCPRClass && file) || isCPRClass) && !disabled && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        onClick={handleUpload}
                        disabled={loading || disabled || (isCPRClass && !expirationDate)}
                        startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
                    >
                        {loading ? 'Saving...' : isCPRClass ? 'Save Certificate Record' : 'Upload Certificate'}
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

export default CertificateUpload;