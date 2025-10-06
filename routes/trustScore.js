// TRUST SCORE ROUTES (ADD-ON ONLY)
// These routes are completely separate from existing functionality

import express from 'express';
import trustScoreService from '../services/trustScoreService.js';
import autoUnassignService from '../services/autoUnassignService.js';
import { ensureVolunteerAuthenticated, ensureAdminAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Trust Score Dashboard Page
router.get('/trust-score-dashboard', ensureVolunteerAuthenticated, (req, res) => {
  res.render('dashboards/trust-score-dashboard', {
    volunteer: req.session.volunteer,
    currentPage: 'trust-score-dashboard'
  });
});

// Get volunteer's own trust score
router.get('/api/volunteer/trust-score', ensureVolunteerAuthenticated, async (req, res) => {
  try {
    const volunteerId = req.session.volunteer.id;
    const scoreData = await trustScoreService.getTrustScore(volunteerId);
    const tierInfo = trustScoreService.getTierInfo(scoreData.score);
    
    res.json({
      success: true,
      data: {
        score: scoreData.score,
        tier: scoreData.tier,
        tierInfo: tierInfo
      }
    });
  } catch (error) {
    console.error('Error getting trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust score'
    });
  }
});

// Get volunteer's trust score activities/history
router.get('/api/volunteer/trust-score/activities', ensureVolunteerAuthenticated, async (req, res) => {
  try {
    const volunteerId = req.session.volunteer.id;
    const limit = parseInt(req.query.limit) || 10;
    const activities = await trustScoreService.getTrustScoreActivities(volunteerId, limit);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error getting trust score activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust score activities'
    });
  }
});

// Admin: Get all volunteer trust scores
router.get('/api/admin/trust-scores', ensureAdminAuthenticated, async (req, res) => {
  try {
    const scores = await trustScoreService.getAllVolunteerScores();
    
    res.json({
      success: true,
      data: scores
    });
  } catch (error) {
    console.error('Error getting all trust scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trust scores'
    });
  }
});

// Admin: Get auto-unassign statistics
router.get('/api/admin/auto-unassign/stats', ensureAdminAuthenticated, async (req, res) => {
  try {
    const stats = await autoUnassignService.getStatistics();
    const stuckAssignments = await autoUnassignService.getStuckAssignments();
    
    res.json({
      success: true,
      data: {
        statistics: stats,
        stuckAssignments: stuckAssignments
      }
    });
  } catch (error) {
    console.error('Error getting auto-unassign stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get auto-unassign statistics'
    });
  }
});

// Admin: Manually trigger stuck assignment check
router.post('/api/admin/auto-unassign/check', ensureAdminAuthenticated, async (req, res) => {
  try {
    await autoUnassignService.checkAssignments();
    
    res.json({
      success: true,
      message: 'Stuck assignment check completed'
    });
  } catch (error) {
    console.error('Error triggering stuck assignment check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger stuck assignment check'
    });
  }
});

// Admin: Start/stop auto-unassign service
router.post('/api/admin/auto-unassign/start', ensureAdminAuthenticated, async (req, res) => {
  try {
    autoUnassignService.start();
    
    res.json({
      success: true,
      message: 'Auto-unassign service started'
    });
  } catch (error) {
    console.error('Error starting auto-unassign service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start auto-unassign service'
    });
  }
});

router.post('/api/admin/auto-unassign/stop', ensureAdminAuthenticated, async (req, res) => {
  try {
    autoUnassignService.stop();
    
    res.json({
      success: true,
      message: 'Auto-unassign service stopped'
    });
  } catch (error) {
    console.error('Error stopping auto-unassign service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop auto-unassign service'
    });
  }
});

export default router;
