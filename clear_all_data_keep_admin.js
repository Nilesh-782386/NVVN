import { connect, disconnect, query } from "./db.js";

/**
 * Script to clear all data from database while preserving admin account
 * This will:
 * 1. Backup admin account details
 * 2. Truncate all data tables
 * 3. Restore admin account
 * 
 * Database structure (tables, columns, indexes) will remain intact
 */

async function clearAllDataKeepAdmin() {
  try {
    console.log("🔄 Starting database cleanup...");
    await connect();
    console.log("✅ Connected to database");

    // Step 1: Backup admin account
    console.log("\n📦 Step 1: Backing up admin account...");
    const adminAccounts = await query("SELECT * FROM system_admins");
    
    if (adminAccounts.length === 0) {
      console.log("⚠️  WARNING: No admin account found in system_admins table!");
      console.log("⚠️  The admin account will not be restored after cleanup.");
    } else {
      console.log(`✅ Found ${adminAccounts.length} admin account(s) to preserve`);
      adminAccounts.forEach((admin, index) => {
        console.log(`   Admin ${index + 1}: ${admin.email} (${admin.name})`);
      });
    }

    // Step 2: Disable foreign key checks
    console.log("\n🔧 Step 2: Disabling foreign key checks...");
    await query("SET FOREIGN_KEY_CHECKS = 0");
    console.log("✅ Foreign key checks disabled");

    // Step 3: Truncate all data tables (in order to avoid FK issues)
    console.log("\n🗑️  Step 3: Truncating data tables...");
    
    const tablesToTruncate = [
      // Child tables first (tables with foreign keys)
      'volunteer_assignments',
      'assignment_metrics',
      'assignment_live_metrics',
      'donations',
      'donation_requests',
      'queries',
      
      // Parent tables (tables referenced by foreign keys)
      'volunteers',
      'ngo_register',
      'users',
      'donors',
      'ngos',
    ];

    for (const table of tablesToTruncate) {
      try {
        // Check if table exists
        const tableExists = await query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = ?
        `, [table]);
        
        if (tableExists[0].count > 0) {
          await query(`TRUNCATE TABLE ${table}`);
          console.log(`   ✅ Truncated: ${table}`);
        } else {
          console.log(`   ⚠️  Table not found (skipped): ${table}`);
        }
      } catch (error) {
        console.log(`   ❌ Error truncating ${table}: ${error.message}`);
        // Continue with other tables
      }
    }

    // Step 4: Clear system_admins but restore admin account(s)
    console.log("\n🔄 Step 4: Restoring admin account(s)...");
    await query("TRUNCATE TABLE system_admins");
    console.log("   ✅ Cleared system_admins table");

    // Restore admin accounts - dynamically build INSERT based on available columns
    if (adminAccounts.length > 0) {
      // Check which columns exist in the table
      const tableColumns = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'system_admins'
        ORDER BY ORDINAL_POSITION
      `);
      
      const columnNames = tableColumns.map(col => col.COLUMN_NAME);
      console.log(`   📋 Available columns: ${columnNames.join(', ')}`);
      
      for (const admin of adminAccounts) {
        // Build dynamic INSERT query based on available columns
        const columns = [];
        const values = [];
        const placeholders = [];
        
        // Always include core columns
        if (columnNames.includes('email')) {
          columns.push('email');
          values.push(admin.email);
          placeholders.push('?');
        }
        if (columnNames.includes('password')) {
          columns.push('password');
          values.push(admin.password);
          placeholders.push('?');
        }
        if (columnNames.includes('name')) {
          columns.push('name');
          values.push(admin.name);
          placeholders.push('?');
        }
        // Include timestamp columns if they exist
        if (columnNames.includes('created_at')) {
          columns.push('created_at');
          values.push(admin.created_at || new Date());
          placeholders.push('?');
        }
        if (columnNames.includes('updated_at')) {
          columns.push('updated_at');
          values.push(admin.updated_at || new Date());
          placeholders.push('?');
        }
        
        const insertQuery = `INSERT INTO system_admins (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await query(insertQuery, values);
        console.log(`   ✅ Restored admin: ${admin.email}`);
      }
    } else {
      console.log("   ⚠️  No admin account to restore");
    }

    // Step 5: Re-enable foreign key checks
    console.log("\n🔧 Step 5: Re-enabling foreign key checks...");
    await query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✅ Foreign key checks re-enabled");

    // Step 6: Verify cleanup
    console.log("\n✅ Step 6: Verifying cleanup...");
    
    const counts = {
      users: await query("SELECT COUNT(*) as count FROM users"),
      volunteers: await query("SELECT COUNT(*) as count FROM volunteers"),
      ngo_register: await query("SELECT COUNT(*) as count FROM ngo_register"),
      donations: await query("SELECT COUNT(*) as count FROM donations"),
      system_admins: await query("SELECT COUNT(*) as count FROM system_admins"),
    };

    console.log("\n📊 Final Data Counts:");
    console.log(`   Users: ${counts.users[0].count}`);
    console.log(`   Volunteers: ${counts.volunteers[0].count}`);
    console.log(`   NGOs: ${counts.ngo_register[0].count}`);
    console.log(`   Donations: ${counts.donations[0].count}`);
    console.log(`   Admin Accounts: ${counts.system_admins[0].count}`);

    if (counts.system_admins[0].count > 0) {
      const restoredAdmins = await query("SELECT email, name FROM system_admins");
      console.log("\n👤 Restored Admin Account(s):");
      restoredAdmins.forEach(admin => {
        console.log(`   ✅ ${admin.email} (${admin.name})`);
      });
    }

    console.log("\n✅ Database cleanup completed successfully!");
    console.log("✅ All data cleared except admin account(s)");
    console.log("✅ Database structure preserved");
    console.log("\n🎯 You can now register new users, volunteers, and NGOs for your presentation!");

  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    console.error("Stack trace:", error.stack);
    
    // Try to re-enable foreign key checks even if there was an error
    try {
      await query("SET FOREIGN_KEY_CHECKS = 1");
      console.log("✅ Foreign key checks re-enabled (after error)");
    } catch (fkError) {
      console.error("❌ Failed to re-enable foreign key checks:", fkError.message);
    }
    
    throw error;
  } finally {
    await disconnect();
    console.log("\n✅ Disconnected from database");
  }
}

// Run the cleanup
clearAllDataKeepAdmin()
  .then(() => {
    console.log("\n🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });

