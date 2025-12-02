const {
    getDashboardSummary: getDashboardSummaryModel,
    getRevenueAnalytics: getRevenueAnalyticsModel,
    getRevenueByClass: getRevenueByClassModel,
    getEnrollmentTrends: getEnrollmentTrendsModel,
    getClassEnrollmentStats: getClassEnrollmentStatsModel,
    getUserEngagementMetrics: getUserEngagementMetricsModel,
    getUserActivityTrends: getUserActivityTrendsModel
} = require('../models/analyticsModel');

// @desc    Get dashboard summary
// @route   GET /api/admin/analytics/summary
// @access  Private/Admin
const getDashboardSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        console.log('Dashboard summary request - Query params:', req.query);
        console.log('Dashboard summary request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const summary = await getDashboardSummaryModel({ startDate, endDate });
        res.json(summary);
    } catch (error) {
        console.error('Get dashboard summary error:', error);
        res.status(500).json({ error: 'Failed to get dashboard summary' });
    }
};

// @desc    Get revenue analytics
// @route   GET /api/admin/analytics/revenue
// @access  Private/Admin
const getRevenueAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        console.log('Revenue analytics request - Query params:', req.query);
        console.log('Revenue analytics request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const analytics = await getRevenueAnalyticsModel({
            startDate,
            endDate,
            groupBy: groupBy || 'month'
        });

        res.json(analytics);
    } catch (error) {
        console.error('Get revenue analytics error:', error);
        res.status(500).json({ error: 'Failed to get revenue analytics' });
    }
};

// @desc    Get revenue by class
// @route   GET /api/admin/analytics/revenue/classes
// @access  Private/Admin
const getRevenueByClass = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        console.log('Revenue by class request - Query params:', req.query);
        console.log('Revenue by class request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const analytics = await getRevenueByClassModel({
            startDate,
            endDate
        });

        res.json(analytics);
    } catch (error) {
        console.error('Get revenue by class error:', error);
        res.status(500).json({ error: 'Failed to get revenue by class' });
    }
};

// @desc    Get enrollment trends
// @route   GET /api/admin/analytics/enrollments/trends
// @access  Private/Admin
const getEnrollmentTrends = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        console.log('Enrollment trends request - Query params:', req.query);
        console.log('Enrollment trends request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const trends = await getEnrollmentTrendsModel({
            startDate,
            endDate,
            groupBy: groupBy || 'month'
        });

        res.json(trends);
    } catch (error) {
        console.error('Get enrollment trends error:', error);
        res.status(500).json({ error: 'Failed to get enrollment trends' });
    }
};

// @desc    Get class enrollment statistics
// @route   GET /api/admin/analytics/enrollments/classes
// @access  Private/Admin
const getClassEnrollmentStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        console.log('Class enrollment stats request - Query params:', req.query);
        console.log('Class enrollment stats request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const stats = await getClassEnrollmentStatsModel({
            startDate,
            endDate
        });

        res.json(stats);
    } catch (error) {
        console.error('Get class enrollment stats error:', error);
        res.status(500).json({ error: 'Failed to get class enrollment statistics' });
    }
};

// @desc    Get user engagement metrics
// @route   GET /api/admin/analytics/users/engagement
// @access  Private/Admin
const getUserEngagementMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        console.log('User engagement metrics request - Query params:', req.query);
        console.log('User engagement metrics request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const metrics = await getUserEngagementMetricsModel({
            startDate,
            endDate
        });

        res.json(metrics);
    } catch (error) {
        console.error('Get user engagement metrics error:', error);
        res.status(500).json({ error: 'Failed to get user engagement metrics' });
    }
};

// @desc    Get user activity trends
// @route   GET /api/admin/analytics/users/activity
// @access  Private/Admin
const getUserActivityTrends = async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        console.log('User activity trends request - Query params:', req.query);
        console.log('User activity trends request - startDate:', startDate, 'endDate:', endDate);

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format. Dates must be in YYYY-MM-DD format',
                received: { startDate, endDate }
            });
        }

        // Validate that startDate is before or equal to endDate
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                error: 'Start date must be before or equal to end date',
                received: { startDate, endDate }
            });
        }

        const trends = await getUserActivityTrendsModel({
            startDate,
            endDate,
            groupBy: groupBy || 'month'
        });

        res.json(trends);
    } catch (error) {
        console.error('Get user activity trends error:', error);
        res.status(500).json({ error: 'Failed to get user activity trends' });
    }
};

module.exports = {
    getDashboardSummary,
    getRevenueAnalytics,
    getRevenueByClass,
    getEnrollmentTrends,
    getClassEnrollmentStats,
    getUserEngagementMetrics,
    getUserActivityTrends
}; 