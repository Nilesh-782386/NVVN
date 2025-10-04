import express from "express";
import { query } from "../db.js";

const router = express.Router();

// Database migration endpoint
router.get("/migrate-enhancements", async (req, res) => {
  try {
    console.log("🔄 Starting database enhancements...");
    
    // 1. Enhance donations status options
    await query(`
      ALTER TABLE donations 
      MODIFY status ENUM('pending','assigned','picked_up','in_transit','delivered','completed')
    `);
    console.log("✅ Enhanced donation status options");
    
    // 2. Add NGO reference to donations (if not exists)
    try {
      await query(`
        ALTER TABLE donations 
        ADD COLUMN ngo_id INT,
        ADD FOREIGN KEY (ngo_id) REFERENCES ngo_register(id)
      `);
      console.log("✅ Added NGO reference to donations");
    } catch (err) {
      console.log("ℹ️ NGO reference already exists or error:", err.message);
    }
    
    // 3. Add coordinates to NGOs (if not exists)
    try {
      await query(`
        ALTER TABLE ngo_register 
        ADD COLUMN latitude DECIMAL(10, 8),
        ADD COLUMN longitude DECIMAL(11, 8)
      `);
      console.log("✅ Added coordinates to NGOs");
    } catch (err) {
      console.log("ℹ️ Coordinates already exist or error:", err.message);
    }
    
    // 4. Add sample NGO coordinates for demo
    await query(`
      UPDATE ngo_register 
      SET latitude = 18.5204, longitude = 73.8567 
      WHERE latitude IS NULL LIMIT 1
    `);
    console.log("✅ Added sample NGO coordinates");
    
    res.json({ success: true, message: "Database enhancements completed!" });
    
  } catch (err) {
    console.error("❌ Migration error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;