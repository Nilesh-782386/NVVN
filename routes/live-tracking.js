// Live Tracking Routes (ADD-ON ONLY)
// These routes are completely separate from existing functionality

import express from 'express';
import { query } from '../db.js';
import { getAssignmentCoordinates } from '../utils/geocoding-service.js';
import { ensureVolunteerAuthenticated, ensureNGOAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Get map data for assignment
router.get('/api/live-tracking/assignment/:id', async (req, res) => {
    // Check if volunteer is authenticated
    if (!req.session || !req.session.volunteer) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const assignmentId = req.params.id;
        
        // Get donation ID from assignment
        const assignmentResult = await query(`
            SELECT donation_id FROM volunteer_assignments WHERE id = ? AND volunteer_id = ?
        `, [assignmentId, req.session.volunteer.id]);
        
        if (assignmentResult.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const donationId = assignmentResult[0].donation_id;
        const coordinates = await getAssignmentCoordinates(donationId);
        
        if (!coordinates) {
            return res.status(500).json({ error: 'Failed to get coordinates' });
        }
        
        res.json({
            success: true,
            donor: coordinates.donorCoords,
            ngo: coordinates.ngoCoords,
            donation: coordinates.donation
        });
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ error: 'Failed to load map data' });
    }
});

// Update volunteer location
router.post('/api/live-tracking/location', ensureVolunteerAuthenticated, async (req, res) => {
    try {
        const { assignment_id, lat, lng } = req.body;
        
        // Insert into volunteer_locations table
        await query(
            'INSERT INTO volunteer_locations (assignment_id, volunteer_id, lat, lng) VALUES (?, ?, ?, ?)',
            [assignment_id, req.session.volunteer.id, lat, lng]
        );
        
        res.json({ success: true, message: 'Location updated' });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Get volunteer's current location (for NGO tracking)
router.get('/api/live-tracking/volunteer-location/:assignmentId', async (req, res) => {
    try {
        // Check if assignment exists
        const assignmentCheck = await query(`
            SELECT va.id 
            FROM volunteer_assignments va 
            WHERE va.id = ?
        `, [req.params.assignmentId]);
        
        if (assignmentCheck.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const result = await query(
            'SELECT lat, lng, created_at FROM volunteer_locations WHERE assignment_id = ? ORDER BY created_at DESC LIMIT 1',
            [req.params.assignmentId]
        );
        
        res.json(result[0] || null);
    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
});

// Volunteer live map page - show available assignments
router.get('/volunteer/live-map', async (req, res) => {
    // Check if volunteer is authenticated
    if (!req.session || !req.session.volunteer) {
        return res.redirect('/volunteer-login');
    }
    try {
        // Get all active assignments for this volunteer
        const assignments = await query(`
            SELECT va.*, d.*, n.ngo_name, u.fullname as donor_name
            FROM volunteer_assignments va
            JOIN donations d ON va.donation_id = d.id
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE va.volunteer_id = ? AND va.status = 'active'
            ORDER BY va.created_at DESC
        `, [req.session.volunteer.id]);
        
        res.render('volunteer/live-map-list', {
            assignments: assignments,
            volunteer: req.session.volunteer,
            currentPage: 'live-tracking'
        });
    } catch (error) {
        console.error('Live map list error:', error);
        res.status(500).render('error', {
            message: 'Failed to load live tracking assignments',
            title: 'Server Error'
        });
    }
});

// Volunteer live map page for specific assignment
router.get('/volunteer/live-map/:assignmentId', async (req, res) => {
    // Check if volunteer is authenticated
    if (!req.session || !req.session.volunteer) {
        return res.redirect('/volunteer-login');
    }
    try {
        // Verify assignment exists and belongs to volunteer
        const assignment = await query(
            'SELECT * FROM volunteer_assignments WHERE id = ? AND volunteer_id = ?',
            [req.params.assignmentId, req.session.volunteer.id]
        );
        
        if (assignment.length === 0) {
            return res.status(404).render('error', {
                message: 'Assignment not found or you do not have permission to view this assignment.',
                title: 'Assignment Not Found'
            });
        }
        
        res.render('volunteer/live-map', {
            assignmentId: req.params.assignmentId,
            volunteer: req.session.volunteer,
            currentPage: 'live-tracking'
        });
    } catch (error) {
        console.error('Live map route error:', error);
        res.status(500).render('error', {
            message: 'Failed to load live tracking map',
            title: 'Server Error'
        });
    }
});

// NGO track volunteer page
router.get('/ngo/track-volunteer/:assignmentId', async (req, res) => {
    try {
        // Get assignment details
        const assignment = await query(`
            SELECT va.*, d.ngo_id, n.ngo_name, n.district
            FROM volunteer_assignments va 
            JOIN donations d ON va.donation_id = d.id 
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            WHERE va.id = ?
        `, [req.params.assignmentId]);
        
        if (assignment.length === 0) {
            return res.status(404).send('Assignment not found');
        }
        
        // Mock NGO data for testing
        const mockNGO = {
            id: assignment[0].ngo_id,
            ngo_name: assignment[0].ngo_name || 'Test NGO',
            district: assignment[0].district || 'nagpur'
        };
        
        res.render('ngo/track-volunteer', {
            assignmentId: req.params.assignmentId,
            ngo: mockNGO,
            currentPage: 'track-volunteer'
        });
    } catch (error) {
        console.error('Track volunteer error:', error);
        res.status(500).send('Server error');
    }
});

// Test route without authentication
router.get('/test-track-volunteer/:assignmentId', async (req, res) => {
    try {
        console.log('🧪 Test route called for assignment:', req.params.assignmentId);
        
        // Mock NGO data for testing
        const mockNGO = {
            id: 9,
            ngo_name: 'Test NGO',
            district: 'nagpur'
        };
        
        res.render('ngo/track-volunteer', {
            assignmentId: req.params.assignmentId,
            ngo: mockNGO,
            currentPage: 'track-volunteer'
        });
    } catch (error) {
        console.error('Test track volunteer error:', error);
        res.status(500).send('Server error');
    }
});

export default router;
