// Geocoding Service for Live Tracking (ADD-ON ONLY)
// Uses FREE OpenStreetMap Nominatim API - no API keys required

import { query } from '../db.js';

const geocodeAddress = async (address) => {
    try {
        // DISABLED: Auto address completion
        // Return the original address without modification
        console.log('📍 Geocoding disabled - using original address:', address);
        return {
            lat: null,
            lng: null,
            address: address // Keep original address as-is
        };
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
        // Get donation details with exact NGO district
        const donation = await query(`
            SELECT 
                d.*,
                u.fullname as donor_name,
                u.city as donor_city,
                u.district as donor_district,
                CONCAT(u.city, ', Maharashtra, India') as donor_address,
                n.ngo_name,
                n.address as ngo_address,
                n.city as ngo_city,
                n.district as ngo_district,
                n.state as ngo_state
            FROM donations d
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN ngo_register n ON d.ngo_id = n.id
            WHERE d.id = ?
        `, [donationId]);
        
        if (!donation || donation.length === 0) {
            throw new Error('Donation not found');
        }
        
        const donationData = donation[0];
        console.log('📍 Donation data for coordinates:', {
            donor_city: donationData.donor_city,
            donor_district: donationData.donor_district,
            ngo_city: donationData.ngo_city,
            ngo_district: donationData.ngo_district,
            ngo_name: donationData.ngo_name
        });

        // Use exact NGO district from database
        const ngoDistrict = donationData.ngo_district || donationData.ngo_city || 'nagpur';
        const ngoAddress = `${donationData.ngo_name}, ${ngoDistrict}, ${donationData.ngo_state || 'Maharashtra'}, India`;
        
        // Use donor's city/district
        const donorCity = donationData.donor_city || donationData.donor_district || 'nagpur';
        const donorAddress = `${donationData.donor_name}, ${donorCity}, Maharashtra, India`;

        console.log('📍 Using exact addresses:', {
            donorAddress,
            ngoAddress
        });

        // Geocode addresses (will return null coordinates since geocoding is disabled)
        const donorCoords = await geocodeAddress(donorAddress);
        const ngoCoords = await geocodeAddress(ngoAddress);

        // Use fallback coordinates for Nagpur area since geocoding is disabled
        const nagpurCoords = {
            lat: 21.1458,
            lng: 79.0882
        };

        // Create realistic coordinates within Nagpur area
        const donorOffset = (Math.random() - 0.5) * 0.05; // ±0.025 degrees (~2.5km)
        const ngoOffset = (Math.random() - 0.5) * 0.05;   // ±0.025 degrees (~2.5km)

        return { 
            donorCoords: {
                lat: nagpurCoords.lat + donorOffset,
                lng: nagpurCoords.lng + donorOffset,
                address: donorAddress
            }, 
            ngoCoords: {
                lat: nagpurCoords.lat + ngoOffset,
                lng: nagpurCoords.lng + ngoOffset,
                address: ngoAddress
            }, 
            donation: {
                ...donationData,
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
