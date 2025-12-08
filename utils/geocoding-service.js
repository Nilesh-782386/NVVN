// Geocoding Service for Live Tracking (ADD-ON ONLY)
// Uses FREE OpenStreetMap Nominatim API - no API keys required

import { query } from '../db.js';
import RegistrationLocationSetup from './registration-location-setup.js';

// Reverse geocoding: Get address from coordinates using Google Maps API (with fallback to Nominatim)
const reverseGeocode = async (lat, lng) => {
    try {
        // Try Google Maps Geocoding API first (more accurate)
        const GOOGLE_API_KEY = 'AIzaSyCeWjTPT79ANAeOvsBcp1RI_9RoxxOJ5QA'; // TODO: Move to environment variable
        
        try {
            const googleResponse = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
            );
            
            if (googleResponse.ok) {
                const googleData = await googleResponse.json();
                
                if (googleData && googleData.status === 'OK' && googleData.results && googleData.results.length > 0) {
                    const result = googleData.results[0];
                    console.log('✅ Google Maps reverse geocoding successful');
                    return {
                        address: result.formatted_address,
                        lat: parseFloat(lat),
                        lng: parseFloat(lng),
                        details: result.address_components || {},
                        source: 'Google Maps API'
                    };
                }
            }
        } catch (googleError) {
            console.warn('⚠️ Google Maps API failed, falling back to Nominatim:', googleError);
        }
        
        // Fallback to FREE OpenStreetMap Nominatim API (no API key required)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'CareConnect-Donation-System/1.0' // Required by Nominatim
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.display_name) {
            console.log('✅ Nominatim reverse geocoding successful (fallback)');
            return {
                address: data.display_name,
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lon),
                details: data.address || {},
                source: 'Nominatim (OpenStreetMap)'
            };
        }
        
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
};

// Forward geocoding: Get coordinates from address using Google Maps API (with fallback to Nominatim)
const geocodeAddress = async (address) => {
    try {
        if (!address) {
            return {
                lat: null,
                lng: null,
                address: address
            };
        }
        
        // Try Google Maps Geocoding API first (more accurate)
        const GOOGLE_API_KEY = 'AIzaSyCeWjTPT79ANAeOvsBcp1RI_9RoxxOJ5QA'; // TODO: Move to environment variable
        
        try {
            const encodedAddress = encodeURIComponent(address);
            const googleResponse = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`
            );
            
            if (googleResponse.ok) {
                const googleData = await googleResponse.json();
                
                if (googleData && googleData.status === 'OK' && googleData.results && googleData.results.length > 0) {
                    const result = googleData.results[0];
                    const location = result.geometry.location;
                    console.log('✅ Google Maps geocoding successful');
                    return {
                        lat: parseFloat(location.lat),
                        lng: parseFloat(location.lng),
                        address: result.formatted_address || address,
                        source: 'Google Maps API'
                    };
                }
            }
        } catch (googleError) {
            console.warn('⚠️ Google Maps API failed, falling back to Nominatim:', googleError);
        }
        
        // Fallback to FREE OpenStreetMap Nominatim API (no API key required)
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'CareConnect-Donation-System/1.0' // Required by Nominatim
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            console.log('✅ Nominatim geocoding successful (fallback)');
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                address: data[0].display_name || address,
                source: 'Nominatim (OpenStreetMap)'
            };
        }
        
        // If geocoding fails, return original address
        console.log('📍 Geocoding failed, using original address:', address);
        return {
            lat: null,
            lng: null,
            address: address
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return {
            lat: null,
            lng: null,
            address: address
        };
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
        const ngoDistrict = donationData.ngo_district || donationData.ngo_city;
        const ngoCity = donationData.ngo_city || donationData.ngo_district;
        const ngoAddress = `${donationData.ngo_name}, ${ngoDistrict || ngoCity}, ${donationData.ngo_state || 'Maharashtra'}, India`;
        
        // Use donor's city/district
        const donorCity = donationData.donor_city || donationData.donor_district;
        const donorDistrict = donationData.donor_district || donationData.donor_city;
        const donorAddress = `${donationData.donor_name}, ${donorCity || donorDistrict}, Maharashtra, India`;

        console.log('📍 Using exact addresses:', {
            donorAddress,
            donorCity,
            donorDistrict,
            ngoAddress,
            ngoCity,
            ngoDistrict
        });

        // Geocode addresses (will return null coordinates since geocoding is disabled)
        const donorGeocodeResult = await geocodeAddress(donorAddress);
        const ngoGeocodeResult = await geocodeAddress(ngoAddress);

        // Get district-based coordinates for fallback
        const donorDistrictCoords = RegistrationLocationSetup.getDistrictCoordinates(donorDistrict || donorCity);
        const ngoDistrictCoords = RegistrationLocationSetup.getDistrictCoordinates(ngoDistrict || ngoCity);

        // Use district coordinates if geocoding returned null, otherwise use geocoded coordinates
        let donorCoords, ngoCoords;

        if (donorGeocodeResult && donorGeocodeResult.lat && donorGeocodeResult.lng) {
            // Use geocoded coordinates
            donorCoords = {
                lat: donorGeocodeResult.lat,
                lng: donorGeocodeResult.lng,
                address: donorAddress
            };
        } else if (donorDistrictCoords) {
            // Use district-based coordinates with small random offset for realism
            const donorOffset = (Math.random() - 0.5) * 0.05; // ±0.025 degrees (~2.5km)
            donorCoords = {
                lat: donorDistrictCoords.lat + donorOffset,
                lng: donorDistrictCoords.lng + donorOffset,
                address: donorAddress
            };
            console.log('📍 Using donor district coordinates:', donorDistrict || donorCity, donorCoords);
        } else {
            // Last resort: use Maharashtra center
            donorCoords = {
                lat: 19.7515 + (Math.random() - 0.5) * 0.1,
                lng: 75.7139 + (Math.random() - 0.5) * 0.1,
                address: donorAddress
            };
            console.log('⚠️ Using Maharashtra center fallback for donor');
        }

        if (ngoGeocodeResult && ngoGeocodeResult.lat && ngoGeocodeResult.lng) {
            // Use geocoded coordinates
            ngoCoords = {
                lat: ngoGeocodeResult.lat,
                lng: ngoGeocodeResult.lng,
                address: ngoAddress
            };
        } else if (ngoDistrictCoords) {
            // Use district-based coordinates with small random offset for realism
            const ngoOffset = (Math.random() - 0.5) * 0.05; // ±0.025 degrees (~2.5km)
            ngoCoords = {
                lat: ngoDistrictCoords.lat + ngoOffset,
                lng: ngoDistrictCoords.lng + ngoOffset,
                address: ngoAddress
            };
            console.log('📍 Using NGO district coordinates:', ngoDistrict || ngoCity, ngoCoords);
        } else {
            // Last resort: use Maharashtra center
            ngoCoords = {
                lat: 19.7515 + (Math.random() - 0.5) * 0.1,
                lng: 75.7139 + (Math.random() - 0.5) * 0.1,
                address: ngoAddress
            };
            console.log('⚠️ Using Maharashtra center fallback for NGO');
        }

        return { 
            donorCoords, 
            ngoCoords, 
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

export { geocodeAddress, reverseGeocode, getAssignmentCoordinates, getDonationDetails };
