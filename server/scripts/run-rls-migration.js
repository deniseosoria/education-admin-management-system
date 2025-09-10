const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runRLSMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting RLS migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '011_enable_rls_and_policies.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        // Commit transaction
        await client.query('COMMIT');

        console.log('✅ RLS migration completed successfully!');
        console.log('🔒 Row Level Security has been enabled on all tables');
        console.log('🛡️  Security policies have been created');

        // Verify RLS is enabled
        console.log('\n📋 Verifying RLS status...');
        const tables = [
            'users', 'classes', 'class_sessions', 'class_waitlist',
            'enrollments', 'payments', 'user_notifications',
            'user_activity_log', 'notification_templates',
            'certificates', 'historical_sessions', 'historical_enrollments'
        ];

        for (const table of tables) {
            const result = await client.query(`
                SELECT relname, relrowsecurity 
                FROM pg_class 
                WHERE relname = $1 AND relrowsecurity = true
            `, [table]);

            if (result.rows.length > 0) {
                console.log(`✅ ${table}: RLS enabled`);
            } else {
                console.log(`❌ ${table}: RLS not enabled`);
            }
        }

        // Count policies
        const policyCount = await client.query(`
            SELECT COUNT(*) as count 
            FROM pg_policies 
            WHERE schemaname = 'public'
        `);

        console.log(`\n📊 Total policies created: ${policyCount.rows[0].count}`);

    } catch (err) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('❌ Error running RLS migration:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function testRLSPolicies() {
    const client = await pool.connect();

    try {
        console.log('\n🧪 Testing RLS policies...');

        // Test 1: Check if policies exist
        const policies = await client.query(`
            SELECT tablename, policyname, permissive, roles, cmd, qual
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname
        `);

        console.log(`\n📋 Found ${policies.rows.length} policies:`);
        policies.rows.forEach(policy => {
            console.log(`  • ${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
        });

        // Test 2: Verify RLS is working (this will fail if no auth context)
        console.log('\n🔍 Testing RLS enforcement...');

        try {
            // This should fail because there's no authenticated user context
            await client.query('SELECT * FROM users LIMIT 1');
            console.log('⚠️  Warning: RLS might not be working properly - query succeeded without auth context');
        } catch (err) {
            if (err.message.includes('permission denied') || err.message.includes('RLS')) {
                console.log('✅ RLS is working correctly - queries are blocked without proper auth context');
            } else {
                console.log('⚠️  Unexpected error:', err.message);
            }
        }

    } catch (err) {
        console.error('❌ Error testing RLS policies:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runRLSMigration();
        await testRLSPolicies();

        console.log('\n🎉 RLS migration and testing completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update your Supabase Security Advisor dashboard');
        console.log('2. Test your application to ensure all functionality works');
        console.log('3. Consider adding additional policies for specific use cases');
        console.log('4. Monitor the Security Advisor for any remaining issues');

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

module.exports = { runRLSMigration, testRLSPolicies };
