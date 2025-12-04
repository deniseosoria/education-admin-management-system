const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runCleanupMigration() {
    const client = await pool.connect();

    try {
        console.log('Starting duplicate enrollments cleanup migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '022_cleanup_duplicate_enrollments_and_add_unique_constraint.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        // Record in migrations table if it exists
        try {
            await client.query(
                'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                ['022_cleanup_duplicate_enrollments_and_add_unique_constraint.sql']
            );
        } catch (err) {
            // If migrations table doesn't exist, that's okay
            console.log('Note: Could not record migration in migrations table (table may not exist)');
        }

        // Commit transaction
        await client.query('COMMIT');
        console.log('✅ Duplicate enrollments cleanup migration completed successfully!');
        console.log('✅ Unique constraint added to prevent future duplicates');

        // Verify the constraint exists
        const constraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'enrollments' 
            AND constraint_name = 'enrollments_user_session_unique'
        `);

        if (constraintCheck.rows.length > 0) {
            console.log('✅ Unique constraint verified');
        } else {
            console.log('⚠️  Warning: Unique constraint not found (may have already existed)');
        }

    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        console.error('Error code:', error.code);
        if (error.detail) {
            console.error('Error detail:', error.detail);
        }
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    runCleanupMigration()
        .then(() => {
            console.log('\n✨ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runCleanupMigration };

