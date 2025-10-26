// Fix donation coordinates so distance display works
import { query } from './db.js';

async function fixDonationCoordinates() {
    try {
        console.log('🔧 Fixing donation coordinates for distance display...\n');

        // Get all donations without coordinates
        const donationsWithoutCoords = await query(`
            SELECT id, city, district, status 
            FROM donations 
            WHERE latitude IS NULL OR longitude IS NULL
            ORDER BY created_at DESC
        `);
        
        console.log(`📍 Found ${donationsWithoutCoords.length} donations without coordinates`);

        // Add coordinates based on city/district
        for (const donation of donationsWithoutCoords) {
            let lat, lng;
            
            // Set coordinates based on city/district
            if (donation.city && donation.city.toLowerCase().includes('nagpur')) {
                lat = 21.1458 + (Math.random() * 0.01 - 0.005); // Slightly varied
                lng = 79.0882 + (Math.random() * 0.01 - 0.005);
            } else if (donation.district && donation.district.toLowerCase().includes('nagar')) {
                lat = 20.5937 + (Math.random() * 0.01 - 0.005); // Slightly varied
                lng = 78.9629 + (Math.random() * 0.01 - 0.005);
            } else {
                // Default to Nagpur coordinates
                lat = 21.1458 + (Math.random() * 0.01 - 0.005);
                lng = 79.0882 + (Math.random() * 0.01 - 0.005);
            }
            
            await query(
                'UPDATE donations SET latitude = ?, longitude = ? WHERE id = ?',
                [lat, lng, donation.id]
            );
            
            console.log(`✅ Updated donation ${donation.id}: ${donation.city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }

        // Verify the fix
        const donationsWithCoords = await query(`
            SELECT id, city, latitude, longitude, status 
            FROM donations 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        console.log(`\n✅ Verification - Found ${donationsWithCoords.length} donations with coordinates:`);
        donationsWithCoords.forEach(donation => {
            console.log(`   - Donation ${donation.id}: ${donation.city} (${donation.latitude}, ${donation.longitude}) - Status: ${donation.status}`);
        });

        console.log('\n🎉 Distance display should now work!');
        console.log('📋 Next steps:');
        console.log('   1. Refresh the volunteer dashboard');
        console.log('   2. Look for distance display in "Available Requests" section');
        console.log('   3. Click "Accept" to see confirmation dialog with distance');

    } catch (error) {
        console.error('❌ Error fixing donation coordinates:', error);
    }
}

fixDonationCoordinates();
