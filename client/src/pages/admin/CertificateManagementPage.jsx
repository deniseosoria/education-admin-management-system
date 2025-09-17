import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Tabs,
    Tab,
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
    Pagination
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Add as AddIcon,
    Close as CloseIcon
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
        <Container maxWidth="xl">
            <Box sx={{ my: 4 }}>
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}>
                    <Typography variant="h4" component="h1">
                        Certificate Management
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleUploadClick}
                    >
                        Upload Certificate
                    </Button>
                </Box>

                {/* Alert Messages */}
                {alert && (
                    <Alert
                        severity={alert.type}
                        sx={{ mb: 2 }}
                        onClose={() => setAlert(null)}
                    >
                        {alert.message}
                    </Alert>
                )}

                {/* Search and Filters */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Enter search term to view certificates..."
                            value={searchQuery}
                            onChange={handleSearch}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <IconButton
                            onClick={() => setShowFilters(!showFilters)}
                            color={showFilters ? 'primary' : 'default'}
                        >
                            <FilterIcon />
                        </IconButton>
                    </Box>

                    {/* Filters */}
                    {showFilters && (
                        <Box sx={{
                            display: 'flex',
                            gap: 2,
                            mt: 2,
                            alignItems: 'center'
                        }}>
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="expired">Expired</MenuItem>
                                    <MenuItem value="revoked">Revoked</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </Paper>

                {/* Loading State */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Certificate Viewer */}
                {!loading && (
                    <>
                        <CertificateViewer
                            certificates={paginatedCertificates}
                            onDownload={handleDownload}
                            onDelete={handleDelete}
                            onBulkDelete={handleBulkDelete}
                        />

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Pagination
                                    count={totalPages}
                                    page={currentPage}
                                    onChange={handlePageChange}
                                    color="primary"
                                    size="large"
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

                {/* Upload Dialog */}
                <Dialog
                    open={showUploadDialog}
                    onClose={handleUploadClose}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        Upload Certificate
                        <IconButton
                            aria-label="close"
                            onClick={handleUploadClose}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mb: 3, mt: 2 }}>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Select Student</InputLabel>
                                <Select
                                    value={selectedStudent}
                                    label="Select Student"
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                >
                                    {Array.isArray(students) && students.map((student) => (
                                        <MenuItem key={student.id} value={student.id}>
                                            {student.first_name} {student.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Select Class</InputLabel>
                                <Select
                                    value={selectedClass}
                                    label="Select Class"
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    {classes.map((classItem) => (
                                        <MenuItem key={classItem.id} value={classItem.id}>
                                            {classItem.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <CertificateUpload
                            onUpload={handleUpload}
                            studentId={selectedStudent}
                            classId={selectedClass}
                            disabled={!selectedStudent || !selectedClass}
                        />
                    </DialogContent>
                </Dialog>
            </Box>
        </Container>
    );
};

export default CertificateManagementPage; 