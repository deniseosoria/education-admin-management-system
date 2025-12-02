const pool = require('../config/db');

/*
 * ANALYTICS MODEL - Class Session Based
 * 
 * All analytics are now calculated based on ACTIVE and COMPLETED class sessions
 * within the user's selected date range, rather than general date filters.
 * 
 * This approach provides more accurate insights for child care businesses:
 * - Revenue is calculated for actual class periods
 * - Enrollments are counted for specific class sessions
 * - Performance metrics reflect actual class delivery
 * - Date ranges represent when classes actually happened
 * 
 * Key changes:
 * - All queries now JOIN with class_sessions table
 * - Date filters apply to session_date and end_date
 * - Only 'scheduled' and 'completed' sessions are included
 * - Enrollments and payments are linked to specific sessions
 */
// Get revenue analytics based on class sessions
async function getRevenueAnalytics({ startDate, endDate, groupBy = 'month' }) {
    const dateTrunc = groupBy === 'day' ? 'day' : 'month';

    console.log('Getting revenue analytics for class sessions:', { startDate, endDate, groupBy, dateTrunc });

    const query = `
        WITH session_revenue AS (
            SELECT 
                cs.id as session_id,
                cs.session_date,
                cs.end_date,
                c.id as class_id,
                c.title as class_name,
                DATE_TRUNC($1, cs.session_date) as period,
                SUM(p.amount) as total_revenue,
                COUNT(p.id) as transaction_count,
                SUM(CASE WHEN p.refund_status = 'processed' THEN p.refund_amount ELSE 0 END) as total_refunds,
                COUNT(CASE WHEN p.refund_status = 'processed' THEN 1 END) as refund_count
            FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            LEFT JOIN enrollments e ON cs.id = e.session_id AND e.enrollment_status IN ('active', 'approved')
            LEFT JOIN payments p ON e.user_id = p.user_id AND e.class_id = p.class_id AND p.status = 'completed'
            WHERE cs.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cs.status IN ('scheduled', 'completed')
            AND (
                (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $2 AND $3) OR
                (cs.end_date IS NULL AND cs.session_date BETWEEN $2 AND $3)
            )
            GROUP BY cs.id, cs.session_date, cs.end_date, c.id, c.title, DATE_TRUNC($1, cs.session_date)
        )
        SELECT 
            period,
            SUM(total_revenue) as total_revenue,
            SUM(transaction_count) as transaction_count,
            SUM(total_refunds) as total_refunds,
            SUM(refund_count) as refund_count,
            SUM(total_revenue - total_refunds) as net_revenue,
            ROUND((SUM(total_refunds)::numeric / NULLIF(SUM(total_revenue), 0) * 100), 2) as refund_rate
        FROM session_revenue
        GROUP BY period
        ORDER BY period DESC
    `;

    try {
        const { rows } = await pool.query(query, [dateTrunc, startDate, endDate]);
        console.log('Revenue analytics result:', { rowCount: rows.length, sample: rows[0] });
        return rows;
    } catch (error) {
        console.error('Error in revenue analytics query:', error);
        throw error;
    }
}

// Get revenue by class based on class sessions
async function getRevenueByClass({ startDate, endDate }) {
    console.log('Getting revenue by class for class sessions:', { startDate, endDate });

    const query = `
        WITH session_revenue AS (
            SELECT 
                c.id as class_id,
                c.title as class_name,
                cs.id as session_id,
                cs.session_date,
                cs.end_date,
                COUNT(DISTINCT e.id) as enrollment_count,
                SUM(p.amount) as total_revenue,
                SUM(CASE WHEN p.refund_status = 'processed' THEN p.refund_amount ELSE 0 END) as total_refunds,
                (SUM(p.amount) - SUM(CASE WHEN p.refund_status = 'processed' THEN p.refund_amount ELSE 0 END)) as net_revenue,
                ROUND(AVG(p.amount), 2) as average_price
            FROM classes c
            JOIN class_sessions cs ON c.id = cs.class_id
            LEFT JOIN enrollments e ON cs.id = e.session_id AND e.enrollment_status IN ('active', 'approved')
            LEFT JOIN payments p ON e.user_id = p.user_id AND e.class_id = p.class_id AND p.status = 'completed'
            WHERE c.deleted_at IS NULL
            AND cs.deleted_at IS NULL
            AND cs.status IN ('scheduled', 'completed')
            AND (
                (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $1 AND $2) OR
                (cs.end_date IS NULL AND cs.session_date BETWEEN $1 AND $2)
            )
            GROUP BY c.id, c.title, cs.id, cs.session_date, cs.end_date
        )
        SELECT 
            class_id,
            class_name,
            SUM(enrollment_count) as enrollment_count,
            SUM(total_revenue) as total_revenue,
            SUM(total_refunds) as total_refunds,
            SUM(net_revenue) as net_revenue,
            ROUND(AVG(average_price), 2) as average_price
        FROM session_revenue
        GROUP BY class_id, class_name
        ORDER BY SUM(net_revenue) DESC
    `;

    try {
        const { rows } = await pool.query(query, [startDate, endDate]);
        console.log('Revenue by class result:', { rowCount: rows.length, sample: rows[0] });
        return rows;
    } catch (error) {
        console.error('Error in revenue by class query:', error);
        throw error;
    }
}

