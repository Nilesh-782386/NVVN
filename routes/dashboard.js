import express from "express";
import { query } from "../db.js";
import { ensureUserAuthenticated, ensureNGOAuthenticated, ensureVolunteerAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// NGO Dashboard
router.get("/dashboard/ngo", ensureNGOAuthenticated, async (req, res) => {
  try {
    const ngoId = req.session.ngo?.id || req.session.user?.id;
    
    // Get pending donations
    const pendingResult = await query(
      "SELECT * FROM donations WHERE status = 'pending' ORDER BY created_at DESC"
    );
    
    // Get confirmed donations (assigned or picked up)
    const confirmedResult = await query(
      "SELECT * FROM donations WHERE status IN ('assigned', 'picked_up') ORDER BY assigned_at DESC"
    );
    
    // Get completed donations
    const completedResult = await query(
      "SELECT * FROM donations WHERE status = 'delivered' OR status = 'completed' ORDER BY updated_at DESC"
    );
    
    // Get assigned volunteers (unique volunteers with active donations)
    const volunteersResult = await query(`
      SELECT DISTINCT volunteer_name, volunteer_phone, 
             COUNT(*) as active_donations,
             MIN(city) as city
      FROM donations 
      WHERE volunteer_name IS NOT NULL 
        AND status IN ('assigned', 'picked_up')
      GROUP BY volunteer_name, volunteer_phone
    `);
    
    res.render("dashboards/ngo-dashboard", {
      currentPage: 'ngo-dashboard',
      ngo: req.session.ngo || req.session.user,
      pendingDonations: pendingResult[0] || [],
      confirmedDonations: confirmedResult[0] || [],
      completedDonations: completedResult[0] || [],
      assignedVolunteers: volunteersResult[0] || []
    });
  } catch (err) {
    console.error("NGO Dashboard error:", err);
    res.status(500).send("Server error");
  }
});

// Volunteer Dashboard
router.get("/dashboard/volunteer", ensureVolunteerAuthenticated, async (req, res) => {
  try {
    const volunteerId = req.session.volunteer.id;
    const volunteerCity = req.session.volunteer.city;
    
    // Get available donations in volunteer's city
    const availableResult = await query(`
      SELECT d.*, u.fullname as donor_name 
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      WHERE d.city = ? AND d.volunteer_id IS NULL AND d.status = 'pending'
      ORDER BY d.created_at DESC
    `, [volunteerCity]);
    
    // Get volunteer's assigned donations
    const myDonationsResult = await query(`
      SELECT d.*, u.fullname as donor_name, n.ngo_name
      FROM donations d 
      LEFT JOIN users u ON d.user_id = u.id 
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE d.volunteer_id = ? 
      ORDER BY CASE 
        WHEN d.status = 'assigned' THEN 1
        WHEN d.status = 'picked_up' THEN 2
        WHEN d.status = 'delivered' THEN 3
        WHEN d.status = 'completed' THEN 4
        ELSE 5
      END, d.created_at DESC
    `, [volunteerId]);
    
    res.render("dashboards/volunteer-dashboard", {
      currentPage: 'volunteer-dashboard',
      volunteer: req.session.volunteer,
      availableDonations: availableResult[0] || [],
      myDonations: myDonationsResult[0] || []
    });
  } catch (err) {
    console.error("Volunteer Dashboard error:", err);
    res.status(500).send("Server error");
  }
});

// Donor Dashboard
router.get("/dashboard/donor", ensureUserAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get donor's donation history
    const donationsResult = await query(`
      SELECT d.*, v.fullname as volunteer_name, v.phone as volunteer_phone, n.ngo_name
      FROM donations d 
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN ngo_register n ON d.ngo_id = n.id
      WHERE d.user_id = ? 
      ORDER BY d.created_at DESC
    `, [userId]);
    
    // Get donation statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_donations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'picked_up' THEN 1 END) as picked_up,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed
      FROM donations 
      WHERE user_id = ?
    `, [userId]);
    
    const stats = statsResult[0] && statsResult[0][0] ? statsResult[0][0] : {};
    
    res.render("dashboards/donor-dashboard", {
      currentPage: 'donor-dashboard',
      user: req.session.user,
      donations: donationsResult[0] || [],
      stats: stats
    });
  } catch (err) {
    console.error("Donor Dashboard error:", err);
    res.status(500).send("Server error");
  }
});

// API endpoints for real-time updates
router.get("/api/ngo/dashboard-data", ensureNGOAuthenticated, async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('assigned', 'picked_up') THEN 1 END) as confirmed,
        COUNT(DISTINCT volunteer_name) as volunteers,
        COUNT(CASE WHEN status IN ('delivered', 'completed') THEN 1 END) as completed
      FROM donations
    `);
    
    const statsData = stats[0] && stats[0][0] ? stats[0][0] : {};
    res.json({ stats: statsData });
  } catch (err) {
    console.error("Dashboard API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API endpoint to get NGO locations for map
router.get("/api/ngo-locations", async (req, res) => {
  try {
    const result = await query(`
      SELECT id, ngo_name, city, state, latitude, longitude, verification_status
      FROM ngos 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND verification_status = 'verified'
    `);
    
    res.json({ ngos: result[0] || [] });
  } catch (err) {
    console.error("NGO locations API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API endpoint to get volunteer-NGO routes for active donations
router.get("/api/volunteer-routes", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        d.id as donation_id,
        d.status,
        v.fullname as volunteer_name,
        v.latitude as volunteer_lat,
        v.longitude as volunteer_lng,
        n.ngo_name,
        n.latitude as ngo_lat,
        n.longitude as ngo_lng
      FROM donations d
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN ngos n ON d.ngo_id = n.id
      WHERE d.status IN ('assigned', 'picked_up') 
        AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
        AND n.latitude IS NOT NULL AND n.longitude IS NOT NULL
    `);
    
    res.json({ routes: result[0] || [] });
  } catch (err) {
    console.error("Volunteer routes API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API endpoint for NGO analytics data
router.get("/api/ngo/analytics-data", ensureNGOAuthenticated, async (req, res) => {
  try {
    // Get status distribution data
    const statusResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'picked_up' THEN 1 END) as picked_up,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM donations
    `);

    // Get monthly trends data (last 6 months)
    const monthlyResult = await query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-01') as month,
        COUNT(*) as total_donations,
        COUNT(CASE WHEN status IN ('delivered', 'completed') THEN 1 END) as completed
      FROM donations
      WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
      ORDER BY month
    `);

    // Get volunteer distribution by city
    const volunteerResult = await query(`
      SELECT 
        COALESCE(city, 'Unknown') as city,
        COUNT(DISTINCT volunteer_name) as volunteers
      FROM donations 
      WHERE volunteer_name IS NOT NULL
      GROUP BY city
      ORDER BY volunteers DESC
      LIMIT 5
    `);

    // Get items donated distribution
    const itemsResult = await query(`
      SELECT 
        COALESCE(SUM(books), 0) as books,
        COALESCE(SUM(clothes), 0) as clothes,
        COALESCE(SUM(toys), 0) as toys,
        COALESCE(SUM(grains), 0) as grains,
        COALESCE(SUM(footwear), 0) as footwear,
        COALESCE(SUM(school_supplies), 0) as school_supplies
      FROM donations
    `);

    // Format data for frontend
    const statusData = statusResult[0] && statusResult[0][0] ? statusResult[0][0] : {};
    
    // Format monthly data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRows = monthlyResult[0] || [];
    const monthlyData = {
      labels: monthlyRows.map(row => monthNames[new Date(row.month).getMonth()]),
      donations: monthlyRows.map(row => parseInt(row.total_donations)),
      completed: monthlyRows.map(row => parseInt(row.completed))
    };

    // Format volunteer data
    const volunteerRows = volunteerResult[0] || [];
    const volunteerData = {
      labels: volunteerRows.map(row => row.city),
      volunteers: volunteerRows.map(row => parseInt(row.volunteers))
    };

    // Format items data
    const itemsRow = itemsResult[0] && itemsResult[0][0] ? itemsResult[0][0] : {};
    const itemsData = {
      labels: ['Books', 'Clothes', 'Toys', 'Grains', 'Footwear', 'School Supplies'],
      items: [
        parseInt(itemsRow.books || 0),
        parseInt(itemsRow.clothes || 0),
        parseInt(itemsRow.toys || 0),
        parseInt(itemsRow.grains || 0),
        parseInt(itemsRow.footwear || 0),
        parseInt(itemsRow.school_supplies || 0)
      ]
    };

    res.json({
      statusData,
      monthlyData,
      volunteerData,
      itemsData
    });
  } catch (err) {
    console.error("NGO analytics API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark donation as completed
router.post("/ngo/complete-donation/:id", ensureNGOAuthenticated, async (req, res) => {
  try {
    const donationId = req.params.id;
    
    await query(
      "UPDATE donations SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [donationId]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Complete donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;