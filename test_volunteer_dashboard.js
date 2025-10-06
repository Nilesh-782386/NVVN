// Test volunteer dashboard functionality
import { query } from './db.js';

async function testVolunteerDashboard() {
    try {
        console.log('🧪 Testing volunteer dashboard functionality...\n');

        // Test 1: Check available donations for volunteer district
        console.log('1️⃣ Checking available donations for district "nagar"...');
        const availableDonations = await query(`
            SELECT d.*, u.fullname as donor_name, u.phone as donor_phone, n.ngo_name
            FROM donations d 
            LEFT JOIN users u ON d.user_id = u.id 
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            WHERE LOWER(d.district) = LOWER('nagar') 
            AND d.status = 'assigned' 
            AND d.volunteer_id IS NULL
            ORDER BY d.created_at DESC
        `);
        
        console.log(`✅ Found ${availableDonations.length} available donations:`);
        availableDonations.forEach(donation => {
            console.log(`   - Donation ${donation.id}: ${donation.donor_name} (${donation.city})`);
            console.log(`     Coordinates: (${donation.latitude}, ${donation.longitude})`);
            console.log(`     Items: Books: ${donation.books}, Clothes: ${donation.clothes}`);
        });

        // Test 2: Check volunteer's accepted donations
        console.log('\n2️⃣ Checking volunteer 5 accepted donations...');
        const acceptedDonations = await query(`
            SELECT d.*, u.fullname as donor_name, u.phone as donor_phone, n.ngo_name
            FROM donations d 
            LEFT JOIN users u ON d.user_id = u.id 
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            WHERE d.volunteer_id = 5
            ORDER BY d.created_at DESC
        `);
        
        console.log(`✅ Volunteer 5 has ${acceptedDonations.length} accepted donations:`);
        acceptedDonations.forEach(donation => {
            console.log(`   - Donation ${donation.id}: ${donation.donor_name} (Status: ${donation.status})`);
        });

        // Test 3: Create a test donation if none available
        if (availableDonations.length === 0) {
            console.log('\n3️⃣ No available donations found. Creating test donation...');
            
            const testDonation = await query(`
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
            
            console.log(`✅ Test donation created with ID: ${testDonation.insertId}`);
            console.log('📍 Coordinates: 21.1458, 79.0882 (Nagpur)');
            console.log('🏢 District: nagar (matches volunteer district)');
            console.log('📚 Items: 2 books, 1 clothes');
        }

        console.log('\n🎉 Test completed!');
        console.log('\n📋 Summary:');
        console.log(`   - Available donations: ${availableDonations.length}`);
        console.log(`   - Accepted donations: ${acceptedDonations.length}`);
        console.log(`   - Distance display should work when there are available donations`);

    } catch (error) {
        console.error('❌ Error testing volunteer dashboard:', error);
    }
}

testVolunteerDashboard();
