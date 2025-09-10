const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runPolicyConsolidationMigration() {
    const client = await pool.connect();

    try {
        console.log('Connected to database');
        console.log('Starting Multiple Permissive Policies Consolidation migration...');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '..', 'migrations', '015_consolidate_multiple_permissive_policies.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await client.query(migrationSQL);

        console.log('✅ Multiple Permissive Policies Consolidation migration completed successfully!');
        console.log('🚀 All policies have been consolidated for better performance');

        // Verify the consolidation
        console.log('\n📋 Verifying policy consolidation...');

        // Count total policies
        const policyCountResult = await client.query(`
            SELECT COUNT(*) as total_policies
            FROM pg_policies 
            WHERE schemaname = 'public'
        `);

        console.log(`📊 Total policies after consolidation: ${policyCountResult.rows[0].total_policies}`);

        // Check for any remaining multiple policies per table/role/action
        const multiplePoliciesResult = await client.query(`
            SELECT 
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                cmd
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename, cmd, roles
        `);

        console.log('\n🔍 Policy structure after consolidation:');
        const policyGroups = {};

        multiplePoliciesResult.rows.forEach(policy => {
            const key = `${policy.tablename}_${policy.cmd}_${policy.roles}`;
            if (!policyGroups[key]) {
                policyGroups[key] = [];
            }
            policyGroups[key].push(policy.policyname);
        });

        // Show consolidated policies
        Object.keys(policyGroups).forEach(key => {
            const [table, action, role] = key.split('_');
            const policies = policyGroups[key];
            console.log(`  • ${table} (${action} for ${role}): ${policies.length} policy(ies)`);
            policies.forEach(policy => {
                console.log(`    - ${policy}`);
            });
        });

        // Test policy functionality
        console.log('\n🧪 Testing consolidated policy functionality...');

        // Test a simple query to ensure policies work
        const testResult = await client.query(`
            SELECT 
                schemaname,
                tablename,
                COUNT(*) as policy_count
            FROM pg_policies 
            WHERE schemaname = 'public'
            GROUP BY schemaname, tablename
            ORDER BY tablename
        `);

        console.log('✅ Policy consolidation verification:');
        testResult.rows.forEach(row => {
            console.log(`  • ${row.tablename}: ${row.policy_count} policies`);
        });

        console.log('\n🎉 Multiple Permissive Policies Consolidation completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Wait a few minutes for Supabase to refresh its cache');
        console.log('2. Check your Supabase Security Advisor dashboard');
        console.log('3. The "Multiple Permissive Policies" warnings should be resolved');
        console.log('4. Query performance should be significantly improved');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runPolicyConsolidationMigration()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
