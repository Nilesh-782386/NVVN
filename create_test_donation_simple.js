// Simple script to create a test donation
import { query } from './db.js';

async function createTestDonation() {

    try {
        console.log('🧪 Creating test donation...');
        
        const result = await query(`
            INSERT INTO donations (
                books, clothes, grains, footwear, toys, school_supplies,
                user_id, fname, lname, email, phone, phone2, flat, addline, land,
                city, state, pincode, optnote, pickup_date, pickup_time,
                status, volunteer_id, ngo_id, priority, district, latitude, longitude
            ) VALUES (
                2, 1, 0, 0, 0, 0,
                16, 'Test', 'Donor', 'test@example.com', '9876543210', '9876543211',
                'Test Flat', 'Test Address', 'Test Landmark',
                'Nagpur', 'Maharashtra', '440001', 'Test donation for distance display',
                '2025-12-15', '10:00:00',
                'assigned', NULL, 10, 'medium', 'nagar', 21.1458, 79.0882
            )
        `);
        
        console.log('✅ Test donation created with ID:', result.insertId);
        console.log('📍 Coordinates: 21.1458, 79.0882 (Nagpur)');
        console.log('🏢 District: nagar (matches volunteer district)');
        console.log('📚 Items: 2 books, 1 clothes');
        console.log('🎯 Status: assigned (available for volunteers)');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTestDonation();
