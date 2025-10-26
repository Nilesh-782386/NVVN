// Create a test donation with coordinates for distance display testing
import { query } from './db.js';

async function createTestDonationWithCoords() {
    try {
        console.log('🧪 Creating test donation with coordinates...\n');

        // First, add coordinates to existing donations
        console.log('1️⃣ Adding coordinates to existing donations...');
        await query(`
            UPDATE donations 
            SET latitude = 21.1458 + (RAND() * 0.01 - 0.005), 
                longitude = 79.0882 + (RAND() * 0.01 - 0.005)
            WHERE latitude IS NULL OR longitude IS NULL
        `);
        console.log('✅ Updated existing donations with coordinates');

        // Create a new test donation
        console.log('\n2️⃣ Creating new test donation...');
        const result = await query(`
            INSERT INTO donations (
                books, clothes, grains, footwear, toys, school_supplies,
                user_id, fname, lname, email, phone, phone2, flat, addline, land,
                city, state, pincode, optnote, pickup_date, pickup_time,
                status, volunteer_id, ngo_id, priority, district, latitude, longitude
            ) VALUES (
                3, 2, 1, 0, 0, 0,
                16, 'Test', 'Donor', 'test@example.com', '9876543210', '9876543211',
                'Test Flat', 'Test Address', 'Test Landmark',
                'Nagpur', 'Maharashtra', '440001', 'Test donation for distance display',
                '2025-12-20', '14:00:00',
                'assigned', NULL, 10, 'high', 'nagar', 21.1458, 79.0882
            )
        `);
        
        console.log(`✅ Test donation created with ID: ${result.insertId}`);
        console.log('📍 Coordinates: 21.1458, 79.0882 (Nagpur)');
        console.log('🏢 District: nagar (matches volunteer district)');
        console.log('📚 Items: 3 books, 2 clothes, 1 grains');
        console.log('🎯 Status: assigned (available for volunteers)');
        console.log('⭐ Priority: high');

        // Verify the test donation
        console.log('\n3️⃣ Verifying test donation...');
        const testDonation = await query(`
            SELECT id, city, latitude, longitude, status, district, books, clothes, grains
            FROM donations 
            WHERE id = ?
        `, [result.insertId]);
        
        if (testDonation.length > 0) {
            const donation = testDonation[0];
            console.log('✅ Test donation verified:');
            console.log(`   - ID: ${donation.id}`);
            console.log(`   - City: ${donation.city}`);
            console.log(`   - Coordinates: (${donation.latitude}, ${donation.longitude})`);
            console.log(`   - Status: ${donation.status}`);
            console.log(`   - District: ${donation.district}`);
            console.log(`   - Items: Books: ${donation.books}, Clothes: ${donation.clothes}, Grains: ${donation.grains}`);
        }

        console.log('\n🎉 Test setup completed!');
        console.log('📋 Now you can:');
        console.log('   1. Go to volunteer dashboard');
        console.log('   2. Look for the new donation in "Available Requests"');
        console.log('   3. See distance display with coordinates');
        console.log('   4. Click "Accept" to see confirmation dialog');

    } catch (error) {
        console.error('❌ Error creating test donation:', error);
    }
}

createTestDonationWithCoords();
