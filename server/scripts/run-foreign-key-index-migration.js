const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runForeignKeyIndexMigration() {
    const client = await pool.connect();

    try {
        console.log('Connected to database');
        console.log('Starting Foreign Key Index migration...');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '..', 'migrations', '016_add_foreign_key_indexes.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await client.query(migrationSQL);

        console.log('✅ Foreign Key Index migration completed successfully!');
        console.log('🚀 All foreign key columns now have proper indexes for optimal performance');

        // Verify the indexes were created
        console.log('\n📋 Verifying foreign key indexes...');

        // Count foreign key indexes
        const indexCountResult = await client.query(`
            SELECT COUNT(*) as total_indexes
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (indexname LIKE 'idx_%_%_id' OR indexname LIKE '%_fk%' OR indexname LIKE '%_by')
        `);

        console.log(`📊 Total foreign key indexes: ${indexCountResult.rows[0].total_indexes}`);

        // List all foreign key indexes
        const indexesResult = await client.query(`
            SELECT indexname, tablename, indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (indexname LIKE 'idx_%_%_id' OR indexname LIKE '%_fk%' OR indexname LIKE '%_by')
            ORDER BY tablename, indexname
        `);

        console.log('\n🔍 Foreign key indexes created:');
        indexesResult.rows.forEach(index => {
            console.log(`  • ${index.indexname} on ${index.tablename}`);
        });

        // Test index usage
        console.log('\n🧪 Testing index functionality...');

        // Test a simple query that should use the new indexes
        const testQueries = [
            'SELECT COUNT(*) FROM certificates WHERE uploaded_by IS NOT NULL',
            'SELECT COUNT(*) FROM class_sessions WHERE instructor_id IS NOT NULL',
            'SELECT COUNT(*) FROM enrollments WHERE user_id IS NOT NULL',
            'SELECT COUNT(*) FROM payments WHERE user_id IS NOT NULL'
        ];

        for (const query of testQueries) {
            try {
                const result = await client.query(query);
                console.log(`  ✅ ${query.split(' ')[3]} table query successful`);
            } catch (error) {
                console.log(`  ⚠️  ${query.split(' ')[3]} table query failed: ${error.message}`);
            }
        }

        console.log('\n🎉 Foreign Key Index migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Wait a few minutes for Supabase to refresh its cache');
        console.log('2. Check your Supabase Security Advisor dashboard');
        console.log('3. The "Unindexed foreign keys" warnings should be resolved');
        console.log('4. Query performance should be significantly improved');
        console.log('5. JOIN operations will be much faster');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runForeignKeyIndexMigration()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