// Get enrollment trends based on class sessions
async function getEnrollmentTrends({ startDate, endDate, groupBy = 'month' }) {
    let dateTrunc = 'month';
    if (groupBy === 'week') dateTrunc = 'week';
    if (groupBy === 'day') dateTrunc = 'day';

    console.log('Getting enrollment trends for class sessions:', { startDate, endDate, groupBy, dateTrunc });

    const query = `
        WITH session_enrollments AS (
            SELECT 
                cs.id as session_id,
                cs.session_date,
                cs.end_date,
                c.id as class_id,
                c.title as class_name,
                DATE_TRUNC($1, cs.session_date) as period,
                COUNT(e.id) as total_enrollments,
                COUNT(CASE WHEN e.enrollment_status = 'approved' THEN 1 END) as approved_enrollments,
                COUNT(CASE WHEN e.enrollment_status = 'pending' THEN 1 END) as pending_enrollments,
                COUNT(CASE WHEN e.enrollment_status = 'rejected' THEN 1 END) as rejected_enrollments
            FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            LEFT JOIN enrollments e ON cs.id = e.session_id
            WHERE cs.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cs.status IN ('scheduled', 'completed')
            AND (
                (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $2 AND $3) OR
                (cs.end_date IS NULL AND cs.session_date BETWEEN $2 AND $3)
            )
            GROUP BY cs.id, cs.session_date, cs.end_date, c.id, c.title, DATE_TRUNC($1, cs.session_date)
        )
        SELECT 
            period,
            SUM(total_enrollments) as total_enrollments,
            SUM(approved_enrollments) as approved_enrollments,
            SUM(pending_enrollments) as pending_enrollments,
            SUM(rejected_enrollments) as rejected_enrollments
        FROM session_enrollments
        GROUP BY period
        ORDER BY period ASC
    `;

    try {
        console.log('Executing enrollment trends query with params:', { dateTrunc, startDate, endDate });
        const { rows } = await pool.query(query, [dateTrunc, startDate, endDate]);
        console.log('Enrollment trends query result:', { rowCount: rows.length, sample: rows[0] });
        return rows;
    } catch (error) {
        console.error('Error executing enrollment trends query:', error);
        throw error;
    }
}

// Get class enrollment statistics based on class sessions
async function getClassEnrollmentStats({ startDate, endDate }) {
    console.log('Getting class enrollment stats for class sessions:', { startDate, endDate });

    const query = `
        WITH session_stats AS (
            SELECT 
                c.id as class_id,
                c.title as class_name,
                cs.id as session_id,
                cs.capacity,
                cs.session_date,
                cs.end_date,
                COUNT(DISTINCT e.id) as total_enrollments,
                COUNT(DISTINCT CASE WHEN e.enrollment_status IN ('active', 'approved') THEN e.id END) as approved_enrollments,
                COUNT(DISTINCT CASE WHEN e.enrollment_status = 'pending' THEN e.id END) as pending_enrollments,
                COUNT(DISTINCT CASE WHEN e.enrollment_status = 'rejected' THEN e.id END) as rejected_enrollments,
                COUNT(DISTINCT w.id) as waitlist_count,
                ROUND((COUNT(DISTINCT CASE WHEN e.enrollment_status IN ('active', 'approved') THEN e.id END)::numeric / 
                       NULLIF(cs.capacity, 0) * 100), 2) as enrollment_rate
            FROM classes c
            JOIN class_sessions cs ON c.id = cs.class_id
            LEFT JOIN enrollments e ON cs.id = e.session_id
            LEFT JOIN class_waitlist w ON c.id = w.class_id
            WHERE c.deleted_at IS NULL
            AND cs.deleted_at IS NULL
            AND cs.status IN ('scheduled', 'completed')
            AND (
                (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $1 AND $2) OR
                (cs.end_date IS NULL AND cs.session_date BETWEEN $1 AND $2)
            )
            GROUP BY c.id, c.title, cs.id, cs.capacity, cs.session_date, cs.end_date
        )
        SELECT 
            class_id,
            class_name,
            SUM(capacity) as total_capacity,
            SUM(total_enrollments) as total_enrollments,
            SUM(approved_enrollments) as approved_enrollments,
            SUM(pending_enrollments) as pending_enrollments,
            SUM(rejected_enrollments) as rejected_enrollments,
            SUM(waitlist_count) as waitlist_count,
            ROUND((SUM(approved_enrollments)::numeric / NULLIF(SUM(capacity), 0) * 100), 2) as enrollment_rate
        FROM session_stats
        GROUP BY class_id, class_name
        ORDER BY SUM(total_enrollments) DESC
    `;

    try {
        const { rows } = await pool.query(query, [startDate, endDate]);
        console.log('Class enrollment stats result:', { rowCount: rows.length, sample: rows[0] });
        return rows;
    } catch (error) {
        console.error('Error in class enrollment stats query:', error);
        throw error;
    }
}

