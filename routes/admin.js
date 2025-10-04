import express from "express";
import { query } from "../db.js";
import fs from "fs";
import path from "path";

const router = express.Router();

console.log("✅ Admin router loaded successfully");

// Debug middleware to log all admin routes
router.use((req, res, next) => {
  console.log(`🔍 Admin route accessed: ${req.method} ${req.path}`);
  next();
});

// Admin Login Page
router.get("/login", (req, res) => {
  console.log("🔍 Admin login page route accessed");
  res.render("login_register/admin_login");
});

// Admin Login Processing
router.post("/login", async (req, res) => {
  console.log("🔍 Admin login route accessed");
  console.log("Request body:", req.body);
  const { email, password } = req.body;
  
  try {
    const admins = await query(
      "SELECT * FROM system_admins WHERE email = ?", 
      [email]
    );
    
    console.log("Admin query result:", admins[0]);
    
    if (admins[0].length > 0) {
      const admin = admins[0][0];
      console.log("Admin found:", admin.email);
      const bcrypt = await import('bcrypt');
      const validPassword = await bcrypt.compare(password, admin.password);
      console.log("Password valid:", validPassword);
      
      if (validPassword) {
        req.session.admin = admin;
        console.log("✅ Admin session created, redirecting to dashboard");
        res.redirect("/admin/dashboard");
      } else {
        console.log("❌ Invalid password");
        res.redirect("/admin/login?error=invalid");
      }
    } else {
      console.log("❌ No admin found with email:", email);
      res.redirect("/admin/login?error=invalid");
    }
  } catch (error) {
    console.error("Admin login error:", error);
    res.redirect("/admin/login?error=server");
  }
});

