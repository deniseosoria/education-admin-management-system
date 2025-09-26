import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    Paper,
    TextField,
    InputAdornment,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    IconButton,
    CircularProgress,
    Pagination,
    Chip,
    Avatar,
    Tooltip
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Add as AddIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    School as SchoolIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import CertificateViewer from '../../components/CertificateViewer';
import CertificateUpload from '../../components/CertificateUpload';
import { getAllCertificates, uploadCertificate, downloadCertificate, deleteCertificate } from '../../services/certificateService';
import { getUsersByRole } from '../../services/userService';
import classService from '../../services/classService';
import adminService from '../../services/adminService';

const CertificateManagementPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [certificates, setCertificates] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const certificatesPerPage = 8;

    // Fetch certificates, students, and classes on component mount
    useEffect(() => {
        fetchCertificates();
        fetchStudents();
        fetchClasses();
    }, []);

    // Reset pagination when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const data = await getAllCertificates();
            setCertificates(data);
        } catch (error) {
            console.error('Error fetching certificates:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: 'Failed to fetch certificates'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            console.log('Fetching students...');
            // Get all users and filter for students (users with role 'user' or 'student')
            const allUsersResponse = await adminService.getAllUsers({ role: 'all' });

            // Handle paginated response from search endpoint
            let allUsers;
            if (allUsersResponse && allUsersResponse.users && allUsersResponse.pagination) {
                allUsers = allUsersResponse.users;
            } else {
                console.error('Invalid response format:', allUsersResponse);
                setStudents([]);
                return;
            }

            const students = allUsers.filter(user => user.role === 'user' || user.role === 'student');
            console.log('Students data received:', students);
            setStudents(students);
            console.log('Students state set to:', students);
        } catch (error) {
            console.error('Error fetching students:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: 'Failed to fetch students'
                });
            }
            setStudents([]);
        }
    };

    const fetchClasses = async () => {
        try {
            const data = await classService.getAllClasses();
            setClasses(data);
        } catch (error) {
            console.error('Error fetching classes:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: 'Failed to fetch classes'
                });
            }
        }
    };

    const handleSearch = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleUploadClick = () => {
        setShowUploadDialog(true);
    };

    const handleUploadClose = () => {
        setShowUploadDialog(false);
        setSelectedStudent('');
        setSelectedClass('');
    };

    const handleUpload = async (file, sessionId, expirationDate) => {
        try {
            if (!selectedStudent) {
                setAlert({
                    type: 'error',
                    message: 'Please select a student first'
                });
                return;
            }

            setLoading(true);
            await uploadCertificate(selectedStudent, file, selectedClass, sessionId, expirationDate);

            setAlert({
                type: 'success',
                message: 'Certificate uploaded successfully'
            });

            await fetchCertificates();
            handleUploadClose();
        } catch (error) {
            console.error('Error uploading certificate:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: error.message || 'Failed to upload certificate'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (certificate) => {
        try {
            // Use the full Cloudinary URL from the database
            const link = document.createElement('a');
            link.href = certificate.certificate_url;
            link.setAttribute('download', certificate.certificate_name);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading certificate:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: 'Failed to download certificate'
                });
            }
        }
    };

    const handleDelete = async (certificate) => {
        try {
            await deleteCertificate(certificate.id);
            setAlert({
                type: 'success',
                message: 'Certificate deleted successfully'
            });
            await fetchCertificates();
        } catch (error) {
            console.error('Error deleting certificate:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: error.message || 'Failed to delete certificate'
                });
            }
        }
    };

    const handleBulkDelete = async (certificateIds) => {
        try {
            // Delete certificates sequentially to avoid overwhelming the server
            for (const id of certificateIds) {
                await deleteCertificate(id);
            }

            setAlert({
                type: 'success',
                message: `${certificateIds.length} certificate(s) deleted successfully`
            });
            await fetchCertificates();
        } catch (error) {
            console.error('Error deleting certificates:', error);
            if (error.message !== 'Unauthorized') {
                setAlert({
                    type: 'error',
                    message: error.message || 'Failed to delete some certificates'
                });
            }
        }
    };

    const filteredCertificates = certificates.filter(cert => {
        if (!cert) return false;

        // If no search query, return empty array (show no certificates)
        if (!searchQuery.trim()) {
            return false;
        }

        const studentName = cert.student_name ? cert.student_name.toLowerCase() : '';
        const certName = cert.certificate_name ? cert.certificate_name.toLowerCase() : '';
        const className = cert.class_name ? cert.class_name.toLowerCase() : '';

        const matchesSearch = certName.includes(searchQuery.toLowerCase()) ||
            studentName.includes(searchQuery.toLowerCase()) ||
            className.includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (cert.status === statusFilter);

        return matchesSearch && matchesStatus;
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredCertificates.length / certificatesPerPage);
    const startIndex = (currentPage - 1) * certificatesPerPage;
    const endIndex = startIndex + certificatesPerPage;
    const paginatedCertificates = filteredCertificates.slice(startIndex, endIndex);

    const handlePageChange = (event, page) => {
        setCurrentPage(page);
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
                        <SchoolIcon sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }} />
                        Certificate Management
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: '#6b7280',
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            mb: 3
                        }}
                    >
                        Manage student certificates, upload new certificates, and track certificate status
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleUploadClick}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                    >
                        Upload Certificate
                    </Button>
                </Box>
            </Box>

            {/* Error Display */}
            {alert && (
                <Box sx={{
                    maxWidth: { xs: '100%', sm: '1200px' },
                    mx: 'auto',
                    mb: 3,
                    px: { xs: 2, sm: 3 }
                }}>
                    <Alert severity={alert.type} sx={{ borderRadius: '12px' }} onClose={() => setAlert(null)}>
                        {alert.message}
                    </Alert>
                </Box>
            )}

            {/* Modern Search and Filters */}
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
                        <SearchIcon sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }} />
                        Search & Filters
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search certificates by student name, certificate name, or class..."
                            value={searchQuery}
                            onChange={handleSearch}
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
                            }}>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
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
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="expired">Expired</MenuItem>
                                <MenuItem value="revoked">Revoked</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </Paper>
            </Box>

            {/* Modern Certificate Cards */}
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
                ) : !searchQuery.trim() ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
                        <SchoolIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            Search for certificates
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Enter a search term to view and manage certificates
                        </Typography>
                    </Paper>
                ) : paginatedCertificates.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '16px' }}>
                        <SchoolIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            No certificates found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Try adjusting your search criteria or filters
                        </Typography>
                    </Paper>
                ) : (
                    <>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                            gap: { xs: 2, sm: 3 }
                        }}>
                            {paginatedCertificates.map((certificate) => (
                                <Box key={certificate.id} sx={{ width: '100%', minWidth: 0 }}>
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
                                        {/* Certificate Header */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                                                <Avatar sx={{
                                                    bgcolor: certificate.status === 'active' ? '#10b981' :
                                                        certificate.status === 'expired' ? '#f59e0b' :
                                                            certificate.status === 'revoked' ? '#ef4444' : '#6b7280',
                                                    width: 48,
                                                    height: 48
                                                }}>
                                                    <SchoolIcon sx={{ color: 'white', fontSize: 24 }} />
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
                                                        {certificate.certificate_name}
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
                                                        {certificate.student_name}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Chip
                                                label={certificate.status}
                                                color={certificate.status === 'active' ? 'success' :
                                                    certificate.status === 'expired' ? 'warning' : 'error'}
                                                size="small"
                                                sx={{ fontSize: '0.75rem' }}
                                            />
                                        </Box>

                                        {/* Certificate Details */}
                                        <Box sx={{ mb: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <PersonIcon sx={{ fontSize: 16, color: '#6b7280' }} />
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
                                                    {certificate.student_name}
                                                </Typography>
                                            </Box>
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
                                                    {certificate.class_name}
                                                </Typography>
                                            </Box>
                                            {certificate.session_date && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <CalendarIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#374151',
                                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                        }}
                                                    >
                                                        Session: {new Date(certificate.session_date).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {certificate.expiration_date && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CalendarIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: '#374151',
                                                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                        }}
                                                    >
                                                        Expires: {new Date(certificate.expiration_date).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Certificate Actions */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            pt: 2,
                                            borderTop: '1px solid #f3f4f6'
                                        }}>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="Download Certificate">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDownload(certificate)}
                                                        sx={{
                                                            color: '#6b7280',
                                                            '&:hover': { color: '#3b82f6' }
                                                        }}
                                                    >
                                                        <DownloadIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Certificate">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(certificate)}
                                                        sx={{
                                                            color: '#6b7280',
                                                            '&:hover': { color: '#ef4444' }
                                                        }}
                                                    >
                                                        <DeleteIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Box>
                            ))}
                        </Box>

                        {/* Modern Pagination */}
                        {totalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <Pagination
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={handlePageChange}
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
                        )}

                        {/* Results count */}
                        {searchQuery.trim() && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Showing {paginatedCertificates.length} of {filteredCertificates.length} certificates
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* Modern Upload Dialog */}
            <Dialog
                open={showUploadDialog}
                onClose={handleUploadClose}
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
                            <AddIcon sx={{ color: 'white', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                                Upload Certificate
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Select student and class, then upload certificate file
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel sx={{
                                '&.Mui-focused': { color: '#3b82f6' }
                            }}>Select Student</InputLabel>
                            <Select
                                value={selectedStudent}
                                label="Select Student"
                                onChange={(e) => setSelectedStudent(e.target.value)}
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
                                {Array.isArray(students) && students.map((student) => (
                                    <MenuItem key={student.id} value={student.id}>
                                        {student.first_name} {student.last_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel sx={{
                                '&.Mui-focused': { color: '#3b82f6' }
                            }}>Select Class</InputLabel>
                            <Select
                                value={selectedClass}
                                label="Select Class"
                                onChange={(e) => setSelectedClass(e.target.value)}
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
                                {classes.map((classItem) => (
                                    <MenuItem key={classItem.id} value={classItem.id}>
                                        {classItem.title}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <CertificateUpload
                            onUpload={handleUpload}
                            studentId={selectedStudent}
                            classId={selectedClass}
                            disabled={!selectedStudent || !selectedClass}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button
                        onClick={handleUploadClose}
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CertificateManagementPage; 