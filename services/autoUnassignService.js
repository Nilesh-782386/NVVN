// AUTO-UNASSIGN SERVICE (ADD-ON ONLY)
// This service runs independently and doesn't modify existing functionality

import { query } from '../db.js';
import trustScoreService from './trustScoreService.js';

class AutoUnassignService {
  constructor() {
    this.checkInterval = 30 * 60 * 1000; // 30 minutes
    this.unassignThreshold = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    this.isRunning = false;
  }

  // Start the monitoring service
  start() {
    if (this.isRunning) {
      console.log('Auto-unassign service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting auto-unassign service...');
    
    // Run immediately on start
    this.checkAssignments();
    
    // Then run every 30 minutes
    this.intervalId = setInterval(() => {
      this.checkAssignments();
    }, this.checkInterval);
  }

  // Stop the monitoring service
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Auto-unassign service stopped');
  }

  // Check for stuck assignments
  async checkAssignments() {
    try {
      console.log('🔍 Checking for stuck assignments...');
      
      // Query assignments that are 'accepted' but not 'started' for more than 4 hours
      const stuckAssignments = await query(`
        SELECT 
          va.*,
          d.district,
          v.name as volunteer_name,
          v.email as volunteer_email
        FROM volunteer_assignments va
        JOIN donations d ON va.donation_id = d.id
        JOIN volunteers v ON va.volunteer_id = v.id
        WHERE va.status = 'accepted' 
          AND va.started_at IS NULL 
          AND va.accepted_at < DATE_SUB(NOW(), INTERVAL 4 HOUR)
          AND va.auto_unassigned = FALSE
      `);

      console.log(`Found ${stuckAssignments.length} stuck assignments`);

      for (const assignment of stuckAssignments) {
        await this.handleStuckAssignment(assignment);
      }

    } catch (error) {
      console.error('❌ Error checking assignments:', error);
    }
  }

  // Handle a stuck assignment
  async handleStuckAssignment(assignment) {
    try {
      console.log(`🔄 Handling stuck assignment ${assignment.id} for volunteer ${assignment.volunteer_name}`);

      // Mark as auto-unassigned
      await query(`
        UPDATE volunteer_assignments 
        SET auto_unassigned = TRUE, 
            status = 'cancelled',
            cancelled_reason = 'auto_unassigned_4hr'
        WHERE id = ?
      `, [assignment.id]);

      // Update trust score negatively
      await trustScoreService.updateTrustScore(
        assignment.volunteer_id, 
        'no_show', 
        -15
      );

      // Reset donation status to available for reassignment
      await query(`
        UPDATE donations 
        SET volunteer_id = NULL, 
            volunteer_name = NULL, 
            volunteer_phone = NULL,
            auto_unassigned = TRUE,
            cancelled_reason = 'volunteer_no_show_4hr'
        WHERE id = ?
      `, [assignment.donation_id]);

      // Try to reassign to another volunteer
      await this.reassignDonation(assignment.donation_id, assignment.district);

      console.log(`✅ Assignment ${assignment.id} auto-unassigned and trust score updated`);

    } catch (error) {
      console.error(`❌ Error handling stuck assignment ${assignment.id}:`, error);
    }
  }

  // Reassign donation to another volunteer using EXISTING system
  async reassignDonation(donationId, district) {
    try {
      console.log(`🔄 Reassigning donation ${donationId} in district ${district}`);

      // Find available volunteers in the same district using EXISTING logic
      const availableVolunteers = await query(`
        SELECT v.*, ts.score, ts.tier
        FROM volunteers v
        LEFT JOIN volunteer_trust_scores ts ON v.id = ts.volunteer_id
        WHERE v.status = 'active' 
          AND LOWER(v.district) = LOWER(?)
          AND v.id NOT IN (
            SELECT DISTINCT volunteer_id 
            FROM volunteer_assignments 
            WHERE status IN ('accepted', 'started') 
              AND auto_unassigned = FALSE
          )
        ORDER BY COALESCE(ts.score, 100) DESC, v.created_at ASC
        LIMIT 5
      `, [district]);

      if (availableVolunteers.length === 0) {
        console.log(`⚠️ No available volunteers found for reassignment in ${district}`);
        return false;
      }

      // Select volunteer with highest trust score
      const selectedVolunteer = availableVolunteers[0];
      console.log(`👤 Selected volunteer ${selectedVolunteer.name} (score: ${selectedVolunteer.score || 100})`);

      // Create new assignment using EXISTING system
      const assignmentResult = await query(`
        INSERT INTO volunteer_assignments (donation_id, volunteer_id, status, accepted_at)
        VALUES (?, ?, 'accepted', NOW())
      `, [donationId, selectedVolunteer.id]);

      const assignmentId = assignmentResult.insertId;

      // Update donation with new volunteer info
      await query(`
        UPDATE donations 
        SET volunteer_id = ?, 
            volunteer_name = ?, 
            volunteer_phone = ?,
            assignment_id = ?,
            auto_unassigned = FALSE,
            cancelled_reason = NULL
        WHERE id = ?
      `, [
        selectedVolunteer.id,
        selectedVolunteer.name,
        selectedVolunteer.phone || '',
        assignmentId,
        donationId
      ]);

      // Log reassignment activity
      await trustScoreService.logActivity(
        selectedVolunteer.id,
        'reassignment',
        0,
        `Donation reassigned after previous volunteer no-show`
      );

      console.log(`✅ Donation ${donationId} reassigned to volunteer ${selectedVolunteer.name}`);
      return true;

    } catch (error) {
      console.error(`❌ Error reassigning donation ${donationId}:`, error);
      return false;
    }
  }

  // Get stuck assignments for monitoring
  async getStuckAssignments() {
    try {
      const result = await query(`
        SELECT 
          va.*,
          d.district,
          v.name as volunteer_name,
          v.email as volunteer_email,
          TIMESTAMPDIFF(HOUR, va.accepted_at, NOW()) as hours_stuck
        FROM volunteer_assignments va
        JOIN donations d ON va.donation_id = d.id
        JOIN volunteers v ON va.volunteer_id = v.id
        WHERE va.status = 'accepted' 
          AND va.started_at IS NULL 
          AND va.auto_unassigned = FALSE
        ORDER BY va.accepted_at ASC
      `);
      return result;
    } catch (error) {
      console.error('Error getting stuck assignments:', error);
      return [];
    }
  }

  // Get auto-unassign statistics
  async getStatistics() {
    try {
      const stats = await query(`
        SELECT 
          COUNT(*) as total_assignments,
          COUNT(CASE WHEN status = 'accepted' AND started_at IS NULL THEN 1 END) as pending_start,
          COUNT(CASE WHEN auto_unassigned = TRUE THEN 1 END) as auto_unassigned_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
        FROM volunteer_assignments
      `);
      return stats[0];
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {};
    }
  }
}

export default new AutoUnassignService();
