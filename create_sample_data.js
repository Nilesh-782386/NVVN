import { query } from './db.js';

async function createSampleData() {
  console.log('🎯 Creating Sample Data for Testing...\n');
  
  try {
    // 1. Create sample users
    console.log('1. Creating sample users...');
    // Check if users already exist
    const [existingUsers] = await query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0] && existingUsers[0][0] && existingUsers[0][0].count > 0) {
      console.log('   ⚠️  Users already exist, skipping user creation');
    } else {
      try {
      const [user1] = await query(`
        INSERT INTO users (fullname, email, phone, password)
        VALUES ('John Doe', 'john@example.com', '9876543210', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
      `);
      console.log('   ✅ User 1 created with ID:', user1.insertId);
      
      const [user2] = await query(`
        INSERT INTO users (fullname, email, phone, password)
        VALUES ('Jane Smith', 'jane@example.com', '9876543211', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
      `);
      console.log('   ✅ User 2 created with ID:', user2.insertId);
      } catch (error) {
        console.log('   ⚠️  Error creating users:', error.message);
      }
    }
    
    // 2. Create sample NGOs
    console.log('\n2. Creating sample NGOs...');
    const [existingNGOs] = await query('SELECT COUNT(*) as count FROM ngo_register');
    if (existingNGOs[0] && existingNGOs[0][0] && existingNGOs[0][0].count > 0) {
      console.log('   ⚠️  NGOs already exist, skipping NGO creation');
    } else {
      try {
      const [ngo1] = await query(`
        INSERT INTO ngo_register (ngo_name, email, primary_phone, city, state, registration_number, status)
        VALUES ('Food for All', 'foodforall@example.com', '9876543220', 'Pune', 'Maharashtra', 'NGO001', 'verified')
      `);
      console.log('   ✅ NGO 1 created with ID:', ngo1.insertId);
      
      const [ngo2] = await query(`
        INSERT INTO ngo_register (ngo_name, email, primary_phone, city, state, registration_number, status)
        VALUES ('Hope Foundation', 'hope@example.com', '9876543221', 'Mumbai', 'Maharashtra', 'NGO002', 'verified')
      `);
      console.log('   ✅ NGO 2 created with ID:', ngo2.insertId);
      } catch (error) {
        console.log('   ⚠️  Error creating NGOs:', error.message);
      }
    }
    
    // 3. Create sample volunteers
    console.log('\n3. Creating sample volunteers...');
    const [existingVolunteers] = await query('SELECT COUNT(*) as count FROM volunteers');
    if (existingVolunteers[0] && existingVolunteers[0][0] && existingVolunteers[0][0].count > 0) {
      console.log('   ⚠️  Volunteers already exist, skipping volunteer creation');
    } else {
      try {
      // Get NGO IDs
      const [ngos] = await query('SELECT id FROM ngo_register LIMIT 2');
      const ngo1Id = ngos[0] && ngos[0][0] ? ngos[0][0].id : 1;
      const ngo2Id = ngos[0] && ngos[0][1] ? ngos[0][1].id : 2;
      
      const [volunteer1] = await query(`
        INSERT INTO volunteers (name, email, phone, city, vehicle_type, availability, password, status, ngo_id)
        VALUES ('Amit Kumar', 'amit@example.com', '9876543230', 'Pune', '2-wheeler', 'available', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', ?)
      `, [ngo1Id]);
      console.log('   ✅ Volunteer 1 created with ID:', volunteer1.insertId);
      
      const [volunteer2] = await query(`
        INSERT INTO volunteers (name, email, phone, city, vehicle_type, availability, password, status, ngo_id)
        VALUES ('Priya Sharma', 'priya@example.com', '9876543231', 'Mumbai', '4-wheeler', 'available', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'active', ?)
      `, [ngo2Id]);
      console.log('   ✅ Volunteer 2 created with ID:', volunteer2.insertId);
      } catch (error) {
        console.log('   ⚠️  Error creating volunteers:', error.message);
      }
    }
    
    // 4. Create sample donations
    console.log('\n4. Creating sample donations...');
    const [existingDonations] = await query('SELECT COUNT(*) as count FROM donations');
    if (existingDonations[0] && existingDonations[0][0] && existingDonations[0][0].count > 0) {
      console.log('   ⚠️  Donations already exist, skipping donation creation');
    } else {
      try {
      // Get user and NGO IDs
      const [users] = await query('SELECT id FROM users LIMIT 2');
      const [ngos] = await query('SELECT id FROM ngo_register LIMIT 2');
      const [volunteers] = await query('SELECT id FROM volunteers LIMIT 2');
      
      const user1Id = users[0] && users[0][0] ? users[0][0].id : 1;
      const user2Id = users[0] && users[0][1] ? users[0][1].id : 2;
      const ngo1Id = ngos[0] && ngos[0][0] ? ngos[0][0].id : 1;
      const ngo2Id = ngos[0] && ngos[0][1] ? ngos[0][1].id : 2;
      const volunteer1Id = volunteers[0] && volunteers[0][0] ? volunteers[0][0].id : 1;
      const volunteer2Id = volunteers[0] && volunteers[0][1] ? volunteers[0][1].id : 2;
      
      const [donation1] = await query(`
        INSERT INTO donations (books, clothes, grains, user_id, status, city, fname, lname, email, phone, priority, ngo_approval_status, ngo_id, volunteer_id, volunteer_name, volunteer_phone)
        VALUES (10, 5, 0, ?, 'completed', 'Pune', 'John', 'Doe', 'john@example.com', '9876543210', 'high', 'approved', ?, ?, 'Amit Kumar', '9876543230')
      `, [user1Id, ngo1Id, volunteer1Id]);
      console.log('   ✅ Donation 1 (completed) created with ID:', donation1.insertId);
      
      const [donation2] = await query(`
        INSERT INTO donations (books, clothes, grains, user_id, status, city, fname, lname, email, phone, priority, ngo_approval_status, ngo_id, volunteer_id, volunteer_name, volunteer_phone)
        VALUES (0, 15, 5, ?, 'assigned', 'Mumbai', 'Jane', 'Smith', 'jane@example.com', '9876543211', 'medium', 'approved', ?, ?, 'Priya Sharma', '9876543231')
      `, [user2Id, ngo2Id, volunteer2Id]);
      console.log('   ✅ Donation 2 (assigned) created with ID:', donation2.insertId);
      
      const [donation3] = await query(`
        INSERT INTO donations (books, clothes, grains, user_id, status, city, fname, lname, email, phone, priority, ngo_approval_status)
        VALUES (20, 0, 10, ?, 'pending_approval', 'Pune', 'John', 'Doe', 'john@example.com', '9876543210', 'critical', 'pending')
      `, [user1Id]);
      console.log('   ✅ Donation 3 (pending approval) created with ID:', donation3.insertId);
      
      const [donation4] = await query(`
        INSERT INTO donations (books, clothes, grains, user_id, status, city, fname, lname, email, phone, priority, ngo_approval_status, ngo_id)
        VALUES (5, 8, 3, ?, 'assigned', 'Mumbai', 'Jane', 'Smith', 'jane@example.com', '9876543211', 'low', 'approved', ?)
      `, [user2Id, ngo2Id]);
      console.log('   ✅ Donation 4 (assigned, no volunteer) created with ID:', donation4.insertId);
      } catch (error) {
        console.log('   ⚠️  Error creating donations:', error.message);
      }
    }
    
    // 5. Create admin user
    console.log('\n5. Creating admin user...');
    const [existingAdmins] = await query('SELECT COUNT(*) as count FROM system_admins');
    if (existingAdmins[0] && existingAdmins[0][0] && existingAdmins[0][0].count > 0) {
      console.log('   ⚠️  Admin already exists, skipping admin creation');
    } else {
      try {
      const [admin] = await query(`
        INSERT INTO system_admins (email, password, name)
        VALUES ('admin@careconnect.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Admin')
      `);
      console.log('   ✅ Admin created with ID:', admin.insertId);
      } catch (error) {
        console.log('   ⚠️  Error creating admin:', error.message);
      }
    }
    
    console.log('\n✅ Sample data creation completed!');
    console.log('\n📋 Test Credentials:');
    console.log('   Users:');
    console.log('     - john@example.com / password');
    console.log('     - jane@example.com / password');
    console.log('   NGOs:');
    console.log('     - foodforall@example.com / password');
    console.log('     - hope@example.com / password');
    console.log('   Volunteers:');
    console.log('     - amit@example.com / password');
    console.log('     - priya@example.com / password');
    console.log('   Admin:');
    console.log('     - admin@careconnect.com / password');
    
  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
  } finally {
    process.exit(0);
  }
}

createSampleData();
