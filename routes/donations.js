import express from "express";
import { query } from "../db.js";
import { ensureUserAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Submit donation - UPDATED FOR HYBRID AI + MANUAL PRIORITY SYSTEM + CUSTOM ITEMS
router.post("/submit-donation", ensureUserAuthenticated, async (req, res) => {
  const {
    books = 0,
    clothes = 0,
    grains = 0,
    footwear = 0,
    toys = 0,
    schoolSupplies = 0,
    ai_suggested_priority = 'medium',
    final_priority = 'medium',
    is_manual_override = 'false',
    custom_quantity = 0,
    custom_description = ''
  } = req.body;
  const userId = req.session.user.id;
  
  // Check if this is a custom item donation
  const isCustomItem = custom_description && custom_description.trim() !== '';
  
  // Determine if this is a universal item (food, medicine, water)
  const isUniversalItem = grains > 0 || 
    (isCustomItem && custom_description && 
     (custom_description.toLowerCase().includes('food') || 
      custom_description.toLowerCase().includes('medicine') || 
      custom_description.toLowerCase().includes('medical') || 
      custom_description.toLowerCase().includes('water')));
  
  try {
    // Get user's district for proper matching
    const userResult = await query(
      "SELECT district FROM users WHERE id = ?",
      [userId]
    );
    const userDistrict = userResult && userResult[0] ? userResult[0].district : (req.session.user.city || 'Pune').toLowerCase();
    
    const result = await query(
      `INSERT INTO donations (books, clothes, grains, footwear, toys, school_supplies, user_id, status, city, district, priority, ai_suggested_priority, final_priority, is_manual_override, is_custom_item, custom_description, custom_quantity, ngo_approval_status, is_universal_item)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [books, clothes, grains, footwear, toys, schoolSupplies, userId, req.session.user.city || 'Pune', userDistrict, final_priority, ai_suggested_priority, final_priority, is_manual_override === 'true', isCustomItem ? 1 : 0, custom_description, custom_quantity, isUniversalItem ? 1 : 0]
    );
    const donationId = result.insertId;
    res.redirect(`/submit-info?donationId=${donationId}`);
  } catch (err) {
    console.error("Donation submission error:", err);
    res.status(500).send("Server error");
  }
});

// Submit info - FIXED
router.post("/submit-info", ensureUserAuthenticated, async (req, res) => {
  const {
    donationId,
    fname,
    lname,
    email,
    phone,
    phone2,
    flat,
    addline,
    land,
    city,
    state,
    pincode,
    optnote,
  } = req.body;
  
  try {
    await query(
      `UPDATE donations SET 
        fname = ?, lname = ?, email = ?, phone = ?, phone2 = ?, 
        flat = ?, addline = ?, land = ?, city = ?, state = ?, 
        pincode = ?, optnote = ? 
       WHERE id = ?`,
      [
        fname, lname, email, phone, phone2,
        flat, addline, land, city, state,
        pincode, optnote, donationId
      ]
    );
    res.redirect(`/donated?donationId=${donationId}`);
  } catch (err) {
    console.error("Info submission error:", err);
    res.status(500).send("Server error");
  }
});

// Donated - FIXED
router.post("/donated", ensureUserAuthenticated, async (req, res) => {
  const { date, time, donationId } = req.body;
  
  try {
    const convertTo24Hour = (timeStr) => {
      if (!timeStr) return '12:00:00';
      const [timePart, modifier] = timeStr.split(' ');
      let [hours, minutes] = timePart.split(':');
      
      if (modifier === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
      if (modifier === 'AM' && hours === '12') hours = '00';
      
      return `${hours.padStart(2, '0')}:${minutes}:00`;
    };

    const mysqlTime = convertTo24Hour(time);
    
    await query(
      `UPDATE donations SET pickup_date = ?, pickup_time = ?, status = 'pending_approval' WHERE id = ?`,
      [date, mysqlTime, donationId]
    );
    
    res.redirect("/?success=donation_created");
  } catch (err) {
    console.error("Donation completion error:", err);
    res.status(500).send("Server error");
  }
});

// DEBUG ROUTE: Check all donations in database
router.get("/debug/all-donations", async (req, res) => {
  try {
    const result = await query(`
      SELECT id, status, city, volunteer_id, created_at 
      FROM donations 
      ORDER BY created_at DESC
    `);
    
    console.log("📊 ALL DONATIONS IN DATABASE:");
    console.log(result);
    
    res.json({
      total: result?.length || 0,
      donations: result || []
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG ROUTE: Create test donation
router.get("/debug/create-test", async (req, res) => {
  try {
    const result = await query(`
      INSERT INTO donations 
      (books, clothes, user_id, status, city, fname, lname, phone, created_at) 
      VALUES (5, 10, 1, 'pending', 'Pune', 'Test', 'Donor', '1234567890', NOW())
    `);
    
    console.log("✅ TEST DONATION CREATED, ID:", result.insertId);
    
    res.json({
      success: true,
      donationId: result.insertId,
      message: "Test donation created successfully!" 
    });
  } catch (err) {
    console.error("Test donation error:", err);
    res.json({ success: false, error: err.message });
  }
});

// Complete donation
router.post("/donations/:id/complete", async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      "UPDATE donations SET status = 'completed' WHERE id = ?",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Cancel donation
router.post("/donations/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      "UPDATE donations SET status = 'cancelled' WHERE id = ?",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Volunteer accepts donation
router.post("/donations/:id/accept", async (req, res) => {
  const { id } = req.params;
  const { volunteerId, volunteerName, volunteerPhone } = req.body;
  
  try {
    await query(
      `UPDATE donations SET 
       status = 'assigned', 
       volunteer_id = ?, 
       volunteer_name = ?, 
       volunteer_phone = ?,
       assigned_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [volunteerId, volunteerName, volunteerPhone, id]
    );
    
    res.json({ success: true, message: "Donation accepted successfully!" });
  } catch (err) {
    console.error("Accept donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Volunteer marks donation as picked up
router.post("/donations/:id/pickup", async (req, res) => {
  const { id } = req.params;
  
  try {
    await query(
      "UPDATE donations SET status = 'picked_up' WHERE id = ? AND status = 'assigned'",
      [id]
    );
    
    res.json({ success: true, message: "Donation marked as picked up!" });
  } catch (err) {
    console.error("Pickup donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Volunteer marks donation as delivered
router.post("/donations/:id/deliver", async (req, res) => {
  const { id } = req.params;
  const { ngoId } = req.body;
  
  try {
    await query(
      "UPDATE donations SET status = 'delivered', ngo_id = ? WHERE id = ? AND status = 'picked_up'",
      [ngoId, id]
    );
    
    res.json({ success: true, message: "Donation marked as delivered!" });
  } catch (err) {
    console.error("Deliver donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// API: Get donation history for user
router.get("/api/donations/history", ensureUserAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const result = await query(`
      SELECT d.*, COALESCE(v.fullname, v.name) as volunteer_name, v.phone as volunteer_phone, n.ngo_name,
             u.fullname as donor_name, u.phone as donor_phone, u.email as donor_email
      FROM donations d
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
    `, [userId]);
    
    res.json({ 
      success: true, 
      donations: result || [] 
    });
  } catch (error) {
    console.error("Donation history error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load donation history" 
    });
  }
});

// Web page: Donation details
router.get("/donation/details/:id", ensureUserAuthenticated, async (req, res) => {
  try {
    const donationId = req.params.id;
    const userId = req.session.user.id;
    
    const result = await query(`
      SELECT d.*, COALESCE(v.fullname, v.name) as volunteer_name, v.phone as volunteer_phone, n.ngo_name,
             u.fullname as donor_name, u.phone as donor_phone, u.email as donor_email
      FROM donations d
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ? AND d.user_id = ?
    `, [donationId, userId]);
    
    if (result && result.length > 0) {
      res.render('donation-details', { 
        donation: result[0],
        title: 'Donation Details'
      });
    } else {
      res.status(404).render('error', { 
        message: 'Donation not found or you do not have permission to view this donation.',
        title: 'Donation Not Found'
      });
    }
  } catch (error) {
    console.error("Error fetching donation details:", error);
    res.status(500).render('error', { 
      message: 'Failed to load donation details. Please try again later.',
      title: 'Server Error'
    });
  }
});

// API: Get specific donation details
// API: Get donation coordinates for distance calculation
router.get("/api/donations/:id/coordinates", async (req, res) => {
  try {
    const donationId = req.params.id;
    
    const result = await query(
      'SELECT latitude, longitude FROM donations WHERE id = ?',
      [donationId]
    );
    
    if (result && result.length > 0) {
      res.json({
        success: true,
        coordinates: {
          lat: result[0].latitude,
          lng: result[0].longitude
        }
      });
    } else {
      res.status(404).json({ 
        success: false,
        error: 'Donation not found' 
      });
    }
  } catch (error) {
    console.error("Get coordinates error:", error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get coordinates' 
    });
  }
});

export default router;