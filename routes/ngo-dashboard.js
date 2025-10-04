import express from "express";
import { query } from "../db.js";
import { ensureNGOAuthenticated } from "../middleware/auth.js";
import aiDistributionService from "../services/aiDistributionService.js";
import ngoSpecializationService from "../services/ngoSpecializationService.js";

const router = express.Router();

// NGO Dashboard Main Page
router.get("/ngo-dashboard", ensureNGOAuthenticated, async (req, res) => {
  try {
    const ngoId = req.session.ngo.id;
    
    // Get NGO details
    const ngoResult = await query(
      "SELECT * FROM ngo_register WHERE id = ?",
      [ngoId]
    );
    
    const ngo = ngoResult[0] && ngoResult[0][0];
    
    // Get all donation requests in the NGO's city (for approval)
    const cityDonationsResult = await query(`
      SELECT d.*, u.fullname as donor_name, v.fullname as volunteer_name, v.phone as volunteer_phone
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      WHERE d.city = ? AND d.ngo_approval_status = 'pending'
      ORDER BY 
        CASE d.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        d.created_at DESC
    `, [ngo.city]);

    // Get donations assigned to this NGO
    const assignedDonationsResult = await query(`
      SELECT d.*, u.fullname as donor_name, v.fullname as volunteer_name, v.phone as volunteer_phone
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      WHERE d.ngo_id = ? AND d.ngo_approval_status = 'approved'
      ORDER BY 
        CASE 
          WHEN d.status = 'assigned' THEN 1
          WHEN d.status = 'picked_up' THEN 2
          WHEN d.status = 'in_transit' THEN 3
          WHEN d.status = 'delivered' THEN 4
          ELSE 5
        END,
        d.created_at DESC
    `, [ngoId]);
    
    // Get statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_donations,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'picked_up' THEN 1 END) as picked_up,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM donations 
      WHERE ngo_id = ?
    `, [ngoId]);
    
    const stats = statsResult[0] && statsResult[0][0] ? statsResult[0][0] : {};
    
    // Get AI distribution data
    const dailyLimits = await aiDistributionService.getNGODailyLimits(ngoId);
    const cityCoverage = await aiDistributionService.getCityCoverage(ngo.city);
    const loadBalancing = await aiDistributionService.getLoadBalancingRecommendations(ngo.city);
    
    // Get AI suggestions and specialization compatibility for each donation
    const donationsWithSuggestions = [];
    for (const donation of cityDonationsResult[0] || []) {
      const suggestions = await aiDistributionService.getDistributionSuggestions(donation.id);
      const canApprove = await aiDistributionService.canApproveRequest(ngoId, donation.id);
      
      // Check specialization compatibility
      const specializationCompatibility = ngoSpecializationService.canApproveDonation(
        ngo.ngo_type || 'multi_purpose', 
        ngo.can_accept_universal !== false, // Default to true if not set
        donation
      );
      
      // Combine AI and specialization checks
      const finalCanApprove = canApprove.canApprove && specializationCompatibility.canApprove;
      
      donationsWithSuggestions.push({
        ...donation,
        ai_suggestions: suggestions,
        can_approve: {
          ...canApprove,
          canApprove: finalCanApprove,
          specializationCompatibility: specializationCompatibility
        }
      });
    }
    
    res.render("ngo/dashboard", {
      currentPage: 'ngo-dashboard',
      ngo: ngo,
      cityDonations: donationsWithSuggestions,
      assignedDonations: assignedDonationsResult[0] || [],
      stats: stats,
      dailyLimits: dailyLimits,
      cityCoverage: cityCoverage,
      loadBalancing: loadBalancing
    });
    
  } catch (err) {
    console.error("NGO Dashboard error:", err);
    res.status(500).send("Server error");
  }
});

// API: Get NGO dashboard data for real-time updates
router.get("/api/ngo/dashboard-data", ensureNGOAuthenticated, async (req, res) => {
  try {
    const ngoId = req.session.ngo.id;
    
    const statsResult = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'picked_up' THEN 1 END) as picked_up,
        COUNT(CASE WHEN status = 'in_transit' THEN 1 END) as in_transit,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered
      FROM donations 
      WHERE ngo_id = ?
    `, [ngoId]);
    
    const stats = statsResult[0] && statsResult[0][0] ? statsResult[0][0] : {};
    
    res.json({ stats: stats });
    
  } catch (err) {
    console.error("NGO API error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API: Mark donation as received by NGO
router.post("/api/ngo/receive-donation/:id", ensureNGOAuthenticated, async (req, res) => {
  try {
    const donationId = req.params.id;
    const ngoId = req.session.ngo.id;
    
    await query(
      "UPDATE donations SET status = 'completed' WHERE id = ? AND ngo_id = ?",
      [donationId, ngoId]
    );
    
    res.json({ success: true, message: "Donation marked as received!" });
    
  } catch (err) {
    console.error("Receive donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// API: Approve donation request
router.post("/api/ngo/approve-donation/:id", ensureNGOAuthenticated, async (req, res) => {
  try {
    const donationId = req.params.id;
    const ngoId = req.session.ngo.id;
    
    // Check AI distribution limits first
    const canApprove = await aiDistributionService.canApproveRequest(ngoId, donationId);
    
    if (!canApprove.canApprove) {
      return res.status(400).json({ 
        success: false, 
        error: canApprove.reason,
        isLimitReached: !canApprove.isCritical
      });
    }
    
    // Get NGO details to verify city match
    const ngoResult = await query("SELECT city FROM ngo_register WHERE id = ?", [ngoId]);
    const ngo = ngoResult[0] && ngoResult[0][0];
    
    if (!ngo) {
      return res.status(404).json({ success: false, error: "NGO not found" });
    }
    
    // Check if donation is in same city and still pending
    const donationResult = await query(
      "SELECT city FROM donations WHERE id = ? AND ngo_approval_status = 'pending'",
      [donationId]
    );
    
    if (!donationResult[0] || donationResult[0].length === 0) {
      return res.status(404).json({ success: false, error: "Donation not found or already processed" });
    }
    
    const donation = donationResult[0][0];
    
    if (donation.city !== ngo.city) {
      return res.status(400).json({ success: false, error: "Donation is not in your city" });
    }
    
    // Approve the donation and assign to this NGO
    await query(
      "UPDATE donations SET ngo_id = ?, ngo_approval_status = 'approved', status = 'assigned', assigned_at = NOW() WHERE id = ?",
      [ngoId, donationId]
    );
    
    // Record the approval in AI distribution system
    await aiDistributionService.recordApproval(ngoId, donationId);
    
    res.json({ 
      success: true, 
      message: canApprove.isCritical 
        ? "Critical donation approved! (No limit applied)" 
        : `Donation approved! (${canApprove.remaining - 1} approvals remaining today)`,
      remaining: canApprove.remaining - 1,
      isCritical: canApprove.isCritical
    });
    
  } catch (err) {
    console.error("Approve donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// API: Reject donation request
router.post("/api/ngo/reject-donation/:id", ensureNGOAuthenticated, async (req, res) => {
  try {
    const donationId = req.params.id;
    const ngoId = req.session.ngo.id;
    
    // Get NGO details to verify city match
    const ngoResult = await query("SELECT city FROM ngo_register WHERE id = ?", [ngoId]);
    const ngo = ngoResult[0] && ngoResult[0][0];
    
    if (!ngo) {
      return res.status(404).json({ success: false, error: "NGO not found" });
    }
    
    // Check if donation is in same city and still pending
    const donationResult = await query(
      "SELECT city FROM donations WHERE id = ? AND ngo_approval_status = 'pending'",
      [donationId]
    );
    
    if (!donationResult[0] || donationResult[0].length === 0) {
      return res.status(404).json({ success: false, error: "Donation not found or already processed" });
    }
    
    const donation = donationResult[0][0];
    
    if (donation.city !== ngo.city) {
      return res.status(400).json({ success: false, error: "Donation is not in your city" });
    }
    
    // Reject the donation (keep it pending for other NGOs)
    await query(
      "UPDATE donations SET ngo_approval_status = 'rejected' WHERE id = ?",
      [donationId]
    );
    
    res.json({ success: true, message: "Donation rejected" });
    
  } catch (err) {
    console.error("Reject donation error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;