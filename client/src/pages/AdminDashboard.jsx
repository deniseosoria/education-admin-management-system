import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import UserManagement from '../components/admin/UserManagement';
import ClassManagement from '../components/admin/ClassManagement';
import CertificateManagement from '../components/admin/CertificateManagement';
import EnrollmentManagement from '../components/admin/EnrollmentManagement';
import FinancialManagement from '../components/admin/FinancialManagement';
import NotificationCenter from '../components/admin/NotificationCenter';
import WaitlistManagement from '../components/admin/WaitlistManagement';
// import SystemSettings from '../components/admin/SystemSettings';
import adminService from '../services/adminService';
import './AdminDashboard.css';

function AdminDashboard({ defaultSection = 'analytics' }) {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSection, setActiveSection] = useState(defaultSection);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Memoize the navigation items to prevent unnecessary re-renders
    const navigationItems = useMemo(() => [
        { id: 'analytics', label: 'Analytics' },
        { id: 'users', label: 'User Management' },
        { id: 'classes', label: 'Class Management' },
        { id: 'waitlist', label: 'Waitlist Management' },
        { id: 'enrollments', label: 'Enrollment Management' },
        { id: 'financial', label: 'Financial Management' },
        { id: 'certificates', label: 'Certificate Management' },
        { id: 'notifications', label: 'Notifications' },
    ], []);

    // Fetch analytics data from backend
    const fetchAnalyticsData = async () => {
        setLoading(true);
        setError(null);
        try {
            const analyticsData = await adminService.fetchAllAnalytics();
            setDashboardData(analyticsData);
        } catch (err) {
            setError(err.message || 'Failed to load analytics data');
            console.error('Error fetching analytics data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Only load data for analytics section
    useEffect(() => {
        if (activeSection === 'analytics' && !dashboardData && !authLoading) {
            fetchAnalyticsData();
        }
    }, [activeSection, dashboardData, authLoading]);

    // Update active section when route changes
    useEffect(() => {
        const path = location.pathname.split('/').pop();
        if (path && path !== 'admin') {
            setActiveSection(path);
        }
    }, [location]);

    const handleSectionChange = (section) => {
        if (section === activeSection) return; // Prevent unnecessary navigation
        setActiveSection(section);
        navigate(`/admin/${section}`);
        // Close sidebar on mobile after navigation
        setIsSidebarOpen(false);
    };

    // Memoize the rendered section to prevent unnecessary re-renders
    const renderedSection = useMemo(() => {
        if (!user) return null;

        switch (activeSection) {
            case 'analytics':
                return dashboardData ? <AnalyticsDashboard data={dashboardData} /> : null;
            case 'users':
                return <UserManagement />;
            case 'classes':
                return <ClassManagement />;
            case 'waitlist':
                return <WaitlistManagement />;
            case 'enrollments':
                return <EnrollmentManagement />;
            case 'financial':
                return <FinancialManagement />;
            case 'certificates':
                return <CertificateManagement />;
            case 'notifications':
                return <NotificationCenter />;
            // case 'settings':
            //     return <SystemSettings />;
            default:
                return <div>Select a section from the sidebar</div>;
        }
    }, [activeSection, dashboardData, user]);

    // Show loading state while auth is loading
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Show error if user is not admin
    if (!user || user.role !== 'admin') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <p className="font-medium">Access Denied</p>
                    <p>You do not have permission to access this page.</p>
                </div>
            </div>
        );
    }

    // Show loading state for analytics data
    if (loading && activeSection === 'analytics') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <p className="font-medium">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Show loading state for rendered section
    if (!renderedSection) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Main render
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile Header with Toggle Button */}
            <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isSidebarOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
                            <p className="text-sm text-gray-500">
                                Welcome, {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email || 'Admin'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {/* Desktop Header */}
                <div className="hidden lg:block mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Welcome, {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email || 'Admin'}
                    </p>
                </div>

                <div className="flex gap-4 lg:gap-8">
                    {/* Mobile Sidebar Overlay */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar Navigation */}
                    <div className={`
                        fixed lg:sticky left-0 w-64 bg-gray-50 shadow-lg lg:shadow-none border-r border-gray-200 lg:border-r-0
                        transform transition-transform duration-300 ease-in-out lg:transform-none
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                        lg:flex-shrink-0
                        lg:h-auto
                        lg:self-start
                        inset-y-0 lg:inset-y-auto
                        h-screen lg:h-auto
                        admin-dashboard-sidebar
                    `}
                    >
                        <div className="flex flex-col h-full max-h-screen">
                            {/* Mobile Sidebar Header */}
                            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-gray-50">
                                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    style={{ minHeight: '40px', minWidth: '40px' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Navigation Items */}
                            <nav className="flex-1 p-4 lg:p-0 space-y-1 overflow-y-auto">
                                {navigationItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSectionChange(item.id)}
                                        className={`w-full flex items-center px-4 py-3 lg:py-2 text-sm font-medium rounded-md transition-colors ${activeSection === item.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                        style={{ minHeight: '48px' }}
                                    >
                                        <span className="text-left">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full lg:w-auto min-w-0">
                        {renderedSection}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default React.memo(AdminDashboard); 