// Get user engagement metrics based on class sessions
async function getUserEngagementMetrics({ startDate, endDate }) {
    console.log('Getting user engagement metrics for class sessions:', { startDate, endDate });

    const query = `
        WITH session_engagement AS (
            SELECT 
                u.id as user_id,
                u.first_name,
                u.last_name,
                cs.id as session_id,
                cs.session_date,
                cs.end_date,
                COUNT(DISTINCT e.id) as enrolled_sessions,
                COUNT(DISTINCT p.id) as completed_payments,
                COUNT(DISTINCT a.id) as activity_count,
                MAX(a.created_at) as last_activity
            FROM users u
            JOIN enrollments e ON u.id = e.user_id
            JOIN class_sessions cs ON e.session_id = cs.id
            LEFT JOIN payments p ON e.user_id = p.user_id AND e.class_id = p.class_id AND p.status = 'completed'
            LEFT JOIN user_activity_log a ON u.id = a.user_id 
                AND a.created_at BETWEEN $1 AND $2
            WHERE u.status = 'active'
            AND e.enrollment_status IN ('active', 'approved')
            AND cs.status IN ('scheduled', 'completed')
            AND (
                (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $1 AND $2) OR
                (cs.end_date IS NULL AND cs.session_date BETWEEN $1 AND $2)
            )
            GROUP BY u.id, u.first_name, u.last_name, cs.id, cs.session_date, cs.end_date
        )
        SELECT 
            user_id,
            first_name,
            last_name,
            SUM(enrolled_sessions) as enrolled_classes,
            SUM(completed_payments) as completed_payments,
            SUM(activity_count) as activity_count,
            MAX(last_activity) as last_activity,
            CASE 
                WHEN SUM(enrolled_sessions) > 0 AND SUM(completed_payments) > 0 THEN 'active'
                WHEN MAX(last_activity) > NOW() - INTERVAL '30 days' THEN 'recent'
                ELSE 'inactive'
            END as engagement_status
        FROM session_engagement
        GROUP BY user_id, first_name, last_name
        ORDER BY SUM(activity_count) DESC
    `;

    try {
        const { rows } = await pool.query(query, [startDate, endDate]);
        console.log('User engagement metrics result:', { rowCount: rows.length, sample: rows[0] });
        return rows;
    } catch (error) {
        console.error('Error in user engagement metrics query:', error);
        throw error;
    }
}

// Get user activity trends based on class sessions
async function getUserActivityTrends({ startDate, endDate, groupBy = 'month' }) {
    const dateTrunc = groupBy === 'day' ? 'day' : 'month';

    console.log('Getting user activity trends for class sessions:', { startDate, endDate, groupBy, dateTrunc });

    const query = `
        WITH session_activity AS (
            SELECT 
                cs.id as session_id,
                cs.session_date,
                cs.end_date,
                DATE_TRUNC($1, cs.session_date) as period,
                a.action,
                COUNT(*) as action_count
            FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            JOIN enrollments e ON cs.id = e.session_id
            JOIN user_activity_log a ON e.user_id = a.user_id
            WHERE cs.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cs.status IN ('scheduled', 'completed')
            AND (
                (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $2 AND $3) OR
                (cs.end_date IS NULL AND cs.session_date BETWEEN $2 AND $3)
            )
            AND a.created_at BETWEEN $2 AND $3
            GROUP BY cs.id, cs.session_date, cs.end_date, DATE_TRUNC($1, cs.session_date), a.action
        )
        SELECT 
            period,
            action,
            SUM(action_count) as action_count,
            ROUND((SUM(action_count)::numeric / SUM(SUM(action_count)) OVER (PARTITION BY period) * 100), 2) as action_percentage
        FROM session_activity
        GROUP BY period, action
        ORDER BY period DESC, SUM(action_count) DESC
    `;

    try {
        const { rows } = await pool.query(query, [dateTrunc, startDate, endDate]);
        console.log('User activity trends result:', { rowCount: rows.length, sample: rows[0] });
        return rows;
    } catch (error) {
        console.error('Error in user activity trends query:', error);
        throw error;
    }
}

