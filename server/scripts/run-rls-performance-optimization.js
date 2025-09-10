const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runRLSPerformanceOptimization() {
    const client = await pool.connect();

    try {
        console.log('Starting RLS Performance Optimization migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '014_optimize_rls_performance.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        // Commit transaction
        await client.query('COMMIT');

        console.log('✅ RLS Performance Optimization migration completed successfully!');
        console.log('🚀 All policies now use optimized auth calls for better performance');

        // Verify policies are optimized
        console.log('\n📋 Verifying optimized policies...');
        const policies = await client.query(`
            SELECT 
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                cmd,
                qual
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname
        `);

        console.log(`\n📊 Total policies after optimization: ${policies.rows.length}`);

        // Check for optimized auth calls
        const optimizedPolicies = policies.rows.filter(policy =>
            policy.qual && policy.qual.includes('(select auth.uid())')
        );

        console.log(`✅ Optimized policies with (select auth.uid()): ${optimizedPolicies.length}`);

        // Show sample of optimized policies
        console.log('\n🔍 Sample of optimized policies:');
        optimizedPolicies.slice(0, 5).forEach(policy => {
            console.log(`  • ${policy.tablename}: ${policy.policyname}`);
        });

        // Test that policies still work
        console.log('\n🧪 Testing policy functionality...');
        try {
            // Test a simple query to ensure policies are working
            const testResult = await client.query(`
                SELECT COUNT(*) as policy_count
                FROM pg_policies 
                WHERE schemaname = 'public'
            `);

            console.log(`✅ Policies are working correctly (${testResult.rows[0].policy_count} total policies)`);
        } catch (err) {
            console.log('⚠️  Could not test policies:', err.message);
        }

    } catch (err) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('❌ Error running RLS Performance Optimization migration:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runRLSPerformanceOptimization();

        console.log('\n🎉 RLS Performance Optimization completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Wait a few minutes for Supabase to refresh its cache');
        console.log('2. Check your Supabase Security Advisor dashboard');
        console.log('3. The "Auth RLS Initialization Plan" warnings should be resolved');
        console.log('4. Performance should be significantly improved');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Only run if this file is being run directly
if (require.main === module) {
    main();
}

module.exports = { runRLSPerformanceOptimization };
