import { connect, disconnect, query } from "./db.js";

/**
 * Script to verify database cleanup status
 */

async function verifyCleanup() {
  try {
    await connect();
    console.log("✅ Connected to database\n");

    // Check all table counts
    const tables = [
      'users',
      'volunteers',
      'ngo_register',
      'donations',
      'donation_requests',
      'volunteer_assignments',
      'queries',
      'system_admins'
    ];

    console.log("📊 Database Status:\n");
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result[0].count;
        const status = count === 0 ? "✅ CLEARED" : `⚠️  HAS ${count} ENTRIES`;
        console.log(`   ${table.padEnd(25)} ${status}`);
      } catch (error) {
        console.log(`   ${table.padEnd(25)} ❌ TABLE NOT FOUND`);
      }
    }

    // Check admin account
    console.log("\n👤 Admin Account Status:\n");
    const admins = await query("SELECT email, name FROM system_admins");
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`   ✅ ${admin.email} (${admin.name})`);
      });
    } else {
      console.log("   ⚠️  No admin account found!");
    }

    console.log("\n✅ Verification complete!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await disconnect();
  }
}

verifyCleanup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

