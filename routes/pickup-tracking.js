// PICKUP TRACKING ROUTES (ADD-ON ONLY)
// Live tracking for items that are picked up and in transit

import express from 'express';
import { query } from '../db.js';
import { getAssignmentCoordinates } from '../utils/geocoding-service.js';

const router = express.Router();

// Get live tracking data for picked up donations
router.get('/api/pickup-tracking/:donationId', async (req, res) => {
    try {
        const donationId = req.params.donationId;
        
        // Get donation details with volunteer and NGO info
        const donationResult = await query(`
            SELECT 
                d.*,
                v.id as volunteer_id,
                v.name as volunteer_name,
                v.phone as volunteer_phone,
                n.ngo_name,
                n.address as ngo_address,
                n.primary_phone as ngo_phone,
                u.fullname as donor_name,
                u.phone as donor_phone,
                u.email as donor_email
            FROM donations d
            LEFT JOIN volunteers v ON d.volunteer_id = v.id
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = ? AND d.status IN ('picked_up', 'in_transit')
        `, [donationId]);
        
        if (donationResult.length === 0) {
            return res.status(404).json({ error: 'Donation not found or not in transit' });
        }
        
        const donation = donationResult[0];
        
        // Get coordinates for all parties
        const coordinates = await getAssignmentCoordinates(donationId);
        
        if (!coordinates) {
            return res.status(500).json({ error: 'Failed to get coordinates' });
        }
        
        // Get volunteer's current location (if available)
        const volunteerLocation = await query(`
            SELECT lat, lng, created_at 
            FROM volunteer_locations 
            WHERE volunteer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [donation.volunteer_id]);
        
        res.json({
            success: true,
            donation: donation,
            donor: coordinates.donorCoords,
            ngo: coordinates.ngoCoords,
            volunteer: volunteerLocation.length > 0 ? {
                lat: volunteerLocation[0].lat,
                lng: volunteerLocation[0].lng,
                last_updated: volunteerLocation[0].created_at
            } : null,
            tracking_active: volunteerLocation.length > 0
        });
        
    } catch (error) {
        console.error('Pickup tracking error:', error);
        res.status(500).json({ error: 'Failed to load tracking data' });
    }
});

// Update volunteer location during pickup/delivery
router.post('/api/pickup-tracking/location', async (req, res) => {
    try {
        const { donation_id, lat, lng, status } = req.body;
        
        // Get volunteer ID from donation
        const donationResult = await query(
            'SELECT volunteer_id FROM donations WHERE id = ?',
            [donation_id]
        );
        
        if (donationResult.length === 0) {
            return res.status(404).json({ error: 'Donation not found' });
        }
        
        const volunteerId = donationResult[0].volunteer_id;
        
        // Get assignment_id for this donation
        const assignmentResult = await query(
            'SELECT id FROM volunteer_assignments WHERE donation_id = ? AND volunteer_id = ? ORDER BY created_at DESC LIMIT 1',
            [donation_id, volunteerId]
        );
        
        const assignmentId = assignmentResult.length > 0 ? assignmentResult[0].id : null;
        
        // Insert location update
        await query(
            'INSERT INTO volunteer_locations (assignment_id, volunteer_id, lat, lng, created_at) VALUES (?, ?, ?, ?, NOW())',
            [assignmentId, volunteerId, lat, lng]
        );
        
        // Update donation status if provided
        if (status) {
            await query(
                'UPDATE donations SET status = ? WHERE id = ?',
                [status, donation_id]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Location updated successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// Get all active pickups for volunteer
router.get('/api/volunteer/active-pickups', async (req, res) => {
    try {
        // Check if volunteer is authenticated
        if (!req.session || !req.session.volunteer) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const volunteerId = req.session.volunteer.id;
        
        const pickups = await query(`
            SELECT 
                d.id,
                d.title,
                d.description,
                d.status,
                d.pickup_date,
                d.pickup_time,
                d.latitude,
                d.longitude,
                d.address,
                n.ngo_name,
                n.address as ngo_address,
                u.fullname as donor_name,
                u.phone as donor_phone
            FROM donations d
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.volunteer_id = ? 
            AND d.status IN ('picked_up', 'in_transit')
            ORDER BY d.pickup_date DESC, d.pickup_time DESC
        `, [volunteerId]);
        
        res.json({
            success: true,
            pickups: pickups
        });
        
    } catch (error) {
        console.error('Active pickups error:', error);
        res.status(500).json({ error: 'Failed to get active pickups' });
    }
});

// Get all active pickups for NGO
router.get('/api/ngo/active-pickups', async (req, res) => {
    try {
        // Check if NGO is authenticated
        if (!req.session || !req.session.ngo) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const ngoId = req.session.ngo.id;
        
        const pickups = await query(`
            SELECT 
                d.id,
                d.title,
                d.description,
                d.status,
                d.pickup_date,
                d.pickup_time,
                d.latitude,
                d.longitude,
                d.address,
                v.name as volunteer_name,
                v.phone as volunteer_phone,
                u.fullname as donor_name,
                u.phone as donor_phone
            FROM donations d
            LEFT JOIN volunteers v ON d.volunteer_id = v.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.ngo_id = ? 
            AND d.status IN ('picked_up', 'in_transit')
            ORDER BY d.pickup_date DESC, d.pickup_time DESC
        `, [ngoId]);
        
        res.json({
            success: true,
            pickups: pickups
        });
        
    } catch (error) {
        console.error('NGO active pickups error:', error);
        res.status(500).json({ error: 'Failed to get active pickups' });
    }
});

// Volunteer pickup tracking page
router.get('/volunteer/pickup-tracking/:donationId', async (req, res) => {
    try {
        // Check if volunteer is authenticated
        if (!req.session || !req.session.volunteer) {
            return res.redirect('/volunteer-login');
        }
        
        const donationId = req.params.donationId;
        
        // Verify donation belongs to volunteer and is picked up
        const donationResult = await query(`
            SELECT d.*, v.name as volunteer_name, n.ngo_name, u.fullname as donor_name
            FROM donations d
            LEFT JOIN volunteers v ON d.volunteer_id = v.id
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = ? AND d.volunteer_id = ? AND d.status IN ('picked_up', 'in_transit')
        `, [donationId, req.session.volunteer.id]);
        
        if (donationResult.length === 0) {
            return res.status(404).render('error', {
                message: 'Donation not found or not in transit',
                title: 'Not Found'
            });
        }
        
        res.render('volunteer/pickup-tracking', {
            donationId: donationId,
            donation: donationResult[0],
            volunteer: req.session.volunteer,
            title: 'Live Pickup Tracking'
        });
        
    } catch (error) {
        console.error('Pickup tracking page error:', error);
        res.status(500).render('error', {
            message: 'Failed to load pickup tracking page',
            title: 'Server Error'
        });
    }
});

// NGO pickup tracking page
router.get('/ngo/pickup-tracking/:donationId', async (req, res) => {
    try {
        // Check if NGO is authenticated
        if (!req.session || !req.session.ngo) {
            return res.redirect('/ngo-login');
        }
        
        const donationId = req.params.donationId;
        
        // Verify donation belongs to NGO and is picked up
        const donationResult = await query(`
            SELECT d.*, v.name as volunteer_name, v.phone as volunteer_phone, n.ngo_name, u.fullname as donor_name
            FROM donations d
            LEFT JOIN volunteers v ON d.volunteer_id = v.id
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            LEFT JOIN users u ON d.user_id = u.id
            WHERE d.id = ? AND d.ngo_id = ? AND d.status IN ('picked_up', 'in_transit')
        `, [donationId, req.session.ngo.id]);
        
        if (donationResult.length === 0) {
            return res.status(404).render('error', {
                message: 'Donation not found or not in transit',
                title: 'Not Found'
            });
        }
        
        res.render('ngo/pickup-tracking', {
            donationId: donationId,
            donation: donationResult[0],
            ngo: req.session.ngo,
            title: 'Track Volunteer'
        });
        
    } catch (error) {
        console.error('NGO pickup tracking page error:', error);
        res.status(500).render('error', {
            message: 'Failed to load tracking page',
            title: 'Server Error'
        });
    }
});

export default router;
