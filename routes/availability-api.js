// AVAILABILITY API ROUTES (ADD-ON ONLY)
// New API endpoints for availability validation without changing existing routes

import express from 'express';
import { query } from '../db.js';
import availabilityValidationService from '../services/availabilityValidationService.js';

const router = express.Router();

// Get volunteer availability status
router.get('/api/volunteer/availability-status', async (req, res) => {
  try {
    // Check if user is authenticated (using existing session)
    if (!req.session || !req.session.volunteer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const volunteerId = req.session.volunteer.id;
    const status = await availabilityValidationService.getAvailabilityStatus(volunteerId);
    
    res.json(status);
  } catch (error) {
    console.error('Error getting availability status:', error);
    res.status(500).json({ error: 'Failed to get availability status' });
  }
});

// Validate and fix availability before saving
router.post('/api/volunteer/validate-availability', async (req, res) => {
  try {
    if (!req.session || !req.session.volunteer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const volunteerId = req.session.volunteer.id;
    const validatedData = await availabilityValidationService.validateAndFixAvailability(volunteerId, req.body);
    
    res.json({
      success: true,
      validated_data: validatedData,
      needs_attention: validatedData.auto_fixed
    });
  } catch (error) {
    console.error('Error validating availability:', error);
    res.status(500).json({ error: 'Failed to validate availability' });
  }
});

// Fix existing volunteers with missing availability
router.post('/api/admin/fix-volunteer-availability', async (req, res) => {
  try {
    // Check if admin (using existing session)
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const fixedCount = await availabilityValidationService.fixExistingVolunteers();
    
    res.json({
      success: true,
      message: `Fixed ${fixedCount} volunteers with missing availability`,
      fixed_count: fixedCount
    });
  } catch (error) {
    console.error('Error fixing volunteer availability:', error);
    res.status(500).json({ error: 'Failed to fix volunteer availability' });
  }
});

// Get availability report for admin
router.get('/api/admin/availability-report', async (req, res) => {
  try {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const report = await query(`
      SELECT 
        COUNT(*) as total_volunteers,
        COUNT(CASE WHEN available_days IS NOT NULL AND JSON_LENGTH(available_days) > 0 THEN 1 END) as configured_volunteers,
        COUNT(CASE WHEN available_days IS NULL OR JSON_LENGTH(available_days) = 0 THEN 1 END) as unconfigured_volunteers,
        AVG(max_distance) as avg_travel_distance
      FROM volunteers
      WHERE status = 'active'
    `);

    const dayDistribution = await query(`
      SELECT 
        day_name,
        COUNT(*) as volunteer_count
      FROM (
        SELECT 
          CASE 
            WHEN JSON_EXTRACT(available_days, '$[0]') = 'monday' THEN 'Monday'
            WHEN JSON_EXTRACT(available_days, '$[1]') = 'tuesday' THEN 'Tuesday'
            WHEN JSON_EXTRACT(available_days, '$[2]') = 'wednesday' THEN 'Wednesday'
            WHEN JSON_EXTRACT(available_days, '$[3]') = 'thursday' THEN 'Thursday'
            WHEN JSON_EXTRACT(available_days, '$[4]') = 'friday' THEN 'Friday'
            WHEN JSON_EXTRACT(available_days, '$[5]') = 'saturday' THEN 'Saturday'
            WHEN JSON_EXTRACT(available_days, '$[6]') = 'sunday' THEN 'Sunday'
          END as day_name
        FROM volunteers 
        WHERE status = 'active' 
        AND available_days IS NOT NULL
        AND JSON_LENGTH(available_days) > 0
      ) days
      WHERE day_name IS NOT NULL
      GROUP BY day_name
      ORDER BY volunteer_count DESC
    `);

    const configurationRate = report[0].total_volunteers > 0 
      ? (report[0].configured_volunteers / report[0].total_volunteers * 100).toFixed(1)
      : 0;

    res.json({
      summary: report[0],
      day_distribution: dayDistribution,
      configuration_rate: configurationRate + '%'
    });
  } catch (error) {
    console.error('Error generating availability report:', error);
    res.status(500).json({ error: 'Failed to generate availability report' });
  }
});

export default router;
