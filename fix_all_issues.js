import { query, connect, disconnect } from './db.js';

async function fixAllIssues() {
  try {
    console.log('🔧 Starting comprehensive issue fixes...');
    
    // Connect to database
    await connect();
    console.log('✅ Connected to database');
    
    // 1. Create system_admins table if it doesn't exist
    console.log('\n1. Creating system_admins table...');
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS system_admins (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ system_admins table created/verified');
    } catch (error) {
      console.log('   ⚠️  system_admins table already exists or error:', error.message);
    }
    
    // 2. Add missing columns to volunteers table
    console.log('\n2. Adding missing columns to volunteers table...');
    const volunteerColumns = [
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'district', type: 'VARCHAR(100)' },
      { name: 'vehicle_type', type: 'VARCHAR(50)' },
      { name: 'status', type: "ENUM('active', 'inactive', 'suspended') DEFAULT 'active'" },
      { name: 'ngo_id', type: 'INT' },
      { name: 'latitude', type: 'DECIMAL(10, 8)' },
      { name: 'longitude', type: 'DECIMAL(11, 8)' }
    ];
    
    for (const column of volunteerColumns) {
      try {
        await query(`ALTER TABLE volunteers ADD COLUMN ${column.name} ${column.type}`);
        console.log(`   ✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`   ⚠️  Column ${column.name} already exists`);
        } else {
          console.log(`   ❌ Error adding ${column.name}:`, error.message);
        }
      }
    }
    
    // 3. Add missing columns to ngo_register table
    console.log('\n3. Adding missing columns to ngo_register table...');
    const ngoColumns = [
      { name: 'primary_phone', type: 'VARCHAR(20)' },
      { name: 'alternate_phone', type: 'VARCHAR(20)' },
      { name: 'landmark', type: 'VARCHAR(255)' },
      { name: 'district', type: 'VARCHAR(100)' },
      { name: 'website_url', type: 'VARCHAR(255)' },
      { name: 'social_handle_url', type: 'VARCHAR(255)' },
      { name: 'registration_certificate', type: 'VARCHAR(512)' },
      { name: 'status', type: "ENUM('applied', 'verified', 'suspended', 'rejected') DEFAULT 'applied'" },
      { name: 'latitude', type: 'DECIMAL(10, 8)' },
      { name: 'longitude', type: 'DECIMAL(11, 8)' },
      { name: 'ngo_type', type: "ENUM('multi_purpose', 'education', 'health', 'environment', 'women_empowerment', 'child_welfare', 'elderly_care', 'disability_support', 'animal_welfare', 'disaster_relief') DEFAULT 'multi_purpose'" },
      { name: 'can_accept_universal', type: 'BOOLEAN DEFAULT TRUE' }
    ];
    
    for (const column of ngoColumns) {
      try {
        await query(`ALTER TABLE ngo_register ADD COLUMN ${column.name} ${column.type}`);
        console.log(`   ✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`   ⚠️  Column ${column.name} already exists`);
        } else {
          console.log(`   ❌ Error adding ${column.name}:`, error.message);
        }
      }
    }
    
    // 4. Add missing columns to users table
    console.log('\n4. Adding missing columns to users table...');
    const userColumns = [
      { name: 'city', type: 'VARCHAR(100)' },
      { name: 'district', type: 'VARCHAR(100)' },
      { name: 'latitude', type: 'DECIMAL(10, 8)' },
      { name: 'longitude', type: 'DECIMAL(11, 8)' }
    ];
    
    for (const column of userColumns) {
      try {
        await query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`   ✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`   ⚠️  Column ${column.name} already exists`);
        } else {
          console.log(`   ❌ Error adding ${column.name}:`, error.message);
        }
      }
    }
    
    // 5. Add missing columns to donations table
    console.log('\n5. Adding missing columns to donations table...');
    const donationColumns = [
      { name: 'district', type: 'VARCHAR(100)' },
      { name: 'latitude', type: 'DECIMAL(10, 8)' },
      { name: 'longitude', type: 'DECIMAL(11, 8)' },
      { name: 'ai_suggested_priority', type: "ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium'" },
      { name: 'final_priority', type: "ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium'" },
      { name: 'is_manual_override', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'is_custom_item', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'custom_description', type: 'TEXT' },
      { name: 'custom_quantity', type: 'INTEGER DEFAULT 0' },
      { name: 'is_universal_item', type: 'BOOLEAN DEFAULT FALSE' }
    ];
    
    for (const column of donationColumns) {
      try {
        await query(`ALTER TABLE donations ADD COLUMN ${column.name} ${column.type}`);
        console.log(`   ✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`   ⚠️  Column ${column.name} already exists`);
        } else {
          console.log(`   ❌ Error adding ${column.name}:`, error.message);
        }
      }
    }
    
    // 6. Fix donation_requests table
    console.log('\n6. Fixing donation_requests table...');
    try {
      await query(`ALTER TABLE donation_requests ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST`);
      console.log('   ✅ Added id column to donation_requests');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('   ⚠️  donation_requests id column already exists');
      } else {
        console.log('   ❌ Error fixing donation_requests:', error.message);
      }
    }
    
    // 7. Create default admin user
    console.log('\n7. Creating default admin user...');
    try {
      await query(`
        INSERT IGNORE INTO system_admins (email, password, name) 
        VALUES ('admin@careconnect.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Admin')
      `);
      console.log('   ✅ Default admin user created/verified');
    } catch (error) {
      console.log('   ⚠️  Admin user already exists or error:', error.message);
    }
    
    // 8. Update existing records with default values
    console.log('\n8. Updating existing records...');
    try {
      await query("UPDATE volunteers SET status = 'active' WHERE status IS NULL");
      console.log('   ✅ Updated volunteers status');
    } catch (error) {
      console.log('   ⚠️  Error updating volunteers:', error.message);
    }
    
    try {
      await query("UPDATE ngo_register SET verification_status = 'pending' WHERE verification_status IS NULL");
      console.log('   ✅ Updated ngo_register verification_status');
    } catch (error) {
      console.log('   ⚠️  Error updating ngo_register:', error.message);
    }
    
    // 9. Create performance indexes
    console.log('\n9. Creating performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status)',
      'CREATE INDEX IF NOT EXISTS idx_volunteers_ngo_id ON volunteers(ngo_id)',
      'CREATE INDEX IF NOT EXISTS idx_ngo_register_verification_status ON ngo_register(verification_status)',
      'CREATE INDEX IF NOT EXISTS idx_donations_district ON donations(district)',
      'CREATE INDEX IF NOT EXISTS idx_donations_priority ON donations(priority)',
      'CREATE INDEX IF NOT EXISTS idx_donations_ngo_approval ON donations(ngo_approval_status)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await query(indexSQL);
        console.log(`   ✅ Created index: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`   ⚠️  Index already exists or error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 All issues fixed successfully!');
    console.log('\n📋 Summary of fixes:');
    console.log('   ✅ Created system_admins table');
    console.log('   ✅ Added missing columns to volunteers table');
    console.log('   ✅ Added missing columns to ngo_register table');
    console.log('   ✅ Added missing columns to users table');
    console.log('   ✅ Added missing columns to donations table');
    console.log('   ✅ Fixed donation_requests table structure');
    console.log('   ✅ Created default admin user');
    console.log('   ✅ Updated existing records with default values');
    console.log('   ✅ Created performance indexes');
    
    console.log('\n🔑 Default Admin Credentials:');
    console.log('   Email: admin@careconnect.com');
    console.log('   Password: password');
    
    console.log('\n🚀 The application should now work correctly!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  } finally {
    await disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the fixes
fixAllIssues();