// Admin Dashboard
router.get("/dashboard", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  
  try {
    // Get comprehensive analytics
    const donationAnalytics = await query(`
      SELECT 
        COUNT(*) as total_donations,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_donations,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_donations,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_donations,
        COUNT(DISTINCT city) as cities_covered
      FROM donations
    `);

    const ngoAnalytics = await query(`
      SELECT 
        COUNT(*) as total_ngos,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_ngos,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as pending_ngos,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_ngos
      FROM ngo_register
    `);

    const volunteerAnalytics = await query(`
      SELECT 
        COUNT(*) as total_volunteers,
        SUM(CASE WHEN availability = 'available' THEN 1 ELSE 0 END) as available_volunteers,
        SUM(CASE WHEN availability = 'busy' THEN 1 ELSE 0 END) as busy_volunteers
      FROM volunteers
    `);

    const userAnalytics = await query(`
      SELECT COUNT(*) as total_users FROM users
    `);

    // Get recent activities
    const recentDonations = await query(`
      SELECT d.*, u.fullname as donor_name, v.fullname as volunteer_name, n.ngo_name
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      ORDER BY d.created_at DESC
      LIMIT 5
    `);

    const recentNGOs = await query(`
      SELECT * FROM ngo_register 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    res.render("admin/dashboard", {
      admin: req.session.admin,
      analytics: {
        donations: donationAnalytics[0][0] || { 
          total_donations: 0, 
          completed_donations: 0, 
          pending_donations: 0,
          assigned_donations: 0,
          cities_covered: 0
        },
        ngos: ngoAnalytics[0][0] || {
          total_ngos: 0,
          verified_ngos: 0,
          pending_ngos: 0,
          suspended_ngos: 0
        },
        volunteers: volunteerAnalytics[0][0] || {
          total_volunteers: 0,
          available_volunteers: 0,
          busy_volunteers: 0
        },
        users: userAnalytics[0][0] || {
          total_users: 0
        }
      },
      recentDonations: recentDonations[0] || [],
      recentNGOs: recentNGOs[0] || []
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).send("Server Error");
  }
});

// NGO Management Routes
router.get("/ngos", async (req, res) => {
  console.log("🔍 Admin NGOs route accessed");
  console.log("Session admin:", req.session.admin);
  console.log("Session ID:", req.sessionID);
  
  if (!req.session.admin) {
    console.log("❌ No admin session found, redirecting to login");
    return res.redirect("/admin/login");
  }
  
  console.log("✅ Admin session found, proceeding with NGO management");

  try {
    const { search, status, city } = req.query;
    let whereClause = "1=1";
    const params = [];

    if (search) {
      whereClause += " AND (ngo_name LIKE ? OR email LIKE ? OR registration_number LIKE ? OR city LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    if (city) {
      whereClause += " AND city = ?";
      params.push(city);
    }

    const ngos = await query(`
      SELECT * FROM ngo_register 
      WHERE ${whereClause}
      ORDER BY created_at DESC
    `, params);

    // Get stats
    const totalResult = await query("SELECT COUNT(*) as total FROM ngo_register");
    const appliedResult = await query("SELECT COUNT(*) as applied FROM ngo_register WHERE status = 'applied'");
    const verifiedResult = await query("SELECT COUNT(*) as verified FROM ngo_register WHERE status = 'verified'");
    const suspendedResult = await query("SELECT COUNT(*) as suspended FROM ngo_register WHERE status = 'suspended'");

    console.log("📊 NGO data prepared for rendering:");
    console.log("Total NGOs:", totalResult[0][0].total);
    console.log("Applied NGOs:", appliedResult[0][0].applied);
    console.log("Verified NGOs:", verifiedResult[0][0].verified);
    console.log("Suspended NGOs:", suspendedResult[0][0].suspended);
    console.log("NGOs array length:", ngos[0] ? ngos[0].length : 0);
    console.log("NGOs data:", ngos[0]);
    
    res.render("admin/VerifyNGOs", {
      ngos: ngos[0] || [],
      total: totalResult[0][0].total,
      applied: appliedResult[0][0].applied,
      verified: verifiedResult[0][0].verified,
      suspended: suspendedResult[0][0].suspended,
      filterSearch: search || '',
      filterStatus: status || '',
      filterCity: city || ''
    });
  } catch (error) {
    console.error("NGO management error:", error);
    res.status(500).send("Server Error");
  }
});

// Update NGO status
router.post("/ngos/:id/status", async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    await query(
      "UPDATE ngo_register SET status = ? WHERE id = ?",
      [status, id]
    );

    res.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Serve NGO certificates
router.get("/ngos/:id/certificate", async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;
    const result = await query(
      "SELECT registration_certificate FROM ngo_register WHERE id = ?",
      [id]
    );

    if (result[0] && result[0].length > 0 && result[0][0].registration_certificate) {
      const filename = result[0][0].registration_certificate;
      const filePath = path.join(process.cwd(), "upload", filename);
      
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).send("Certificate not found");
      }
    } else {
      res.status(404).send("Certificate not found");
    }
  } catch (error) {
    console.error("Certificate serving error:", error);
    res.status(500).send("Server Error");
  }
});

// View All Donations
router.get("/donations", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  try {
    // Get filter parameters
    const filterSearch = req.query.search || '';
    const filterStatus = req.query.status || '';
    const filterCity = req.query.city || '';

    // Build WHERE clause for filtering
    let whereClause = "1=1";
    const params = [];

    if (filterSearch) {
      whereClause += " AND (u.fullname LIKE ? OR d.city LIKE ? OR d.fname LIKE ? OR d.lname LIKE ? OR d.email LIKE ?)";
      const searchTerm = `%${filterSearch}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filterStatus) {
      whereClause += " AND d.status = ?";
      params.push(filterStatus);
    }

    if (filterCity) {
      whereClause += " AND d.city = ?";
      params.push(filterCity);
    }

    const donations = await query(`
      SELECT d.*, u.fullname as donor_name, v.fullname as volunteer_name, n.ngo_name
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
    `, params);

    // Calculate statistics
    const totalRequests = donations[0].length;
    const activeCount = donations[0].filter(d => d.status === 'pending' || d.status === 'assigned').length;
    const completedCount = donations[0].filter(d => d.status === 'completed').length;

    res.render("admin/AllDonations", {
      donations: donations[0] || [],
      totalRequests,
      activeCount,
      completedCount,
      filterSearch,
      filterStatus,
      filterCity,
      currentPage: 1,
      totalPages: 1
    });
  } catch (error) {
    console.error("Donations view error:", error);
    res.status(500).send("Server Error");
  }
});

// View Volunteers
router.get("/volunteers", async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  try {
    const volunteers = await query(`
      SELECT v.*, n.ngo_name
      FROM volunteers v
      LEFT JOIN ngo_register n ON v.ngo_id = n.id
      ORDER BY v.created_at DESC
    `);

    res.render("volunteer/list", {
      volunteers: volunteers[0] || []
    });
  } catch (error) {
    console.error("Volunteers view error:", error);
    res.status(500).send("Server Error");
  }
});

// Admin Logout
router.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

// Complete donation
router.post("/donations/:id/complete", async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const { id } = req.params;
    await query(
      "UPDATE donations SET status = 'completed' WHERE id = ?",
      [id]
    );

    res.json({ success: true, message: "Donation marked as completed" });
  } catch (error) {
    console.error("Complete donation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Cancel donation
router.post("/donations/:id/cancel", async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const { id } = req.params;
    await query(
      "UPDATE donations SET status = 'cancelled' WHERE id = ?",
      [id]
    );

    res.json({ success: true, message: "Donation cancelled" });
  } catch (error) {
    console.error("Cancel donation error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;