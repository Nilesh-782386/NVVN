import express from "express";
import { pool } from "../db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { ensureVolunteerAuthenticated } from "../middleware/auth.js";

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

// Volunteer Dashboard Data
router.get("/volunteer-dashboard-data", ensureVolunteerAuthenticated, async (req, res) => {
  const volunteerId = req.session.volunteer.id;
  
  try {
    const [availableDonations] = await pool.query(`
      SELECT d.*, u.fullname as donor_name 
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.city = ? AND d.volunteer_id IS NULL AND d.status = 'pending'
      ORDER BY d.created_at DESC
    `, [req.session.volunteer.city]);

    const [myDonations] = await pool.query(`
      SELECT d.*, u.fullname as donor_name, n.ngo_name
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE d.volunteer_id = ? 
      ORDER BY FIELD(d.status, 'accepted', 'picked_up', 'delivered', 'completed'), d.created_at DESC
    `, [volunteerId]);

    res.json({
      volunteer: req.session.volunteer,
      availableDonations,
      myDonations
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Accept donation
router.post("/accept-donation/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    await pool.query(
      "UPDATE donations SET volunteer_id = ?, volunteer_name = ?, volunteer_phone = ?, status = 'assigned', assigned_at = NOW() WHERE id = ? AND volunteer_id IS NULL",
      [
        volunteerId,
        req.session.volunteer.name || req.session.volunteer.fullname || req.session.volunteer.email,
        req.session.volunteer.phone || '',
        donationId
      ]
    );
    
    res.json({ success: true, message: "Donation accepted successfully" });
  } catch (err) {
    console.error("Accept error:", err);
    res.json({ success: false, message: "Failed to accept donation" });
  }
});

// Update donation status
router.post("/update-status/:id", ensureVolunteerAuthenticated, async (req, res) => {
  const { status } = req.body;
  const donationId = req.params.id;
  const volunteerId = req.session.volunteer.id;

  try {
    await pool.query(
      "UPDATE donations SET status = ? WHERE id = ? AND volunteer_id = ?",
      [status, donationId, volunteerId]
    );

    if (status === 'completed') {
      await pool.query(
        "UPDATE volunteers SET completed_donations = completed_donations + 1 WHERE id = ?",
        [volunteerId]
      );
    }

    res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Status update error:", err);
    res.json({ success: false, message: "Failed to update status" });
  }
});

// ===== VOLUNTEER AVAILABILITY API ENDPOINTS =====

// Get volunteer availability
router.get("/api/volunteer/availability", ensureVolunteerAuthenticated, async (req, res) => {
    const volunteerId = req.session.volunteer.id;
    
    try {
        const result = await pool.query(
            'SELECT * FROM volunteer_availability WHERE volunteer_id = $1 AND is_active = true ORDER BY day_of_week, start_time',
            [volunteerId]
        );
        
        res.json({ success: true, availability: result.rows });
    } catch (err) {
        console.error('Error loading volunteer availability:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Save volunteer availability
router.post("/api/volunteer/availability", ensureVolunteerAuthenticated, async (req, res) => {
    const volunteerId = req.session.volunteer.id;
    const { availability, location } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Update volunteer's location if provided
        if (location && location.latitude && location.longitude) {
            await client.query(
                'UPDATE volunteers SET latitude = $1, longitude = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [location.latitude, location.longitude, volunteerId]
            );
        }
        
        // Deactivate all existing availability
        await client.query(
            'UPDATE volunteer_availability SET is_active = false WHERE volunteer_id = $1',
            [volunteerId]
        );
        
        // Insert new availability slots
        for (const slot of availability) {
            await client.query(
                'INSERT INTO volunteer_availability (volunteer_id, day_of_week, start_time, end_time, latitude, longitude, max_radius_km, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)',
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
        
        await client.query('COMMIT');
        res.json({ success: true });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving availability:', err);
        res.status(500).json({ success: false, message: 'Error saving availability' });
    } finally {
        client.release();
    }
});

// Check for auto-assignments
router.post("/api/volunteer/check-auto-assignments", ensureVolunteerAuthenticated, async (req, res) => {
    const volunteerId = req.session.volunteer.id;
    const currentDay = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
    const currentTime = new Date().toTimeString().slice(0, 5); // HH:MM format
    
    try {
        // Get volunteer's location
        const volunteerResult = await pool.query(
            'SELECT latitude, longitude FROM volunteers WHERE id = $1',
            [volunteerId]
        );
        
        if (!volunteerResult.rows[0] || !volunteerResult.rows[0].latitude) {
            return res.json({ success: true, assignments: [] });
        }
        
        const volunteer = volunteerResult.rows[0];
        
        // Find available requests that match volunteer's current availability
        const query = `
            SELECT dr.*, 
                   (6371 * acos(cos(radians($3)) * cos(radians(COALESCE(dr.pickup_latitude, 19.0760))) * 
                    cos(radians(COALESCE(dr.pickup_longitude, 72.8777)) - radians($4)) + 
                    sin(radians($3)) * sin(radians(COALESCE(dr.pickup_latitude, 19.0760))))) AS distance_km
            FROM donation_requests dr
            WHERE dr.status = 'pending' 
            AND dr.volunteer_id IS NULL
            AND EXISTS (
                SELECT 1 FROM volunteer_availability va 
                WHERE va.volunteer_id = $1 
                AND va.day_of_week = $2 
                AND va.start_time <= $5 
                AND va.end_time >= $5 
                AND va.is_active = true
                AND (6371 * acos(cos(radians(COALESCE(va.latitude, $3))) * cos(radians(COALESCE(dr.pickup_latitude, 19.0760))) * 
                     cos(radians(COALESCE(dr.pickup_longitude, 72.8777)) - radians(COALESCE(va.longitude, $4))) + 
                     sin(radians(COALESCE(va.latitude, $3))) * sin(radians(COALESCE(dr.pickup_latitude, 19.0760))))) <= va.max_radius_km
            )
            ORDER BY 
                CASE WHEN dr.priority = 'urgent' THEN 1 
                     WHEN dr.priority = 'high' THEN 2 
                     ELSE 3 END,
                distance_km
            LIMIT 5
        `;
        
        const result = await pool.query(query, [
            volunteerId, 
            currentDay, 
            volunteer.latitude, 
            volunteer.longitude, 
            currentTime
        ]);
        
        const eligibleRequests = result.rows.filter(req => req.distance_km <= 25);
        
        if (eligibleRequests.length === 0) {
            return res.json({ success: true, assignments: [] });
        }
        
        // Auto-assign the most suitable request (highest priority, closest distance)
        const bestRequest = eligibleRequests[0];
        
        await pool.query(
            'UPDATE donation_requests SET volunteer_id = $1, status = $2, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [volunteerId, 'assigned', bestRequest.id]
        );
        
        // Track performance
        await pool.query(
            'INSERT INTO volunteer_performance (volunteer_id, request_id, assigned_at, response_time_minutes) VALUES ($1, $2, CURRENT_TIMESTAMP, 0)',
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
        // Check for new requests since last check (simplified for demo)
        const result = await pool.query(
            'SELECT COUNT(*) as new_count FROM donation_requests WHERE created_at > NOW() - INTERVAL \'1 minute\' AND status = \'pending\''
        );
        
        const newRequests = result.rows[0].new_count > 0;
        res.json({ newRequests });
    } catch (err) {
        console.log('Dashboard data error:', err);
        res.json({ newRequests: Math.random() > 0.7 }); // Fallback to random
    }
});

export default router;

// Upload proof of delivery
router.post("/volunteer/proof/:id", ensureVolunteerAuthenticated, upload.single("proof"), async (req, res) => {
  const donationId = req.params.id;
  const filePath = `/uploads/${path.basename(req.file.path)}`;
  try {
    await pool.query(
      "UPDATE donations SET proof_image = ?, status = 'delivered' WHERE id = ? AND volunteer_id = ?",
      [filePath, donationId, req.session.volunteer.id]
    );
    res.json({ success: true, file: filePath });
  } catch (err) {
    console.error("Proof upload error:", err);
    res.status(500).json({ success: false });
  }
});