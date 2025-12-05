import React, { useState, useEffect, useMemo, useCallback } from 'react';
import adminService from '../../services/adminService';
import { useNotifications } from '../../utils/notificationUtils';
import { API_BASE_URL } from '../../config/apiConfig.js';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Box, Grid, Paper, Typography, Select, MenuItem, FormControl, InputLabel, Button, Alert, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Download } from '@mui/icons-material';
import { parseISO, isValid, format, subYears, startOfDay, endOfDay, differenceInDays } from 'date-fns';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

// Feature flag for export functionality
const ENABLE_EXPORT = false;

// Add this utility function at the top of the file, after imports
const parseNumericValue = (value) => {
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    return value || 0;
};

// Helper to ensure value is a Date object or null
const toDateOrNull = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    const parsed = parseISO(val);
    return isValid(parsed) ? parsed : null;
};

// Helper to format date for API calls
const formatDateForAPI = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
        const parsed = parseISO(date);
        return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : '';
    }
    return format(date, 'yyyy-MM-dd');
};

// Helper to get default date range (end date to one year before)
const getDefaultDateRange = () => {
    const today = new Date();
    // Set to start of day to avoid timezone issues
    const endDate = startOfDay(today);
    const startDate = startOfDay(subYears(today, 1)); // Always 1 year before end date
    return { startDate, endDate };
};



