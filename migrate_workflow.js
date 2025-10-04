// CareConnect Workflow Migration Script
// Run this to update your database for the new workflow

import { query, connect, disconnect } from './db.js';

async function migrateWorkflow() {
  try {
    console.log('🔄 Starting CareConnect workflow migration...');
    
    await connect();
    console.log('✅ Connected to database');
    
    // 1. Add priority column
    try {
      await query(`
        ALTER TABLE donations 
        ADD COLUMN priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium'
      `);
      console.log('✅ Added priority column');
    } catch (err) {
      console.log('ℹ️ Priority column already exists or error:', err.message);
    }
    
    // 2. Add ngo_approval_status column
    try {
      await query(`
        ALTER TABLE donations 
        ADD COLUMN ngo_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
      `);
      console.log('✅ Added ngo_approval_status column');
    } catch (err) {
      console.log('ℹ️ ngo_approval_status column already exists or error:', err.message);
    }
    
    // 3. Update status enum
    try {
      await query(`
        ALTER TABLE donations 
        MODIFY COLUMN status ENUM('pending_approval', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'rejected') DEFAULT 'pending_approval'
      `);
      console.log('✅ Updated status enum');
    } catch (err) {
      console.log('ℹ️ Status enum already updated or error:', err.message);
    }
    
    // 4. Update existing donations to new workflow
    await query(`
      UPDATE donations 
      SET status = 'pending_approval', 
          ngo_approval_status = 'pending',
          priority = 'medium'
      WHERE status = 'pending' OR status IS NULL
    `);
    console.log('✅ Updated existing donations to new workflow');
    
    // 5. Add indexes for better performance
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_donations_ngo_approval ON donations(ngo_approval_status, city)
      `);
      console.log('✅ Added ngo_approval index');
    } catch (err) {
      console.log('ℹ️ Index already exists or error:', err.message);
    }
    
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_donations_priority ON donations(priority)
      `);
      console.log('✅ Added priority index');
    } catch (err) {
      console.log('ℹ️ Index already exists or error:', err.message);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 New Workflow Summary:');
    console.log('1. Donors create donations with priority selection');
    console.log('2. All NGOs in the city see pending donations');
    console.log('3. NGOs approve/reject donations (competition model)');
    console.log('4. Volunteers see only approved donations from their NGO');
    console.log('5. Priority system: 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Low');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateWorkflow();
}

export default migrateWorkflow;
