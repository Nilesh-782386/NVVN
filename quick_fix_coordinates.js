// Quick fix for donation coordinates
import { query } from './db.js';

async function quickFix() {
    try {
        console.log('🔧 Quick fix: Adding coordinates to donations...');
        
        // Add coordinates to all donations without them
        const result = await query(`
            UPDATE donations 
            SET latitude = 21.1458, longitude = 79.0882 
            WHERE latitude IS NULL OR longitude IS NULL
        `);
        
        console.log(`✅ Updated ${result.affectedRows} donations with coordinates`);
        
        // Check available donations
        const available = await query(`
            SELECT id, city, latitude, longitude, status 
            FROM donations 
            WHERE status = 'assigned' AND volunteer_id IS NULL
            LIMIT 3
        `);
        
        console.log(`\n📋 Available donations (${available.length}):`);
        available.forEach(d => {
            console.log(`   - ID ${d.id}: ${d.city} (${d.latitude}, ${d.longitude})`);
        });
        
        console.log('\n🎉 Distance display should now work!');
        console.log('📱 Go to volunteer dashboard to test');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

quickFix();
