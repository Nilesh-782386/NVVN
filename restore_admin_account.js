import { connect, disconnect, query } from "./db.js";
import bcrypt from "bcryptjs";

/**
 * Script to restore admin account after database cleanup
 * Admin credentials: nileshkhedkar24@gmail.com / pass@123
 */

async function restoreAdminAccount() {
  try {
    console.log("🔄 Restoring admin account...");
    await connect();
    console.log("✅ Connected to database");

    // Admin credentials
    const adminEmail = "nileshkhedkar24@gmail.com";
    const adminPassword = "pass@123";
    const adminName = "Nilesh Khedkar";

    // Check if admin already exists
    const existingAdmins = await query(
      "SELECT * FROM system_admins WHERE email = ?",
      [adminEmail]
    );

    if (existingAdmins.length > 0) {
      console.log("✅ Admin account already exists!");
      console.log(`   Email: ${existingAdmins[0].email}`);
      console.log(`   Name: ${existingAdmins[0].name}`);
      return;
    }

    // Hash the password
    console.log("🔐 Hashing admin password...");
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    console.log("✅ Password hashed");

    // Check which columns exist in the table
    const tableColumns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'system_admins'
      ORDER BY ORDINAL_POSITION
    `);

    const columnNames = tableColumns.map(col => col.COLUMN_NAME);
    console.log(`📋 Available columns: ${columnNames.join(', ')}`);

    // Build dynamic INSERT query
    const columns = [];
    const values = [];
    const placeholders = [];

    if (columnNames.includes('email')) {
      columns.push('email');
      values.push(adminEmail);
      placeholders.push('?');
    }
    if (columnNames.includes('password')) {
      columns.push('password');
      values.push(hashedPassword);
      placeholders.push('?');
    }
    if (columnNames.includes('name')) {
      columns.push('name');
      values.push(adminName);
      placeholders.push('?');
    }
    if (columnNames.includes('created_at')) {
      columns.push('created_at');
      values.push(new Date());
      placeholders.push('?');
    }
    if (columnNames.includes('updated_at')) {
      columns.push('updated_at');
      values.push(new Date());
      placeholders.push('?');
    }

    // Insert admin account
    const insertQuery = `INSERT INTO system_admins (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await query(insertQuery, values);

    console.log("✅ Admin account created successfully!");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Name: ${adminName}`);

    // Verify
    const verifyAdmins = await query("SELECT email, name FROM system_admins");
    console.log("\n📊 Current Admin Accounts:");
    verifyAdmins.forEach(admin => {
      console.log(`   ✅ ${admin.email} (${admin.name})`);
    });

  } catch (error) {
    console.error("❌ Error restoring admin account:", error);
    throw error;
  } finally {
    await disconnect();
    console.log("\n✅ Disconnected from database");
  }
}

// Run the restore
restoreAdminAccount()
  .then(() => {
    console.log("\n🎉 Admin account restored successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Failed to restore admin account:", error);
    process.exit(1);
  });

