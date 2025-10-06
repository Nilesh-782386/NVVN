import express from "express";
import { query } from "../db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { ensureVolunteerAuthenticated } from "../middleware/auth.js";
import trustScoreService from "../services/trustScoreService.js";

const router = express.Router();

// Upload storage for delivery proof
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "upload");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}-volunteer-${req.session.volunteer.id}${ext}`);
  }
});
const upload = multer({ storage });

// Volunteer Profile Routes
router.get("/volunteer/my-requests", ensureVolunteerAuthenticated, async (req, res) => {
  try {
    const volunteerId = req.session.volunteer.id;
    
    // Get volunteer's assigned requests (all statuses)
    const result = await query(`
      SELECT d.*, u.fullname as donor_name, u.phone as donor_phone, n.ngo_name
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE d.volunteer_id = ? 
        AND d.status IN ('assigned', 'picked_up', 'in_transit', 'delivered')
      ORDER BY 
        CASE d.status 
          WHEN 'assigned' THEN 1 
          WHEN 'picked_up' THEN 2 
          WHEN 'in_transit' THEN 3 
          WHEN 'delivered' THEN 4 
        END,
        d.created_at DESC
    `, [volunteerId]);
    
    res.json({ 
      success: true, 
      requests: result || [],
      volunteer: req.session.volunteer
    });
  } catch (error) {
    console.error("My requests error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/volunteer/available", ensureVolunteerAuthenticated, async (req, res) => {
  try {
    console.log("🔍 Volunteer available route called");
    const volunteerId = req.session.volunteer.id;
    console.log("🔍 Volunteer ID:", volunteerId);
    console.log("🔍 Volunteer session:", req.session.volunteer);
    
    // Get volunteer's district
    const volunteerResult = await query(
      "SELECT district FROM volunteers WHERE id = ?",
      [volunteerId]
    );
    
    const volunteerDistrict = volunteerResult && volunteerResult[0] ? volunteerResult[0].district : null;
    console.log("🔍 Volunteer district:", volunteerDistrict);
    
    // Get available requests in volunteer's district (case insensitive)
    console.log("🔍 Querying available donations for district:", volunteerDistrict);
    const result = await query(`
      SELECT d.*, u.fullname as donor_name, u.phone as donor_phone, n.ngo_name
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE LOWER(d.district) = LOWER(?) AND d.status = 'assigned' AND d.volunteer_id IS NULL
      ORDER BY 
        CASE d.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        d.created_at DESC
    `, [volunteerDistrict]);
    
    console.log("🔍 Available donations found:", result.length);
    if (result.length > 0) {
      console.log("🔍 First donation:", result[0].id, result[0].donor_name);
    }
    
    // Construct clean JSON response
    const response = {
      success: true,
      requests: result || [],
      volunteer: req.session.volunteer || {}
    };
    
    console.log("🔍 Sending response with", response.requests.length, "requests");
    // Send validated JSON
    res.json(response);
    
  } catch (error) {
    console.error("Available requests error:", error);
    
    // Send clean error response
    const errorResponse = {
      success: false,
      error: "Failed to fetch data",
      requests: [],
      volunteer: {}
    };
    
    res.status(500).json(errorResponse);
  }
});

// Volunteer Dashboard Data - UPDATED QUERY
router.get("/volunteer-dashboard-data", ensureVolunteerAuthenticated, async (req, res) => {
  console.log("🚨 API CALLED - Volunteer session:", req.session.volunteer);
  const volunteerId = req.session.volunteer.id;
  
  try {
    // Get volunteer's district first
    const volunteerResult = await query(
      "SELECT district FROM volunteers WHERE id = ?",
      [volunteerId]
    );
    
    const volunteerDistrict = volunteerResult && volunteerResult[0] ? volunteerResult[0].district : null;
    
    // Get assigned donations in the volunteer's district (case insensitive) with coordinates
    const availableResult = await query(`
      SELECT d.*, u.fullname as donor_name, u.phone as donor_phone, n.ngo_name
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE LOWER(d.district) = LOWER(?) AND d.status = 'assigned' AND d.volunteer_id IS NULL
      ORDER BY 
        CASE d.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        d.created_at DESC
    `, [volunteerDistrict]);

    console.log("🐛 DEBUG - Available donations count:", availableResult[0]?.length || 0);
    console.log("🐛 DEBUG - Volunteer district:", volunteerDistrict);
    console.log("🐛 DEBUG - Volunteer data:", volunteerResult[0] && volunteerResult[0][0]);
    console.log("🐛 DEBUG - Available donations raw result:", JSON.stringify(availableResult));
    console.log("🐛 DEBUG - Available donations [0]:", availableResult[0]);
    console.log("🐛 DEBUG - Available donations [1]:", availableResult[1]);

    // Your assignments
    const myDonationsResult = await query(`
      SELECT d.*, u.fullname as donor_name, n.ngo_name
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE d.volunteer_id = ? 
        AND d.status IN ('assigned', 'picked_up', 'in_transit', 'delivered')
      ORDER BY 
        CASE d.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        d.created_at DESC
    `, [volunteerId]);

    res.json({
      volunteer: req.session.volunteer,
      availableDonations: availableResult[0] || [],
      myDonations: myDonationsResult[0] || []
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DEBUG ROUTE: Check volunteer data and query
router.get("/debug/volunteer-info", ensureVolunteerAuthenticated, async (req, res) => {
  try {
    console.log("👤 VOLUNTEER SESSION DATA:", req.session.volunteer);
    
    // Test the actual query
    const availableResult = await query(`
      SELECT d.*, u.fullname as donor_name 
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.status = 'pending'
      ORDER BY d.created_at DESC
    `);
    
    console.log("🔍 DONATIONS QUERY RESULTS:", availableResult[0]);
    
    res.json({
      volunteer: req.session.volunteer,
      availableDonationsCount: availableResult[0]?.length || 0,
      availableDonations: availableResult[0] || []
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Accept donation
router.post("/accept-donation/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    console.log("🔍 Accept donation called");
    console.log("🔍 Donation ID:", donationId);
    console.log("🔍 Volunteer ID:", volunteerId);
    console.log("🔍 Volunteer session:", req.session.volunteer);

    const volunteerName = req.session.volunteer.name || 
                         req.session.volunteer.fullname || 
                         req.session.volunteer.email;
    const volunteerPhone = req.session.volunteer.phone || '';

    console.log("🔍 Volunteer name:", volunteerName);
    console.log("🔍 Volunteer phone:", volunteerPhone);

    // Check if donation exists and is available
    const donationCheck = await query(
      "SELECT id, status, volunteer_id, district FROM donations WHERE id = ?",
      [donationId]
    );

    if (!donationCheck || donationCheck.length === 0) {
      console.log("❌ Donation not found");
      return res.json({ success: false, message: "Donation not found" });
    }

    const donation = donationCheck[0];
    console.log("🔍 Donation found:", donation);

    if (donation.volunteer_id !== null) {
      console.log("❌ Donation already assigned to volunteer:", donation.volunteer_id);
      return res.json({ success: false, message: "Donation already assigned to another volunteer" });
    }

    const updateResult = await query(
      "UPDATE donations SET volunteer_id = ?, volunteer_name = ?, volunteer_phone = ?, assigned_at = NOW() WHERE id = ? AND (volunteer_id IS NULL OR volunteer_id = '')",
      [volunteerId, volunteerName, volunteerPhone, donationId]
    );

    console.log("🔍 Update result:", updateResult);
    console.log("🔍 Rows affected:", updateResult.affectedRows);

    if (updateResult.affectedRows === 0) {
      console.log("❌ No rows updated - donation may already be assigned");
      return res.json({ success: false, message: "Donation is no longer available" });
    }
    
    // NEW: Create assignment record for monitoring (ADD-ON)
    try {
      const assignmentResult = await query(`
        INSERT INTO volunteer_assignments (donation_id, volunteer_id, status, accepted_at)
        VALUES (?, ?, 'accepted', NOW())
      `, [donationId, volunteerId]);
      
      const assignmentId = assignmentResult.insertId;
      
      // Update donation with assignment reference
      await query(`
        UPDATE donations SET assignment_id = ? WHERE id = ?
      `, [assignmentId, donationId]);
      
      console.log("✅ Assignment record created:", assignmentId);
    } catch (assignmentError) {
      console.error("⚠️ Assignment record creation failed (non-critical):", assignmentError);
    }
    
    console.log("✅ Donation accepted successfully");
    res.json({ success: true, message: "Donation accepted successfully" });
  } catch (err) {
    console.error("❌ Accept error:", err);
    res.json({ success: false, message: "Failed to accept donation" });
  }
});

// Mark donation as picked up
router.post("/volunteer/pickup/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    console.log("🔍 Pickup request received");
    console.log("🔍 Donation ID:", donationId);
    console.log("🔍 Volunteer ID:", volunteerId);
    console.log("🔍 Volunteer session:", req.session.volunteer);

    // Check if donation exists and is assigned to this volunteer
    const donationCheck = await query(
      "SELECT id, status, volunteer_id, volunteer_name FROM donations WHERE id = ?",
      [donationId]
    );

    if (!donationCheck || donationCheck.length === 0) {
      console.log("❌ Donation not found");
      return res.json({ success: false, message: "Donation not found" });
    }

    const donation = donationCheck[0];
    console.log("🔍 Donation found:", donation);

    if (donation.volunteer_id !== volunteerId) {
      console.log("❌ Donation not assigned to this volunteer");
      return res.json({ success: false, message: "Donation not assigned to you" });
    }

    if (donation.status !== 'assigned') {
      console.log("❌ Donation not in assigned status:", donation.status);
      return res.json({ success: false, message: `Donation is already ${donation.status}` });
    }

    const updateResult = await query(
      "UPDATE donations SET status = 'picked_up' WHERE id = ? AND volunteer_id = ?",
      [donationId, volunteerId]
    );

    console.log("🔍 Update result:", updateResult);
    console.log("🔍 Rows affected:", updateResult.affectedRows);

    if (updateResult.affectedRows === 0) {
      console.log("❌ No rows updated");
      return res.json({ success: false, message: "Failed to update donation status" });
    }

    console.log("✅ Donation marked as picked up successfully");
    res.json({ success: true, message: "Donation marked as picked up" });
  } catch (err) {
    console.error("❌ Pickup error:", err);
    res.json({ success: false, message: "Failed to update status" });
  }
});

// Mark donation as in transit
router.post("/volunteer/transit/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    await query(
      "UPDATE donations SET status = 'in_transit' WHERE id = ? AND volunteer_id = ?",
      [donationId, volunteerId]
    );

    res.json({ success: true, message: "Donation marked as in transit" });
  } catch (err) {
    console.error("Transit error:", err);
    res.json({ success: false, message: "Failed to update status" });
  }
});

// Mark donation as delivered
router.post("/volunteer/deliver/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    await query(
      "UPDATE donations SET status = 'delivered' WHERE id = ? AND volunteer_id = ?",
      [donationId, volunteerId]
    );

    // Update volunteer completed donations count
    await query(
      "UPDATE volunteers SET completed_donations = COALESCE(completed_donations, 0) + 1 WHERE id = ?",
      [volunteerId]
    );

    // NEW: Update trust score positively (ADD-ON)
    try {
      await trustScoreService.updateTrustScore(volunteerId, 'completed_delivery', +10);
      
      // Update assignment status
      await query(`
        UPDATE volunteer_assignments 
        SET status = 'completed', completed_at = NOW() 
        WHERE donation_id = ? AND volunteer_id = ?
      `, [donationId, volunteerId]);
      
      console.log("✅ Trust score updated for completed delivery");
    } catch (trustScoreError) {
      console.error("⚠️ Trust score update failed (non-critical):", trustScoreError);
    }

    res.json({ success: true, message: "Donation marked as delivered" });
  } catch (err) {
    console.error("Delivery error:", err);
    res.json({ success: false, message: "Failed to update status" });
  }
});

// Update donation status (legacy route)
router.post("/update-status/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const { status } = req.body;
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    await query(
      "UPDATE donations SET status = ? WHERE id = ? AND volunteer_id = ?",
      [status, donationId, volunteerId]
    );

    if (status === 'completed' || status === 'delivered') {
      await query(
        "UPDATE volunteers SET completed_donations = COALESCE(completed_donations, 0) + 1 WHERE id = ?",
        [volunteerId]
      );
    }

    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Status update error:", err);
    res.json({ success: false, message: "Failed to update status" });
  }
});

// Upload proof of delivery - FIXED: Remove updated_at
router.post("/volunteer/proof/:id", ensureVolunteerAuthenticated, upload.single("proof"), async (req, res) => {
  const donationId = req.params.id;
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const filePath = `/upload/${path.basename(req.file.path)}`;
  
  try {
    // FIXED: Remove updated_at column
    await query(
      "UPDATE donations SET proof_image = ?, status = 'delivered' WHERE id = ? AND volunteer_id = ?",
      [filePath, donationId, req.session.volunteer.id]
    );
    
    await query(
      "UPDATE volunteers SET completed_donations = COALESCE(completed_donations, 0) + 1 WHERE id = ?",
      [req.session.volunteer.id]
    );
    
    res.json({ success: true, file: filePath });
  } catch (err) {
    console.error("Proof upload error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get volunteer availability
router.get("/api/volunteer/availability", ensureVolunteerAuthenticated, async (req, res) => {
    const volunteerId = req.session.volunteer.id;
    
    try {
        const result = await query(
            'SELECT * FROM volunteer_availability WHERE volunteer_id = ? AND is_active = true ORDER BY day_of_week, start_time',
            [volunteerId]
        );
        
        res.json({ success: true, availability: result[0] || [] });
    } catch (err) {
        console.error('Error loading volunteer availability:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Save volunteer availability
router.post("/api/volunteer/availability", ensureVolunteerAuthenticated, async (req, res) => {
    const volunteerId = req.session.volunteer.id;
    const { availability, location } = req.body;
    
    try {
        if (location && location.latitude && location.longitude) {
            await query(
                'UPDATE volunteers SET latitude = ?, longitude = ? WHERE id = ?',
                [location.latitude, location.longitude, volunteerId]
            );
        }
        
        await query(
            'UPDATE volunteer_availability SET is_active = false WHERE volunteer_id = ?',
            [volunteerId]
        );
        
        for (const slot of availability) {
            await query(
                'INSERT INTO volunteer_availability (volunteer_id, day_of_week, start_time, end_time, latitude, longitude, max_radius_km, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
                [
                    volunteerId,
                    slot.day_of_week,
                    slot.start_time,
                    slot.end_time,
                    slot.latitude,
                    slot.longitude,
                    slot.max_radius_km || 10
                ]
            );
        }
        
        res.json({ success: true });
        
    } catch (err) {
        console.error('Error saving availability:', err);
        res.status(500).json({ success: false, message: 'Error saving availability' });
    }
});

// Check for auto-assignments
router.post("/api/volunteer/check-auto-assignments", ensureVolunteerAuthenticated, async (req, res) => {
    const volunteerId = req.session.volunteer.id;
    const currentDay = new Date().getDay();
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    try {
        const volunteerResult = await query(
            'SELECT latitude, longitude FROM volunteers WHERE id = ?',
            [volunteerId]
        );
        
        if (!volunteerResult[0] || !volunteerResult[0][0] || !volunteerResult[0][0].latitude) {
            return res.json({ success: true, assignments: [] });
        }
        
        const volunteer = volunteerResult[0][0];
        
        const searchQuery = `
            SELECT dr.*, 
                   (6371 * acos(cos(radians(?)) * cos(radians(COALESCE(dr.pickup_latitude, 19.0760))) * 
                    cos(radians(COALESCE(dr.pickup_longitude, 72.8777)) - radians(?)) + 
                    sin(radians(?)) * sin(radians(COALESCE(dr.pickup_latitude, 19.0760))))) AS distance_km
            FROM donation_requests dr
            WHERE dr.status = 'pending' 
            AND dr.volunteer_id IS NULL
            AND EXISTS (
                SELECT 1 FROM volunteer_availability va 
                WHERE va.volunteer_id = ? 
                AND va.day_of_week = ? 
                AND va.start_time <= ? 
                AND va.end_time >= ? 
                AND va.is_active = true
                AND (6371 * acos(cos(radians(COALESCE(va.latitude, ?))) * cos(radians(COALESCE(dr.pickup_latitude, 19.0760))) * 
                     cos(radians(COALESCE(dr.pickup_longitude, 72.8777)) - radians(COALESCE(va.longitude, ?))) + 
                     sin(radians(COALESCE(va.latitude, ?))) * sin(radians(COALESCE(dr.pickup_latitude, 19.0760))))) <= va.max_radius_km
            )
            ORDER BY 
                CASE WHEN dr.priority = 'urgent' THEN 1 
                     WHEN dr.priority = 'high' THEN 2 
                     ELSE 3 END,
                distance_km
            LIMIT 5
        `;
        
        const result = await query(searchQuery, [
            volunteer.latitude, 
            volunteer.longitude,
            volunteer.latitude,
            volunteerId, 
            currentDay, 
            currentTime,
            currentTime,
            volunteer.latitude,
            volunteer.longitude,
            volunteer.latitude
        ]);
        
        const eligibleRequests = result[0] ? result[0].filter(req => req.distance_km <= 25) : [];
        
        if (eligibleRequests.length === 0) {
            return res.json({ success: true, assignments: [] });
        }
        
        const bestRequest = eligibleRequests[0];
        
        await query(
            'UPDATE donation_requests SET volunteer_id = ?, status = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?',
            [volunteerId, 'assigned', bestRequest.id]
        );
        
        await query(
            'INSERT INTO volunteer_performance (volunteer_id, request_id, assigned_at, response_time_minutes) VALUES (?, ?, CURRENT_TIMESTAMP, 0)',
            [volunteerId, bestRequest.id]
        );
        
        res.json({ 
            success: true, 
            assignments: [{ 
                id: bestRequest.id, 
                title: bestRequest.title,
                priority: bestRequest.priority || 'normal',
                distance: Math.round(bestRequest.distance_km * 10) / 10
            }] 
        });
        
    } catch (err) {
        console.error('Error finding auto-assignments:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Dashboard data API for auto-refresh
router.get("/api/volunteer/dashboard-data", ensureVolunteerAuthenticated, async (req, res) => {
    try {
        const result = await query(
            'SELECT COUNT(*) as new_count FROM donations WHERE created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND status = \'pending\' AND city LIKE ?',
            [`%${req.session.volunteer.city || 'Pune'}%`]
        );
        
        const newRequests = result[0] && result[0][0] ? result[0][0].new_count > 0 : false;
        res.json({ newRequests });
    } catch (err) {
        console.log('Dashboard data error:', err);
        res.json({ newRequests: false });
    }
});

export default router;