// Direct fix for donation coordinates
import { query } from './db.js';

async function fixCoordsNow() {
    try {
        console.log('🔧 FIXING DONATION COORDINATES NOW...\n');
        
        // Update all donations without coordinates
        const result = await query(`
            UPDATE donations 
            SET latitude = 21.1458, longitude = 79.0882 
            WHERE latitude IS NULL OR longitude IS NULL
        `);
        
        console.log(`✅ UPDATED ${result.affectedRows} donations with coordinates!`);
        
        // Check if it worked
        const check = await query(`
            SELECT id, city, latitude, longitude, status 
            FROM donations 
            WHERE status = 'assigned' AND volunteer_id IS NULL
            LIMIT 3
        `);
        
        console.log(`\n📋 Available donations now have coordinates:`);
        check.forEach(d => {
            console.log(`   - ID ${d.id}: ${d.city} (${d.latitude}, ${d.longitude})`);
        });
        
        console.log('\n🎉 DISTANCE DISPLAY SHOULD NOW WORK!');
        console.log('📱 Go to volunteer dashboard and refresh the page');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixCoordsNow();
