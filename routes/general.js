import express from "express";
import { query } from "../db.js";
import { ensureUserAuthenticated, ensureNGOAuthenticated, ensureVolunteerAuthenticated, ensureAdminAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Safe session data function
const getSafeSession = (req) => ({
  user: req.session.user || null,
  ngo: req.session.ngo || null,
  volunteer: req.session.volunteer || null
});

router.get("/", (req, res) => {
  res.render("index", getSafeSession(req));
});

router.get("/rewards", ensureUserAuthenticated, (req, res) => {
  res.render("rewards", getSafeSession(req));
});

router.get("/ngo-login", (req, res) => {
  res.render("login_register/ngo_login", getSafeSession(req));
});

router.get("/user-login", (req, res) => {
  res.render("login_register/user_login", getSafeSession(req));
});

router.get("/volunteer-login", (req, res) => {
  res.render("login_register/volunteer_login", getSafeSession(req));
});

router.get("/register-user", (req, res) => {
  res.render("login_register/user-register", getSafeSession(req));
});

router.get("/volunteer-register", (req, res) => {
  res.render("login_register/volunteer_register", getSafeSession(req));
});

router.get("/ngo-user", (req, res) => {
  res.render("login_register/user-register", getSafeSession(req));
});

router.get("/complete-registration", (req, res) => {
  res.render("index", getSafeSession(req));
});

router.get("/ngo-register", (req, res) => {
  res.render("login_register/ngo-register", getSafeSession(req));
});

router.get("/donate2", ensureUserAuthenticated, (req, res) => {
  res.render("donate/donate2", getSafeSession(req));
});

router.get("/contact", (req, res) => {
  res.render("contact", getSafeSession(req));
});

router.get("/about", (req, res) => {
  res.render("about", getSafeSession(req));
});

router.get("/user", ensureUserAuthenticated, (req, res) => {
  res.render("account", getSafeSession(req));
});

router.get("/donation-history", ensureUserAuthenticated, (req, res) => {
  res.render("donation-history", getSafeSession(req));
});

// Volunteer Management Routes
router.get("/volunteer-register", (req, res) => {
  res.render("volunteer/register");
});

router.get("/admin/volunteers", ensureAdminAuthenticated, (req, res) => {
  res.render("volunteer/list");
});

router.get("/system-status", (req, res) => {
  res.render("system-status");
});

router.get("/donate", ensureUserAuthenticated, (req, res) => {
  res.render("donate/donate1", getSafeSession(req));
});

router.get("/login", (req, res) => {
  res.render("login_register/user_login", getSafeSession(req));
});

router.get("/submit-info", ensureUserAuthenticated, (req, res) => {
  const { donationId } = req.query;
  res.render("donate/donate2", { 
    donationId,
    ...getSafeSession(req)
  });
});

router.get("/donated", ensureUserAuthenticated, (req, res) => {
  const { donationId } = req.query;
  res.render("donate/donate3", { 
    donationId,
    ...getSafeSession(req)
  });
});

router.get("/volunteer-dashboard", ensureVolunteerAuthenticated, async (req, res) => {
  try {
    console.log("🚨 VOLUNTEER DASHBOARD ROUTE HIT!");
    const volunteerId = req.session.volunteer.id;
    console.log("🔍 VOLUNTEER DASHBOARD - Volunteer ID:", volunteerId);
    
    // Get volunteer's district first
    const volunteerResult = await query(
      "SELECT district FROM volunteers WHERE id = ?",
      [volunteerId]
    );
    
    const volunteerDistrict = volunteerResult && volunteerResult[0] ? volunteerResult[0].district : null;
    console.log("🔍 VOLUNTEER DASHBOARD - Volunteer District:", volunteerDistrict);
    
    // Get assigned donations in the volunteer's district (case insensitive)
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

    console.log("🔍 VOLUNTEER DASHBOARD - Available donations count:", availableResult?.length || 0);
    console.log("🔍 VOLUNTEER DASHBOARD - Available donations:", availableResult);

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

    console.log("🔍 VOLUNTEER DASHBOARD - My donations count:", myDonationsResult?.length || 0);
    console.log("🔍 VOLUNTEER DASHBOARD - Rendering with data:", {
      availableCount: availableResult?.length || 0,
      myCount: myDonationsResult?.length || 0
    });

    res.render("dashboards/volunteer-dashboard", {
      currentPage: 'volunteer-dashboard',
      volunteer: req.session.volunteer,
      availableDonations: availableResult || [],
      myDonations: myDonationsResult || []
    });
  } catch (err) {
    console.error("Volunteer Dashboard error:", err);
    res.status(500).send("Server error");
  }
});

// ✅ FIXED: Contact query - removed result handling since we don't need it
router.post("/query", async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await query(
      "INSERT INTO queries (name, email, query) VALUES (?, ?, ?)",
      [name, email, message]
    );
    res.redirect("/");
  } catch (err) {
    console.error("Error saving contact query:", err);
    res.status(500).send("Internal Server Error");
  }
});

