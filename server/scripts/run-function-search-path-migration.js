const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runFunctionSearchPathMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting Function Search Path migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '012_fix_function_search_path.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        // Commit transaction
        await client.query('COMMIT');

        console.log('✅ Function Search Path migration completed successfully!');
        console.log('🔒 Database functions now have fixed search_path for security');

        // Verify functions are properly secured
        console.log('\n📋 Verifying function security...');
        const result = await client.query(`
            SELECT 
                proname as function_name,
                prosecdef as security_definer,
                proconfig as search_path_config,
                prosrc as function_source
            FROM pg_proc 
            WHERE proname IN ('update_users_updated_at', 'update_updated_at_column')
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);

        if (result.rows.length > 0) {
            console.log('\n🔍 Function security status:');
            result.rows.forEach(func => {
                const hasSearchPath = func.search_path_config && func.search_path_config.includes('search_path');
                const hasSearchPathInSource = func.function_source && func.function_source.includes('SET search_path');
                const isSecurityDefiner = func.security_definer;

                console.log(`  • ${func.function_name}:`);
                console.log(`    - Security Definer: ${isSecurityDefiner ? '✅ Yes' : '❌ No'}`);
                console.log(`    - Fixed Search Path: ${hasSearchPath || hasSearchPathInSource ? '✅ Yes' : '❌ No'}`);
            });
        } else {
            console.log('⚠️  No functions found to verify');
        }

        // Check for any remaining orphaned functions
        console.log('\n🔍 Checking for orphaned functions...');
        const orphanedFunctions = await client.query(`
            SELECT proname 
            FROM pg_proc 
            WHERE proname LIKE '%updated_at%'
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            AND proname NOT IN ('update_users_updated_at', 'update_updated_at_column')
        `);

        if (orphanedFunctions.rows.length > 0) {
            console.log('⚠️  Found orphaned functions:');
            orphanedFunctions.rows.forEach(func => {
                console.log(`  • ${func.proname}`);
            });
        } else {
            console.log('✅ No orphaned functions found');
        }

    } catch (err) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('❌ Error running Function Search Path migration:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runFunctionSearchPathMigration();

        console.log('\n🎉 Function Search Path migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Check your Supabase Security Advisor dashboard');
        console.log('2. The "Function Search Path Mutable" warnings should be resolved');
        console.log('3. Only the PostgreSQL version warning should remain');

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

module.exports = { runFunctionSearchPathMigration };
