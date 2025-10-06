// Geocoding Service for Live Tracking (ADD-ON ONLY)
// Uses FREE OpenStreetMap Nominatim API - no API keys required

import { query } from '../db.js';

const geocodeAddress = async (address) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                address: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

const getDonationDetails = async (donationId) => {
    try {
        const result = await query(`
            SELECT 
                d.*,
                u.fullname as donor_name,
                CONCAT(u.city, ', Maharashtra, India') as donor_address,
                n.ngo_name,
                n.address as ngo_address
            FROM donations d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            WHERE d.id = ?
        `, [donationId]);
        
        return result[0] || null;
    } catch (error) {
        console.error('Error getting donation details:', error);
        return null;
    }
};

const getAssignmentCoordinates = async (donationId) => {
    try {
        // Get donation details using existing function
        const donation = await getDonationDetails(donationId);
        if (!donation) {
            throw new Error('Donation not found');
        }

        // Create fallback addresses if not available
        const donorAddress = donation.donor_address || `${donation.city || 'Pune'}, Maharashtra, India`;
        const ngoAddress = donation.ngo_address || `${donation.city || 'Pune'}, Maharashtra, India`;

        // Geocode donor and NGO addresses
        const donorCoords = await geocodeAddress(donorAddress);
        const ngoCoords = await geocodeAddress(ngoAddress);

        return { 
            donorCoords, 
            ngoCoords, 
            donation: {
                ...donation,
                donor_address: donorAddress,
                ngo_address: ngoAddress
            }
        };
    } catch (error) {
        console.error('Error getting assignment coordinates:', error);
        return null;
    }
};

export { geocodeAddress, getAssignmentCoordinates, getDonationDetails };
