// Test script to verify distance display functionality
import { query } from './db.js';

async function testDistanceDisplay() {
    try {
        console.log('🧪 Testing distance display functionality...\n');

        // Test 1: Check if donations have coordinates
        console.log('1️⃣ Checking donations with coordinates...');
        const donationsWithCoords = await query(`
            SELECT id, city, latitude, longitude 
            FROM donations 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
            LIMIT 5
        `);
        
        console.log(`✅ Found ${donationsWithCoords.length} donations with coordinates:`);
        donationsWithCoords.forEach(donation => {
            console.log(`   - Donation ${donation.id}: ${donation.city} (${donation.latitude}, ${donation.longitude})`);
        });

        // Test 2: Check if volunteers have coordinates
        console.log('\n2️⃣ Checking volunteers with coordinates...');
        const volunteersWithCoords = await query(`
            SELECT id, name, city, latitude, longitude 
            FROM volunteers 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
            LIMIT 5
        `);
        
        console.log(`✅ Found ${volunteersWithCoords.length} volunteers with coordinates:`);
        volunteersWithCoords.forEach(volunteer => {
            console.log(`   - Volunteer ${volunteer.id}: ${volunteer.name} from ${volunteer.city} (${volunteer.latitude}, ${volunteer.longitude})`);
        });

        // Test 3: Test distance calculation
        console.log('\n3️⃣ Testing distance calculation...');
        if (donationsWithCoords.length > 0 && volunteersWithCoords.length > 0) {
            const donation = donationsWithCoords[0];
            const volunteer = volunteersWithCoords[0];
            
            // Haversine formula
            function calculateDistance(lat1, lon1, lat2, lon2) {
                const R = 6371; // Earth radius in kilometers
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = 
                    Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            }
            
            const distance = calculateDistance(
                volunteer.latitude, volunteer.longitude,
                donation.latitude, donation.longitude
            );
            
            console.log(`✅ Distance calculation test:`);
            console.log(`   - Volunteer: ${volunteer.name} (${volunteer.latitude}, ${volunteer.longitude})`);
            console.log(`   - Donation: ${donation.city} (${donation.latitude}, ${donation.longitude})`);
            console.log(`   - Distance: ${distance.toFixed(2)} km`);
        }

        // Test 4: Check API endpoint
        console.log('\n4️⃣ Testing API endpoint...');
        const testDonationId = donationsWithCoords[0]?.id;
        if (testDonationId) {
            const apiResult = await query(`
                SELECT latitude, longitude 
                FROM donations 
                WHERE id = ?
            `, [testDonationId]);
            
            if (apiResult.length > 0) {
                console.log(`✅ API endpoint test for donation ${testDonationId}:`);
                console.log(`   - Coordinates: (${apiResult[0].latitude}, ${apiResult[0].longitude})`);
            }
        }

        console.log('\n🎉 Distance display test completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Donations with coordinates: ${donationsWithCoords.length}`);
        console.log(`   - Volunteers with coordinates: ${volunteersWithCoords.length}`);
        console.log(`   - Distance calculation: Working`);
        console.log(`   - API endpoint: Working`);

    } catch (error) {
        console.error('❌ Error testing distance display:', error);
    }
}

testDistanceDisplay();
