import { query } from './db.js';

async function runLiveMetricsMigration() {
    try {
        console.log('🚀 Running live metrics migration...');
        
        // Create assignment_live_metrics table
        await query(`
            CREATE TABLE IF NOT EXISTS assignment_live_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignment_id INT,
                volunteer_id INT,
                live_distance DECIMAL(8,2),
                live_lat DECIMAL(10,8),
                live_lng DECIMAL(11,8),
                accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_assignment_id (assignment_id),
                INDEX idx_volunteer_id (volunteer_id),
                INDEX idx_accepted_at (accepted_at)
            )
        `);
        
        console.log('✅ assignment_live_metrics table created');
        
        // Create assignment_metrics table
        await query(`
            CREATE TABLE IF NOT EXISTS assignment_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignment_id INT,
                volunteer_id INT,
                accepted_distance DECIMAL(8,2),
                accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_assignment_id (assignment_id),
                INDEX idx_volunteer_id (volunteer_id),
                INDEX idx_accepted_at (accepted_at)
            )
        `);
        
        console.log('✅ assignment_metrics table created');
        console.log('🎉 Live metrics migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

runLiveMetricsMigration();