function AnalyticsDashboard() {
    const { showSuccess, showError } = useNotifications();
    const [analyticsData, setAnalyticsData] = useState({
        summary: {
            totalRevenue: 0,
            totalEnrollments: 0,
            activeUsers: 0,
            averageAttendance: 0
        },
        revenue: [],
        revenueByClass: [],
        enrollmentTrends: [],
        classEnrollments: [],
        userEngagement: [],
        userActivity: []
    });
    const [loadingStates, setLoadingStates] = useState({
        summary: true,
        revenue: true,
        revenueByClass: true,
        enrollmentTrends: true,
        classEnrollments: true,
        userEngagement: true,
        userActivity: true
    });
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState(getDefaultDateRange());
    const [selectedMetric, setSelectedMetric] = useState('revenue');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());


    // Memoize the date range string to prevent unnecessary re-renders
    const dateRangeString = useMemo(() => {
        const result = {
            startDate: formatDateForAPI(dateRange.startDate),
            endDate: formatDateForAPI(dateRange.endDate)
        };
        console.log('Date range string calculated:', result);
        return result;
    }, [dateRange.startDate, dateRange.endDate]);

    // Memoize the updateLoadingState function
    const updateLoadingState = useCallback((key, isLoading) => {
        setLoadingStates(prev => ({
            ...prev,
            [key]: isLoading
        }));
    }, []);

    // Memoize the fetchAnalyticsData function
    const fetchAnalyticsData = useCallback(async () => {
        try {
            setLoadingStates(prev => ({
                ...prev,
                summary: true,
                revenue: true,
                revenueByClass: true,
                enrollmentTrends: true,
                classEnrollments: true,
                userEngagement: true,
                userActivity: true
            }));

            // Log the date range being sent
            console.log('Fetching analytics with date range:', {
                startDate: formatDateForAPI(dateRange.startDate),
                endDate: formatDateForAPI(dateRange.endDate)
            });

            // Fetch all analytics data in parallel
            const [
                summaryRes,
                revenueByClassRes,
                classEnrollmentsRes,
                userEngagementRes,
                revenueRes,
                enrollmentTrendsRes
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/analytics/summary?startDate=${formatDateForAPI(dateRange.startDate)}&endDate=${formatDateForAPI(dateRange.endDate)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE_URL}/admin/analytics/revenue/classes?startDate=${formatDateForAPI(dateRange.startDate)}&endDate=${formatDateForAPI(dateRange.endDate)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE_URL}/admin/analytics/enrollments/classes?startDate=${formatDateForAPI(dateRange.startDate)}&endDate=${formatDateForAPI(dateRange.endDate)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE_URL}/admin/analytics/users/engagement?startDate=${formatDateForAPI(dateRange.startDate)}&endDate=${formatDateForAPI(dateRange.endDate)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE_URL}/admin/analytics/revenue?startDate=${formatDateForAPI(dateRange.startDate)}&endDate=${formatDateForAPI(dateRange.endDate)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${API_BASE_URL}/admin/analytics/enrollments/trends?startDate=${formatDateForAPI(dateRange.startDate)}&endDate=${formatDateForAPI(dateRange.endDate)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (!summaryRes.ok) throw new Error('Failed to fetch summary');
            if (!revenueByClassRes.ok) throw new Error('Failed to fetch revenue by class');
            if (!classEnrollmentsRes.ok) throw new Error('Failed to fetch class enrollments');
            if (!userEngagementRes.ok) throw new Error('Failed to fetch user engagement');
            if (!revenueRes.ok) throw new Error('Failed to fetch revenue trends');
            if (!enrollmentTrendsRes.ok) throw new Error('Failed to fetch enrollment trends');

            const summary = await summaryRes.json();
            const revenueByClass = await revenueByClassRes.json();
            const classEnrollments = await classEnrollmentsRes.json();
            const userEngagement = await userEngagementRes.json();
            const revenue = await revenueRes.json();
            const enrollmentTrends = await enrollmentTrendsRes.json();

            console.log('Analytics API Responses:', {
                summary,
                revenueByClass,
                classEnrollments,
                userEngagement,
                revenue,
                enrollmentTrends
            });

            // Debug enrollment trends specifically
            console.log('Enrollment Trends Data:', {
                raw: enrollmentTrends,
                isArray: Array.isArray(enrollmentTrends),
                length: Array.isArray(enrollmentTrends) ? enrollmentTrends.length : 'not array',
                sample: Array.isArray(enrollmentTrends) && enrollmentTrends.length > 0 ? enrollmentTrends[0] : 'no data'
            });

            setAnalyticsData({
                summary: {
                    monthlyRevenue: Number(summary.monthly_revenue) || 0,
                    activeEnrollments: Number(summary.active_enrollments) || 0,
                    activeUsers: Number(summary.active_users) || 0,
                    activeClasses: Number(summary.active_classes) || 0,
                    recentPayments: Number(summary.recent_payments) || 0,
                    recentCertificates: Number(summary.recent_certificates) || 0,
                    waitlistCount: Number(summary.waitlist_count) || 0,
                    enrollmentRate: Number(summary.enrollment_rate) || 0,
                },
                revenue: Array.isArray(revenue) ? revenue : [],
                revenueByClass: Array.isArray(revenueByClass) ? revenueByClass : [],
                enrollmentTrends: Array.isArray(enrollmentTrends) ? enrollmentTrends : [],
                classEnrollments: Array.isArray(classEnrollments) ? classEnrollments : [],
                userEngagement: Array.isArray(userEngagement) ? userEngagement : [],
                userActivity: []
            });

            // Update last refresh time
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.message);
            showError('Failed to load analytics data');
        } finally {
            setLoadingStates(prev => ({
                ...prev,
                summary: false,
                revenue: false,
                revenueByClass: false,
                enrollmentTrends: false,
                classEnrollments: false,
                userEngagement: false,
                userActivity: false
            }));
        }
    }, [dateRange, showError]);

    // Memoize the handleDateRangeChange function with validation
    const handleDateRangeChange = useCallback((newDateRange) => {
        console.log('handleDateRangeChange called with:', newDateRange);
        setDateRange(prev => {
            let updated = { ...prev, ...newDateRange };
            console.log('Date range updated from:', prev, 'to:', updated);

            // If end date is being changed, automatically adjust start date to one year before
            if (newDateRange.endDate && newDateRange.endDate !== prev.endDate) {
                const oneYearBefore = startOfDay(subYears(newDateRange.endDate, 1));
                updated = {
                    ...updated,
                    startDate: oneYearBefore
                };
                console.log('End date changed, auto-adjusting start date to:', oneYearBefore);
            }

            // Validate dates
            if (updated.startDate && updated.endDate) {
                if (updated.startDate > updated.endDate) {
                    showError('Start date cannot be after end date');
                    return prev;
                }
            }

            // Log when date range was manually changed
            if (newDateRange.startDate || newDateRange.endDate) {
                console.log('Date range manually changed at:', new Date().toLocaleTimeString());
            }

            return updated;
        });
    }, [showError]);

    // Memoize the handleExportReport function
    const handleExportReport = useCallback(async () => {
        if (!ENABLE_EXPORT) {
            showError('Export functionality is not yet available');
            return;
        }

        try {
            const filters = {
                startDate: dateRangeString.startDate,
                endDate: dateRangeString.endDate
            };
            const data = await adminService.exportAnalyticsReport(selectedMetric, filters);
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${selectedMetric}-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showSuccess('Analytics report exported successfully');
        } catch (error) {
            handleError(error, 'Failed to export analytics report');
        }
    }, [dateRange, dateRangeString, selectedMetric, showError, showSuccess]);

    // Memoize the handleError function
    const handleError = useCallback((error, customMessage = 'An error occurred') => {
        console.error(error);
        setError(error.message || customMessage);
        showError(error.message || customMessage);
    }, [showError]);

    // Effect to fetch data when component mounts with default dates
    useEffect(() => {
        const mountTime = new Date();
        console.log('Component mounted at:', mountTime.toLocaleTimeString());
        console.log('Component mounted, initial date range:', dateRange);
        console.log('Default date range function result:', getDefaultDateRange());
        console.log('Current date:', new Date());
        console.log('Formatted dates for API:', {
            startDate: formatDateForAPI(dateRange.startDate),
            endDate: formatDateForAPI(dateRange.endDate)
        });
        fetchAnalyticsData();
    }, []); // Empty dependency array means this runs once on mount

    // Effect to update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Effect to automatically adjust start date when end date changes
    useEffect(() => {
        if (dateRange.endDate && dateRange.startDate) {
            const oneYearBefore = startOfDay(subYears(dateRange.endDate, 1));

            // Only auto-adjust if the start date is not already approximately one year before
            // Allow for a small tolerance (within 5 days) to avoid unnecessary updates
            const daysDifference = differenceInDays(dateRange.endDate, dateRange.startDate);
            if (daysDifference < 360 || daysDifference > 370) { // 365 ± 5 days
                setDateRange(prev => ({
                    ...prev,
                    startDate: oneYearBefore
                }));
            }
        }
    }, [dateRange.endDate]);

    // Memoize the summary cards to prevent unnecessary re-renders
    const summaryCards = useMemo(() => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow">
                <h3 className="text-sm sm:text-base font-medium text-gray-500">Monthly Revenue</h3>
                {loadingStates.summary ? (
                    <CircularProgress size={20} className="mt-3" />
                ) : (
                    <>
                        <p className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900">
                            ${parseNumericValue(analyticsData.summary?.monthlyRevenue).toLocaleString()}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            {parseNumericValue(analyticsData.summary?.recentPayments)} recent payments
                        </p>
                    </>
                )}
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-lg shadow">
                <h3 className="text-sm sm:text-base font-medium text-gray-500">Active Enrollments</h3>
                {loadingStates.summary ? (
                    <CircularProgress size={20} className="mt-3" />
                ) : (
                    <>
                        <p className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900">
                            {parseNumericValue(analyticsData.summary?.activeEnrollments)}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            {parseNumericValue(analyticsData.summary?.enrollmentRate)}% enrollment rate
                        </p>
                    </>
                )}
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-lg shadow">
                <h3 className="text-sm sm:text-base font-medium text-gray-500">Active Users</h3>
                {loadingStates.summary ? (
                    <CircularProgress size={20} className="mt-3" />
                ) : (
                    <>
                        <p className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900">
                            {parseNumericValue(analyticsData.summary?.activeUsers)}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            {parseNumericValue(analyticsData.summary?.recentCertificates)} recent certificates
                        </p>
                    </>
                )}
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-lg shadow">
                <h3 className="text-sm sm:text-base font-medium text-gray-500">Active Classes</h3>
                {loadingStates.summary ? (
                    <CircularProgress size={20} className="mt-3" />
                ) : (
                    <>
                        <p className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900">
                            {parseNumericValue(analyticsData.summary?.activeClasses)}
                        </p>
                        <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            {parseNumericValue(analyticsData.summary?.waitlistCount)} on waitlist
                        </p>
                    </>
                )}
            </div>
        </div>
    ), [analyticsData.summary, loadingStates.summary]);


    return (
        <Box className="analytics-dashboard">
            {error && (
                <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
                <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <FormControl sx={{ minWidth: 160 }}>
                            <InputLabel>Metric</InputLabel>
                            <Select
                                value={selectedMetric}
                                label="Metric"
                                onChange={(e) => setSelectedMetric(e.target.value)}
                                size="medium"
                            >
                                <MenuItem value="summary">Summary</MenuItem>
                                <MenuItem value="revenue">Revenue</MenuItem>
                                <MenuItem value="revenue-by-class">Revenue by Class</MenuItem>
                                <MenuItem value="enrollments">Enrollments</MenuItem>
                                <MenuItem value="class-enrollments">Class Enrollments</MenuItem>
                                <MenuItem value="user-engagement">User Engagement</MenuItem>
                                <MenuItem value="user-activity">User Activity</MenuItem>
                            </Select>
                        </FormControl>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Start Date"
                                value={toDateOrNull(dateRange.startDate)}
                                onChange={(date) => handleDateRangeChange({ startDate: date })}
                                maxDate={dateRange.endDate || undefined}
                                slotProps={{
                                    textField: {
                                        error: !dateRange.startDate,
                                        helperText: !dateRange.startDate ? 'Start date is required' : '',
                                        size: "medium",
                                        sx: { minWidth: 160 }
                                    }
                                }}
                            />
                            <DatePicker
                                label="End Date"
                                value={toDateOrNull(dateRange.endDate)}
                                onChange={(date) => handleDateRangeChange({ endDate: date })}
                                minDate={dateRange.startDate || undefined}
                                slotProps={{
                                    textField: {
                                        error: !dateRange.endDate,
                                        helperText: !dateRange.endDate ? 'End date is required' : 'Changing this will auto-adjust start date to 1 year before',
                                        size: "medium",
                                        sx: { minWidth: 160 }
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </div>
                </div>

                {/* Refresh Button Section */}
                <div className="mt-4">
                    <button
                        onClick={fetchAnalyticsData}
                        className="px-8 py-3 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 hover:border-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        title={lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : 'Click to refresh data'}
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Data
                        </div>
                        {lastRefresh && (
                            <div className="text-xs text-blue-100 mt-1 opacity-90">
                                Last: {lastRefresh.toLocaleTimeString()}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Export Section */}
            <div className="border-t border-gray-200 pt-4 mb-8">
                <div className="flex justify-end">
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleExportReport}
                        disabled={!ENABLE_EXPORT}
                        title={!ENABLE_EXPORT ? "Export functionality coming soon" : "Export Report"}
                        size="medium"
                        sx={{
                            borderColor: '#6B7280',
                            color: '#374151',
                            '&:hover': {
                                borderColor: '#4B5563',
                                backgroundColor: '#F9FAFB'
                            }
                        }}
                    >
                        Export Report
                    </Button>
                </div>
            </div>

            {summaryCards}

            {/* Additional Metrics */}
            <Grid container spacing={3} sx={{ mt: 4 }}>
                <Grid item xs={12} md={6}>
                    <Paper className="p-4">
                        <Typography variant="h6" gutterBottom>
                            Top Performing Classes
                        </Typography>
                        {loadingStates.classEnrollments ? (
                            <div className="flex justify-center items-center h-32">
                                <CircularProgress />
                            </div>
                        ) : (
                            <List>
                                {analyticsData.classEnrollments && analyticsData.classEnrollments.length > 0 ? (
                                    analyticsData.classEnrollments.map((cls, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={cls.class_name || cls.className}
                                                secondary={`${Number(cls.total_enrollments || cls.enrollment_count || 0)} enrollments (${Number(cls.enrollment_rate || 0).toFixed(2)}% rate)`}
                                            />
                                        </ListItem>
                                    ))
                                ) : (
                                    <ListItem>
                                        <ListItemText primary="No data available" />
                                    </ListItem>
                                )}
                            </List>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper className="p-4">
                        <Typography variant="h6" gutterBottom>
                            Revenue by Class
                        </Typography>
                        {loadingStates.revenueByClass ? (
                            <div className="flex justify-center items-center h-32">
                                <CircularProgress />
                            </div>
                        ) : (
                            <List>
                                {analyticsData.revenueByClass && analyticsData.revenueByClass.length > 0 ? (
                                    analyticsData.revenueByClass.map((cls, index) => (
                                        <ListItem key={index}>
                                            <ListItemText
                                                primary={cls.class_name}
                                                secondary={`$${Number(cls.net_revenue || 0).toLocaleString()} (${Number(cls.enrollment_count || 0)} enrollments)`}
                                            />
                                        </ListItem>
                                    ))
                                ) : (
                                    <ListItem>
                                        <ListItemText primary="No data available" />
                                    </ListItem>
                                )}
                            </List>
                        )}
                    </Paper>
                </Grid>

            </Grid>
        </Box>
    );
}

// Export the memoized component
const MemoizedAnalyticsDashboard = React.memo(AnalyticsDashboard);
export default MemoizedAnalyticsDashboard; 