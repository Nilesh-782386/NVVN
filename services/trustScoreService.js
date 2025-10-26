// TRUST SCORE SERVICE (ADD-ON ONLY)
// This service is completely separate from existing functionality

import { query } from '../db.js';

class TrustScoreService {
  constructor() {
    this.scoreRanges = {
      ELITE: { min: 90, max: 100, color: 'purple' },
      PREMIUM: { min: 75, max: 89, color: 'gold' },
      STANDARD: { min: 50, max: 74, color: 'blue' },
      NEW: { min: 30, max: 49, color: 'green' },
      RESTRICTED: { min: 0, max: 29, color: 'red' }
    };
  }

  // Get volunteer trust score from NEW table
  async getTrustScore(volunteerId) {
    try {
      const result = await query(
        'SELECT score, tier FROM volunteer_trust_scores WHERE volunteer_id = ?',
        [volunteerId]
      );

      if (result.length === 0) {
        // Initialize if first time
        await this.initializeTrustScore(volunteerId);
        return { score: 100, tier: 'NEW' };
      }

      return result[0];
    } catch (error) {
      console.error('Error getting trust score:', error);
      return { score: 100, tier: 'NEW' };
    }
  }

  // Initialize trust score for new volunteer
  async initializeTrustScore(volunteerId) {
    try {
      await query(
        'INSERT INTO volunteer_trust_scores (volunteer_id, score, tier) VALUES (?, ?, ?)',
        [volunteerId, 100, 'NEW']
      );
      
      await this.logActivity(volunteerId, 'initialized', 0, 'Trust score initialized');
    } catch (error) {
      console.error('Error initializing trust score:', error);
    }
  }

  // Update trust score (NEW FUNCTION - doesn't touch existing code)
  async updateTrustScore(volunteerId, activityType, change) {
    try {
      // Get current score from NEW table
      const current = await query(
        'SELECT score FROM volunteer_trust_scores WHERE volunteer_id = ?',
        [volunteerId]
      );

      let currentScore = 100;
      if (current.length > 0) {
        currentScore = current[0].score;
      } else {
        // Initialize if first time
        await this.initializeTrustScore(volunteerId);
      }

      const newScore = Math.max(0, Math.min(100, currentScore + change));
      const newTier = this.getTierFromScore(newScore);

      // Update only NEW table
      await query(
        'UPDATE volunteer_trust_scores SET score = ?, tier = ?, last_updated = NOW() WHERE volunteer_id = ?',
        [newScore, newTier, volunteerId]
      );

      // Log activity in NEW table
      await this.logActivity(volunteerId, activityType, change, `Trust score updated: ${change > 0 ? '+' : ''}${change}`);

      return { score: newScore, tier: newTier };
    } catch (error) {
      console.error('Error updating trust score:', error);
      return { score: 100, tier: 'NEW' };
    }
  }

  // Get tier from score
  getTierFromScore(score) {
    for (const [tier, range] of Object.entries(this.scoreRanges)) {
      if (score >= range.min && score <= range.max) {
        return tier;
      }
    }
    return 'RESTRICTED';
  }

  // Get tier info for display
  getTierInfo(score) {
    const tier = this.getTierFromScore(score);
    const range = this.scoreRanges[tier];
    return {
      name: tier,
      color: range.color,
      min: range.min,
      max: range.max
    };
  }

  // Log activity in NEW table
  async logActivity(volunteerId, activityType, scoreChange, description) {
    try {
      await query(
        'INSERT INTO trust_score_activities (volunteer_id, activity_type, score_change, description) VALUES (?, ?, ?, ?)',
        [volunteerId, activityType, scoreChange, description]
      );
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Get trust score activities/history
  async getTrustScoreActivities(volunteerId, limit = 10) {
    try {
      const result = await query(
        'SELECT * FROM trust_score_activities WHERE volunteer_id = ? ORDER BY created_at DESC LIMIT ?',
        [volunteerId, parseInt(limit)]
      );
      return result;
    } catch (error) {
      console.error('Error getting trust score activities:', error);
      return [];
    }
  }

  // Get all volunteers with trust scores
  async getAllVolunteerScores() {
    try {
      const result = await query(`
        SELECT 
          v.id,
          v.name,
          v.email,
          v.district,
          ts.score,
          ts.tier,
          ts.last_updated
        FROM volunteers v
        LEFT JOIN volunteer_trust_scores ts ON v.id = ts.volunteer_id
        WHERE v.status = 'active'
        ORDER BY ts.score DESC, v.name ASC
      `);
      return result;
    } catch (error) {
      console.error('Error getting all volunteer scores:', error);
      return [];
    }
  }

  // Initialize trust scores for all volunteers who don't have them
  async initializeAllVolunteers() {
    try {
      console.log('🔄 Initializing trust scores for all volunteers...');
      
      // Get volunteers without trust scores
      const volunteersWithoutScores = await query(`
        SELECT v.id, v.name 
        FROM volunteers v 
        LEFT JOIN volunteer_trust_scores ts ON v.id = ts.volunteer_id 
        WHERE ts.volunteer_id IS NULL AND v.status = 'active'
      `);
      
      console.log(`Found ${volunteersWithoutScores.length} volunteers without trust scores`);
      
      for (const volunteer of volunteersWithoutScores) {
        await this.initializeTrustScore(volunteer.id);
        console.log(`✅ Initialized trust score for ${volunteer.name} (ID: ${volunteer.id})`);
      }
      
      console.log('🎉 All volunteer trust scores initialized successfully!');
      return volunteersWithoutScores.length;
    } catch (error) {
      console.error('Error initializing all volunteers:', error);
      return 0;
    }
  }
}

export default new TrustScoreService();