// Get dashboard summary with date range
async function getDashboardSummary({ startDate, endDate }) {
    console.log('Getting dashboard summary for date range:', { startDate, endDate });

    const query = `
        WITH summary AS (
            SELECT 
                (SELECT COUNT(DISTINCT u.id) 
                 FROM users u 
                 JOIN enrollments e ON u.id = e.user_id
                 JOIN class_sessions cs ON e.session_id = cs.id
                 WHERE u.status = 'active' 
                 AND e.enrollment_status IN ('active', 'approved')
                 AND cs.status IN ('scheduled', 'completed')
                 AND (
                     (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $1 AND $2) OR
                     (cs.end_date IS NULL AND cs.session_date BETWEEN $1 AND $2)
                 )) as active_users,
                
                (SELECT COUNT(DISTINCT c.id) 
                 FROM classes c 
                 JOIN class_sessions cs ON cs.class_id = c.id
                 WHERE c.deleted_at IS NULL
                 AND cs.deleted_at IS NULL
                 AND cs.status IN ('scheduled', 'completed')
                 AND (
                     (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $1 AND $2) OR
                     (cs.end_date IS NULL AND cs.session_date BETWEEN $1 AND $2)
                 )
                 AND EXISTS (
                     SELECT 1 FROM enrollments e 
                     WHERE e.session_id = cs.id 
                     AND e.enrollment_status IN ('active', 'approved')
                 )) as active_classes,
                
                (SELECT COUNT(*) 
                 FROM enrollments e
                 JOIN classes c ON e.class_id = c.id
                 JOIN class_sessions cs ON e.session_id = cs.id
                 WHERE e.enrollment_status IN ('active', 'approved') 
                 AND c.deleted_at IS NULL
                 AND cs.deleted_at IS NULL
                 AND cs.status IN ('scheduled', 'completed')
                 AND (
                     (cs.end_date IS NOT NULL AND cs.end_date BETWEEN $1 AND $2) OR
                     (cs.end_date IS NULL AND cs.session_date BETWEEN $1 AND $2)
                 )) as active_enrollments,
                
                (SELECT COUNT(*) 
                 FROM payments p 
                 WHERE p.status = 'completed' 
                 AND p.created_at::date BETWEEN $1 AND $2) as recent_payments,
                
                (SELECT SUM(p.amount) 
                 FROM payments p 
                 WHERE p.status = 'completed' 
                 AND p.created_at::date BETWEEN $1 AND $2) as monthly_revenue,
                
                (SELECT COUNT(*) 
                 FROM class_waitlist w 
                 JOIN classes c ON w.class_id = c.id
                 WHERE w.status IN ('waiting', 'pending')
                 AND c.deleted_at IS NULL) as waitlist_count,
                
                (SELECT COUNT(*) 
                 FROM certificates cert
                 WHERE cert.created_at::date BETWEEN $1 AND $2
                 AND cert.status = 'approved') as recent_certificates
        )
        SELECT 
            active_users,
            active_classes,
            active_enrollments,
            recent_payments,
            COALESCE(monthly_revenue, 0) as monthly_revenue,
            waitlist_count,
            COALESCE(recent_certificates, 0) as recent_certificates,
            ROUND((active_enrollments::numeric / NULLIF(active_users, 0) * 100), 2) as enrollment_rate
        FROM summary
    `;

    try {
        console.log('Executing dashboard summary query with params:', { startDate, endDate });
        const { rows } = await pool.query(query, [startDate, endDate]);
        console.log('Dashboard summary query result:', rows[0]);
        return rows[0];
    } catch (error) {
        console.error('Error executing dashboard summary query:', error);
        throw error;
    }
}

// Get user count
async function getUserCount() {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count, 10);
}

// Get class count
async function getClassCount() {
    const result = await pool.query('SELECT COUNT(*) FROM classes');
    return parseInt(result.rows[0].count, 10);
}

// Get enrollment count based on class sessions
async function getEnrollmentCount() {
    const query = `
        SELECT COUNT(*) 
        FROM enrollments e
        JOIN classes c ON e.class_id = c.id
        JOIN class_sessions cs ON e.session_id = cs.id
        WHERE c.deleted_at IS NULL
        AND cs.deleted_at IS NULL
        AND e.enrollment_status IN ('active', 'approved')
        AND cs.status IN ('scheduled', 'completed')
        AND (
            (cs.end_date IS NOT NULL AND cs.end_date > CURRENT_DATE) OR
            (cs.end_date IS NULL AND cs.session_date > CURRENT_DATE)
        )
    `;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
}

module.exports = {
    getRevenueAnalytics,
    getRevenueByClass,
    getEnrollmentTrends,
    getClassEnrollmentStats,
    getUserEngagementMetrics,
    getUserActivityTrends,
    getDashboardSummary,
    getUserCount,
    getClassCount,
    getEnrollmentCount
}; 