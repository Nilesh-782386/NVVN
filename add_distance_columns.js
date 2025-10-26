import { query } from './db.js';

async function addDistanceColumns() {
    try {
        console.log('🔄 Adding distance-related columns to database...');
        
        // Add latitude and longitude to volunteers table
        try {
            await query('ALTER TABLE volunteers ADD COLUMN latitude DECIMAL(10, 8) NULL');
            console.log('✅ Added latitude column to volunteers table');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Latitude column already exists in volunteers table');
            } else {
                console.error('❌ Error adding latitude to volunteers:', error.message);
            }
        }
        
        try {
            await query('ALTER TABLE volunteers ADD COLUMN longitude DECIMAL(11, 8) NULL');
            console.log('✅ Added longitude column to volunteers table');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Longitude column already exists in volunteers table');
            } else {
                console.error('❌ Error adding longitude to volunteers:', error.message);
            }
        }
        
        // Add latitude and longitude to donations table
        try {
            await query('ALTER TABLE donations ADD COLUMN latitude DECIMAL(10, 8) NULL');
            console.log('✅ Added latitude column to donations table');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Latitude column already exists in donations table');
            } else {
                console.error('❌ Error adding latitude to donations:', error.message);
            }
        }
        
        try {
            await query('ALTER TABLE donations ADD COLUMN longitude DECIMAL(11, 8) NULL');
            console.log('✅ Added longitude column to donations table');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('ℹ️ Longitude column already exists in donations table');
            } else {
                console.error('❌ Error adding longitude to donations:', error.message);
            }
        }
        
        // Create assignment_metrics table
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS assignment_metrics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    assignment_id INT NOT NULL,
                    volunteer_id INT NOT NULL,
                    accepted_distance DECIMAL(8,2) NULL,
                    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_assignment_id (assignment_id),
                    INDEX idx_volunteer_id (volunteer_id),
                    INDEX idx_accepted_at (accepted_at)
                )
            `);
            console.log('✅ Created assignment_metrics table');
        } catch (error) {
            console.error('❌ Error creating assignment_metrics table:', error.message);
        }
        
        console.log('🎉 Database setup completed!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
    }
}

// Run the setup
addDistanceColumns().then(() => {
    console.log('✅ Distance display database setup completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
});
