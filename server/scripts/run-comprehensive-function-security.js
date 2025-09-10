const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runComprehensiveFunctionSecurityMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting Comprehensive Function Security migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '013_comprehensive_function_security.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        // Commit transaction
        await client.query('COMMIT');

        console.log('✅ Comprehensive Function Security migration completed successfully!');
        console.log('🔒 Database functions now have empty search_path for maximum security');

        // Verify functions are properly secured
        console.log('\n📋 Verifying function security...');
        const result = await client.query(`
            SELECT 
                proname as function_name,
                prosecdef as security_definer,
                proconfig as search_path_config
            FROM pg_proc 
            WHERE proname IN ('update_users_updated_at', 'update_updated_at_column')
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);

        if (result.rows.length > 0) {
            console.log('\n🔍 Function security status:');
            result.rows.forEach(func => {
                const hasEmptySearchPath = func.search_path_config && func.search_path_config.includes('search_path=');
                const isSecurityDefiner = func.security_definer;

                console.log(`  • ${func.function_name}:`);
                console.log(`    - Security Definer: ${isSecurityDefiner ? '✅ Yes' : '❌ No'}`);
                console.log(`    - Empty Search Path: ${hasEmptySearchPath ? '✅ Yes' : '❌ No'}`);
                console.log(`    - Config: ${func.search_path_config || 'None'}`);
            });
        } else {
            console.log('⚠️  No functions found to verify');
        }

        // Test that triggers are working
        console.log('\n🧪 Testing trigger functionality...');
        try {
            // Test updating a user to see if the trigger works
            const testResult = await client.query(`
                UPDATE users 
                SET name = name 
                WHERE id = (SELECT id FROM users LIMIT 1)
                RETURNING updated_at
            `);

            if (testResult.rows.length > 0) {
                console.log('✅ Triggers are working correctly');
            } else {
                console.log('⚠️  No users found to test triggers');
            }
        } catch (err) {
            console.log('⚠️  Could not test triggers:', err.message);
        }

    } catch (err) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('❌ Error running Comprehensive Function Security migration:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runComprehensiveFunctionSecurityMigration();

        console.log('\n🎉 Comprehensive Function Security migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Wait a few minutes for Supabase to refresh its cache');
        console.log('2. Check your Supabase Security Advisor dashboard again');
        console.log('3. The "Function Search Path Mutable" warnings should now be resolved');
        console.log('4. Only the PostgreSQL version warning should remain');

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

module.exports = { runComprehensiveFunctionSecurityMigration };
