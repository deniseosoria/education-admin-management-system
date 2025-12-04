const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runEIPUrlMigration() {
    const client = await pool.connect();

    try {
        console.log('Running EIP_url migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/021_add_eip_url_to_sessions.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Start transaction
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        // Record in migrations table if it exists
        try {
            await client.query(
                'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                ['021_add_eip_url_to_sessions.sql']
            );
        } catch (err) {
            // If migrations table doesn't exist, that's okay
            console.log('Note: Could not record migration in migrations table (table may not exist)');
        }

        // Commit transaction
        await client.query('COMMIT');
        console.log('✅ EIP URL migration completed successfully!');
        console.log('✅ EIP_url column added to class_sessions table');

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
runEIPUrlMigration()
    .then(() => {
        console.log('Migration completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