// NGO Dashboard route moved to ngo-dashboard.js to avoid duplication

// NGO Approval Routes - MOVED TO ngo-dashboard.js to avoid duplication

// NGO rejection route moved to ngo-dashboard.js to avoid duplication

// All NGO routes moved to ngo-dashboard.js to avoid duplication

// API: Get all volunteers
router.get("/api/volunteers", ensureAdminAuthenticated, async (req, res) => {
  try {
    const [volunteers] = await query(`
      SELECT v.*, n.ngo_name
      FROM volunteers v
      LEFT JOIN ngo_register n ON v.ngo_id = n.id
      ORDER BY v.created_at DESC
    `);
    
    res.json({ 
      success: true, 
      volunteers: volunteers[0] || [] 
    });
  } catch (error) {
    console.error("Volunteers API error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load volunteers" 
    });
  }
});

// API: Get specific volunteer details
router.get("/api/volunteers/:id", ensureAdminAuthenticated, async (req, res) => {
  try {
    const volunteerId = req.params.id;
    
    const [result] = await query(`
      SELECT v.*, n.ngo_name
      FROM volunteers v
      LEFT JOIN ngo_register n ON v.ngo_id = n.id
      WHERE v.id = ?
    `, [volunteerId]);
    
    if (result && result.length > 0) {
      res.json({ 
        success: true, 
        volunteer: result[0] 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: "Volunteer not found" 
      });
    }
  } catch (error) {
    console.error("Volunteer details error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load volunteer details" 
    });
  }
});

// API: System status and metrics
router.get("/api/system/status", async (req, res) => {
  try {
    // Get system metrics
    const [usersResult] = await query('SELECT COUNT(*) as count FROM users');
    const [donationsResult] = await query('SELECT COUNT(*) as count FROM donations');
    const [volunteersResult] = await query('SELECT COUNT(*) as count FROM volunteers WHERE status = "active"');
    const [ngosResult] = await query('SELECT COUNT(*) as count FROM ngo_register WHERE status = "verified"');
    
    const metrics = {
      users: usersResult[0] && usersResult[0][0] ? usersResult[0][0].count : 0,
      donations: donationsResult[0] && donationsResult[0][0] ? donationsResult[0][0].count : 0,
      volunteers: volunteersResult[0] && volunteersResult[0][0] ? volunteersResult[0][0].count : 0,
      ngos: ngosResult[0] && ngosResult[0][0] ? ngosResult[0][0].count : 0
    };
    
    // Get recent activity
    const [recentDonations] = await query(`
      SELECT 'New donation created' as activity, created_at 
      FROM donations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    const recentActivity = recentDonations[0] && Array.isArray(recentDonations[0]) ? recentDonations[0].map(d => 
      `${d.activity} - ${new Date(d.created_at).toLocaleString()}`
    ) : [];
    
    res.json({
      success: true,
      metrics: metrics,
      recentActivity: recentActivity
    });
  } catch (error) {
    console.error("System status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load system status"
    });
  }
});

export default router;