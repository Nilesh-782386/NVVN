// Automatic location setup for new registrations
class RegistrationLocationSetup {
    // Setup location features for new volunteer
    static async setupNewVolunteer(volunteerData) {
        return {
            ...volunteerData,
            location_features: {
                live_tracking: true,
                auto_detect: true,
                gps_permission: true,
                real_time_updates: true
            },
            preferences: {
                use_live_location: true,
                show_exact_distance: true,
                auto_refresh_location: true
            }
        };
    }
    
    // Setup location features for new NGO
    static async setupNewNGO(ngoData) {
        // Get static coordinates based on district
        const coordinates = this.getDistrictCoordinates(ngoData.district);
        
        return {
            ...ngoData,
            location_settings: {
                static_coordinates: true,
                coordinates_locked: true,
                live_distance_calc: true,
                map_display: true
            },
            static_location: coordinates
        };
    }
    
    // Setup location features for new donor
    static async setupNewDonor(donorData) {
        return {
            ...donorData,
            location_preferences: {
                auto_coordinates: true,
                map_integration: true,
                distance_visibility: true,
                live_tracking_consent: true
            }
        };
    }
    
    // Get static coordinates for district
    static getDistrictCoordinates(district) {
        const districtMap = {
            'pune': { lat: 18.5204, lng: 73.8567 },
            'nagpur': { lat: 21.1458, lng: 79.0882 },
            'mumbai': { lat: 19.0760, lng: 72.8777 },
            'thane': { lat: 19.2183, lng: 72.9781 },
            'nashik': { lat: 20.0059, lng: 73.7910 },
            'nagar': { lat: 19.0946, lng: 74.7482 },
            'aurangabad': { lat: 19.8762, lng: 75.3433 },
            'solapur': { lat: 17.6599, lng: 75.9064 },
            'kolhapur': { lat: 16.7050, lng: 74.2433 },
            'amravati': { lat: 20.9374, lng: 77.7796 },
            'latur': { lat: 18.4088, lng: 76.5604 },
            'akola': { lat: 20.7059, lng: 77.0219 },
            'jalgaon': { lat: 21.0077, lng: 75.5626 },
            'satara': { lat: 17.6805, lng: 74.0183 },
            'sangli': { lat: 16.8524, lng: 74.5815 }
        };
        
        return districtMap[district.toLowerCase()] || null;
    }
}

export default RegistrationLocationSetup;
