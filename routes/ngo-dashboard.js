import express from "express";
import { query, pool } from "../db.js";
import { ensureNGOAuthenticated } from "../middleware/auth.js";
import aiDistributionService from "../services/aiDistributionService.js";
import ngoSpecializationService from "../services/ngoSpecializationService.js";

const router = express.Router();

// Routes are working correctly - test routes removed

// NGO Dashboard Main Page
router.get("/ngo-dashboard", ensureNGOAuthenticated, async (req, res) => {
  try {
    console.log("🔍 NGO Dashboard route called");
    console.log("🔍 Session NGO:", req.session.ngo);
    
    const ngoId = req.session.ngo.id;
    console.log("🔍 NGO ID from session:", ngoId);
    
    // Get NGO details
    const ngoResult = await query(
      "SELECT * FROM ngo_register WHERE id = ?",
      [ngoId]
    );
    
    const ngo = ngoResult && ngoResult[0];
    console.log("🔍 NGO details:", ngo ? `${ngo.ngo_name} (${ngo.district})` : 'null');
    
    // Get all donation requests in the NGO's district/city (for approval) - Case insensitive
    console.log("🔍 Querying donations for district:", ngo.district, "and city:", ngo.city);
    
    // Match donations by both district and city (case insensitive) - Enhanced for all scenarios
    const matchValue = ngo.district || ngo.city;
    const cityDonationsResult = await query(`
      SELECT d.*, u.fullname as donor_name, v.fullname as volunteer_name, v.phone as volunteer_phone
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      WHERE (
        LOWER(d.district) = LOWER(?) OR 
        LOWER(d.city) = LOWER(?) OR
        (d.district IS NULL AND LOWER(d.city) = LOWER(?)) OR
        (d.city IS NULL AND LOWER(d.district) = LOWER(?))
      ) 
        AND d.ngo_approval_status = 'pending'
      ORDER BY 
        CASE d.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        d.created_at DESC
    `, [matchValue, matchValue, matchValue, matchValue]);
    
    console.log("🔍 Raw city donations result:", cityDonationsResult?.length || 0);

    // Get donations assigned to this NGO
    const assignedDonationsResult = await query(`
      SELECT d.*, u.fullname as donor_name, v.fullname as volunteer_name, v.phone as volunteer_phone, va.id as assignment_id
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN volunteers v ON d.volunteer_id = v.id
      LEFT JOIN volunteer_assignments va ON d.id = va.donation_id AND va.status = 'accepted'
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
    
    const stats = statsResult && statsResult[0] ? statsResult[0] : {};
    
    // Get AI distribution data
    const dailyLimits = await aiDistributionService.getNGODailyLimits(ngoId);
    const cityCoverage = await aiDistributionService.getCityCoverage(ngo.city);
    const loadBalancing = await aiDistributionService.getLoadBalancingRecommendations(ngo.city);
    
    // Get AI suggestions and specialization compatibility for each donation
    console.log("🔍 NGO Dashboard - Processing donations:", cityDonationsResult?.length || 0);
    const donationsWithSuggestions = [];
    
    for (const donation of cityDonationsResult || []) {
      console.log(`🔍 Processing donation ID: ${donation.id}`);
      
      try {
        const suggestions = await aiDistributionService.getDistributionSuggestions(donation.id);
        console.log(`✅ AI suggestions for donation ${donation.id}:`, suggestions);
        
        const canApprove = await aiDistributionService.canApproveRequest(ngoId, donation.id);
        console.log(`✅ AI canApprove for donation ${donation.id}:`, canApprove);
        
        // Check specialization compatibility
        const specializationCompatibility = ngoSpecializationService.canApproveDonation(
          ngo.ngo_type || 'multi_purpose', 
          ngo.can_accept_universal !== false, // Default to true if not set
          donation
        );
        console.log(`✅ Specialization compatibility for donation ${donation.id}:`, specializationCompatibility);
        
        // Combine AI and specialization checks
        // If specialization allows approval, allow it regardless of AI limits
        // AI limits are just recommendations, not hard restrictions
        const finalCanApprove = specializationCompatibility.canApprove;
        
        donationsWithSuggestions.push({
          ...donation,
          ai_suggestions: suggestions,
          can_approve: {
            ...canApprove,
            canApprove: finalCanApprove,
            specializationCompatibility: specializationCompatibility
          }
        });
        
        console.log(`✅ Successfully processed donation ${donation.id}`);
      } catch (error) {
        console.error(`❌ Error processing donation ${donation.id}:`, error);
        // Still add the donation even if AI services fail
        donationsWithSuggestions.push({
          ...donation,
          ai_suggestions: [],
          can_approve: {
            canApprove: true, // Default to true if services fail
            reason: 'AI services unavailable',
            specializationCompatibility: {
              canApprove: true,
              reason: 'Default approval due to service error'
            }
          }
        });
      }
    }
    
    console.log("🔍 Final donations with suggestions:", donationsWithSuggestions.length);
    
    // Debug: Log what's being passed to the template
    console.log("🔍 Template data:");
    console.log("  - ngo:", ngo ? `${ngo.ngo_name} (${ngo.district})` : 'null');
    console.log("  - cityDonations count:", donationsWithSuggestions.length);
    console.log("  - assignedDonations count:", assignedDonationsResult?.length || 0);
    
    res.render("ngo/dashboard", {
      currentPage: 'ngo-dashboard',
      ngo: ngo,
      cityDonations: donationsWithSuggestions,
      assignedDonations: assignedDonationsResult || [],
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
    
    const stats = statsResult && statsResult[0] ? statsResult[0] : {};
    
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
  let transaction = null;
  
  try {
    console.log("=== APPROVAL API CALLED ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request params:", req.params);
    console.log("Session:", req.session);
    console.log("NGO Session:", req.session.ngo);
    
    // Validate session
    if (!req.session || !req.session.ngo || !req.session.ngo.id) {
      console.log("❌ Invalid session - no NGO data");
      return res.status(401).json({ 
        success: false, 
        error: "Session expired. Please log in again.",
        type: "session_error"
      });
    }
    
    const donationId = req.params.id;
    const ngoId = req.session.ngo.id;
    
    console.log("Donation ID:", donationId);
    console.log("NGO ID:", ngoId);
    
    // Validate input parameters
    if (!donationId || isNaN(parseInt(donationId))) {
      console.log("❌ Invalid donation ID");
      return res.status(400).json({ 
        success: false, 
        error: "Invalid donation ID",
        type: "validation_error"
      });
    }
    
    if (!ngoId || isNaN(parseInt(ngoId))) {
      console.log("❌ Invalid NGO ID");
      return res.status(400).json({ 
        success: false, 
        error: "Invalid NGO ID",
        type: "validation_error"
      });
    }
    
    // Start database transaction
    const connection = await pool.getConnection();
    transaction = connection;
    await connection.beginTransaction();
    
    // Pre-approval validation checks
    console.log("--- Pre-approval validation ---");
    
    // 1. Check if NGO exists and is active
    const ngoResult = await connection.execute(
      "SELECT id, ngo_name, district, status, verification_status FROM ngo_register WHERE id = ?",
      [ngoId]
    );
    const ngo = ngoResult[0] && ngoResult[0][0];
    
    if (!ngo) {
      console.log("❌ NGO not found");
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: "NGO not found in database",
        type: "not_found_error"
      });
    }
    
    console.log("🔍 NGO Status Check:", {
      id: ngo.id,
      name: ngo.ngo_name,
      status: ngo.status,
      verification_status: ngo.verification_status
    });
    
    // Check both status fields for compatibility
    const isVerified = ngo.status === 'verified' || ngo.verification_status === 'verified';
    
    if (!isVerified) {
      console.log("❌ NGO not verified - Status:", ngo.status, "Verification:", ngo.verification_status);
      await connection.rollback();
      return res.status(403).json({ 
        success: false, 
        error: "NGO must be verified to approve donations",
        type: "permission_error"
      });
    }
    
    console.log("✅ NGO validation passed:", ngo.ngo_name, "- Status:", ngo.status, "Verification:", ngo.verification_status);
    
    // 2. Check if donation exists and is in pending status
    const donationResult = await connection.execute(
      "SELECT id, district, ngo_approval_status, status, user_id FROM donations WHERE id = ?",
      [donationId]
    );
    const donation = donationResult[0] && donationResult[0][0];
    
    if (!donation) {
      console.log("❌ Donation not found");
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: "Donation not found",
        type: "not_found_error"
      });
    }
    
    if (donation.ngo_approval_status !== 'pending') {
      console.log("❌ Donation already processed");
      await connection.rollback();
      return res.status(409).json({ 
        success: false, 
        error: `Donation already ${donation.ngo_approval_status}`,
        type: "conflict_error"
      });
    }
    
    console.log("✅ Donation validation passed");
    
    // 3. Check district match (case insensitive)
    if (donation.district?.toLowerCase() !== ngo.district?.toLowerCase()) {
      console.log("❌ District mismatch");
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Donation is in ${donation.district} but your NGO is in ${ngo.district}`,
        type: "validation_error"
      });
    }
    
    console.log("✅ District match confirmed");
    
    // 4. Check AI distribution limits
    console.log("--- AI Distribution Check ---");
    const canApprove = await aiDistributionService.canApproveRequest(ngoId, donationId);
    console.log("AI Service result:", canApprove);
    
    if (!canApprove.canApprove) {
      console.log("❌ AI Service rejected approval");
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: canApprove.reason,
        type: "limit_error",
        isLimitReached: !canApprove.isCritical
      });
    }
    
    console.log("✅ AI distribution check passed");
    
    // All validations passed - proceed with approval
    console.log("--- Processing approval ---");
    
    // Update donation status
    const updateResult = await connection.execute(
      "UPDATE donations SET ngo_id = ?, ngo_approval_status = 'approved', status = 'assigned', volunteer_id = NULL, assigned_at = NOW() WHERE id = ?",
      [ngoId, donationId]
    );
    
    if (updateResult[0].affectedRows === 0) {
      console.log("❌ No rows updated");
      await connection.rollback();
      return res.status(500).json({ 
        success: false, 
        error: "Failed to update donation status",
        type: "database_error"
      });
    }
    
    console.log("✅ Donation updated successfully");
    
    // Record approval in AI distribution system
    try {
      const recordResult = await aiDistributionService.recordApproval(ngoId, donationId);
      console.log("✅ AI approval recorded:", recordResult);
    } catch (aiError) {
      console.log("⚠️ AI recording failed, but continuing:", aiError.message);
      // Don't fail the entire transaction for AI recording issues
    }
    
    // Commit transaction
    await connection.commit();
    console.log("✅ Transaction committed successfully");
    
    // Prepare success response
    const response = { 
      success: true, 
      message: canApprove.isCritical 
        ? "Critical donation approved! (No limit applied)" 
        : `Donation approved! (${canApprove.remaining - 1} approvals remaining today)`,
      remaining: canApprove.remaining - 1,
      isCritical: canApprove.isCritical,
      donationId: donationId,
      ngoId: ngoId
    };
    
    console.log("✅ Final response:", response);
    res.json(response);
    
  } catch (err) {
    console.error("❌ Approve donation error:", err);
    
    // Rollback transaction if it exists
    if (transaction) {
      try {
        await transaction.rollback();
        console.log("✅ Transaction rolled back");
      } catch (rollbackError) {
        console.error("❌ Rollback failed:", rollbackError);
      }
    }
    
    // Return specific error based on error type
    let errorMessage = "Server error";
    let errorType = "server_error";
    
    if (err.code === 'ER_DUP_ENTRY') {
      errorMessage = "Duplicate entry - donation may already be processed";
      errorType = "duplicate_error";
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = "Invalid reference - NGO or donation not found";
      errorType = "reference_error";
    } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      errorMessage = "Cannot process - donation is referenced by other records";
      errorType = "constraint_error";
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      type: errorType,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    // Release connection
    if (transaction) {
      transaction.release();
    }
  }
});

// API: Reject donation request
router.post("/api/ngo/reject-donation/:id", ensureNGOAuthenticated, async (req, res) => {
  try {
    const donationId = req.params.id;
    const ngoId = req.session.ngo.id;
    
    // Get NGO details to verify city match
    const ngoResult = await query("SELECT city FROM ngo_register WHERE id = ?", [ngoId]);
    const ngo = ngoResult && ngoResult[0];
    
    if (!ngo) {
      return res.status(404).json({ success: false, error: "NGO not found" });
    }
    
    // Check if donation is in same city and still pending
    const donationResult = await query(
      "SELECT city FROM donations WHERE id = ? AND ngo_approval_status = 'pending'",
      [donationId]
    );
    
    if (!donationResult || donationResult.length === 0) {
      return res.status(404).json({ success: false, error: "Donation not found or already processed" });
    }
    
    const donation = donationResult[0];
    
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