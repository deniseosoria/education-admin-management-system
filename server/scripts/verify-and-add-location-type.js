const pool = require('../config/db');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function verifyAndAddLocationType() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking if location_type column exists in class_sessions...');
        
        // Check if column exists
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'class_sessions' 
            AND column_name = 'location_type'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('✅ location_type column already exists!');
            
            // Show column details
            const columnDetails = await client.query(`
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_name = 'class_sessions' 
                AND column_name = 'location_type'
            `);
            
            console.log('📋 Column details:', columnDetails.rows[0]);
        } else {
            console.log('❌ location_type column does NOT exist. Adding it now...');
            
            // Add the column
            await client.query(`
                ALTER TABLE class_sessions 
                ADD COLUMN location_type VARCHAR(20) 
                CHECK (location_type IN ('zoom', 'in-person'))
            `);
            
            console.log('✅ location_type column added successfully!');
            
            // Add comment
            await client.query(`
                COMMENT ON COLUMN class_sessions.location_type IS 
                'Location type for this specific session (zoom or in-person).'
            `);
            
            // Create index
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_class_sessions_location_type 
                ON class_sessions(location_type)
            `);
            
            console.log('✅ Index created successfully!');
        }
        
        // Verify the column exists now
        const verifyColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'class_sessions' 
            AND column_name = 'location_type'
        `);
        
        if (verifyColumn.rows.length > 0) {
            console.log('✅ Verification: location_type column exists!');
        } else {
            console.log('❌ Verification failed: location_type column still does not exist!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Error code:', error.code);
        if (error.detail) {
            console.error('Error detail:', error.detail);
        }
        throw error;
    } finally {
        client.release();
    }
}

verifyAndAddLocationType()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

