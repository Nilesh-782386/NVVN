// DISTANCE API ROUTES (ADD-ON ONLY)
// New API endpoints for distance calculations without changing existing routes

import express from 'express';
import { query } from '../db.js';
import distanceCalculationService from '../services/distanceCalculationService.js';

const router = express.Router();

// Get volunteer's saved location
router.get('/api/volunteer/my-location', async (req, res) => {
  try {
    // Check if user is authenticated (using existing session)
    if (!req.session || !req.session.volunteer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const volunteerId = req.session.volunteer.id;
    
    const result = await query(
      'SELECT location, preferred_max_distance FROM volunteers WHERE id = ?',
      [volunteerId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }
    
    const volunteer = result[0];
    const location = volunteer.location ? JSON.parse(volunteer.location) : null;
    
    res.json({ 
      location: location,
      preferred_max_distance: volunteer.preferred_max_distance || 15,
      success: true 
    });
  } catch (error) {
    console.error('Error getting volunteer location:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Calculate distance between two points
router.post('/api/distance/calculate', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, transportMode = 'car' } = req.body;
    
    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    // Calculate straight-line distance
    const straightDistance = distanceCalculationService.calculateDistance(
      startLat, startLng, endLat, endLng
    );
    
    // Estimate route distance
    const routeDistance = distanceCalculationService.estimateRouteDistance(straightDistance);
    
    // Calculate travel time
    const travelTime = distanceCalculationService.estimateTravelTime(routeDistance, transportMode);
    
    // Calculate fuel cost
    const fuelCost = distanceCalculationService.estimateFuelCost(routeDistance);
    
    // Get distance category
    const category = distanceCalculationService.getDistanceCategory(routeDistance);
    
    res.json({
      success: true,
      straight_distance: parseFloat(straightDistance.toFixed(1)),
      route_distance: parseFloat(routeDistance.toFixed(1)),
      travel_time: travelTime,
      fuel_cost: fuelCost,
      category: category,
      transport_mode: transportMode
    });
    
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
});

// Batch distance calculation for multiple donations
router.post('/api/distance/batch-calculate', async (req, res) => {
  try {
    const { volunteerLocation, donations } = req.body;
    
    if (!volunteerLocation || !donations || !Array.isArray(donations)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    const results = [];
    
    for (const donation of donations) {
      if (donation.latitude && donation.longitude) {
        const straightDistance = distanceCalculationService.calculateDistance(
          volunteerLocation.lat,
          volunteerLocation.lng,
          donation.latitude,
          donation.longitude
        );
        
        const routeDistance = distanceCalculationService.estimateRouteDistance(straightDistance);
        const category = distanceCalculationService.getDistanceCategory(routeDistance);
        
        results.push({
          donation_id: donation.id,
          straight_distance: parseFloat(straightDistance.toFixed(1)),
          route_distance: parseFloat(routeDistance.toFixed(1)),
          category: category,
          within_range: routeDistance <= (donation.max_distance || 15)
        });
      }
    }
    
    // Sort by distance (closest first)
    results.sort((a, b) => a.route_distance - b.route_distance);
    
    res.json({ 
      success: true, 
      results: results,
      volunteer_location: volunteerLocation
    });
    
  } catch (error) {
    console.error('Batch distance calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate batch distances' });
  }
});

// Update volunteer's preferred max distance
router.post('/api/volunteer/update-preferred-distance', async (req, res) => {
  try {
    if (!req.session || !req.session.volunteer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { maxDistance } = req.body;
    const volunteerId = req.session.volunteer.id;
    
    if (!maxDistance || maxDistance < 1 || maxDistance > 100) {
      return res.status(400).json({ error: 'Invalid distance range (1-100 km)' });
    }
    
    await query(
      'UPDATE volunteers SET preferred_max_distance = ? WHERE id = ?',
      [maxDistance, volunteerId]
    );
    
    res.json({ 
      success: true, 
      message: 'Preferred distance updated successfully',
      max_distance: maxDistance
    });
    
  } catch (error) {
    console.error('Error updating preferred distance:', error);
    res.status(500).json({ error: 'Failed to update preferred distance' });
  }
});

// Get distance statistics for admin
router.get('/api/admin/distance-stats', async (req, res) => {
  try {
    if (!req.session || !req.session.admin) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    const stats = await query(`
      SELECT 
        COUNT(*) as total_assignments,
        AVG(accepted_distance) as avg_accepted_distance,
        MIN(accepted_distance) as min_distance,
        MAX(accepted_distance) as max_distance,
        COUNT(CASE WHEN accepted_distance > 20 THEN 1 END) as long_distance_count
      FROM assignment_metrics 
      WHERE accepted_distance IS NOT NULL
    `);

    const volunteerStats = await query(`
      SELECT 
        AVG(preferred_max_distance) as avg_preferred_distance,
        COUNT(CASE WHEN preferred_max_distance > 20 THEN 1 END) as high_range_volunteers
      FROM volunteers 
      WHERE status = 'active'
    `);

    res.json({
      success: true,
      assignment_stats: stats[0] || {},
      volunteer_stats: volunteerStats[0] || {}
    });
    
  } catch (error) {
    console.error('Error getting distance stats:', error);
    res.status(500).json({ error: 'Failed to get distance statistics' });
  }
});

export default router;
