// Auto-enable live location features for new registrations
const autoEnableLocationFeatures = (req, res, next) => {
    // Store original database query method
    const originalQuery = req.db?.query;
    
    if (originalQuery) {
        req.db.query = function(text, params) {
            // Auto-add location features for new volunteers
            if (text.includes('INSERT INTO volunteers') && !text.includes('location_features')) {
                text = text.replace('INSERT INTO volunteers', 
                    'INSERT INTO volunteers (location_features, live_tracking_enabled, auto_location_detect,');
                params.push({
                    live_tracking: true,
                    auto_detect: true,
                    gps_permission: true
                }, true, true);
            }
            
            // Auto-add location features for new NGOs
            if (text.includes('INSERT INTO ngo_register') && !text.includes('location_settings')) {
                text = text.replace('INSERT INTO ngo_register', 
                    'INSERT INTO ngo_register (location_settings, static_coordinates, distance_calculation,');
                params.push({
                    static_location: true,
                    live_distance: true,
                    coordinates_locked: true
                }, true, true);
            }
            
            // Auto-add location features for new donors
            if (text.includes('INSERT INTO donors') && !text.includes('location_preferences')) {
                text = text.replace('INSERT INTO donors', 
                    'INSERT INTO donors (location_preferences, auto_coordinates, map_integration,');
                params.push({
                    auto_detect: true,
                    map_display: true,
                    distance_visible: true
                }, true, true);
            }
            
            return originalQuery.call(this, text, params);
        };
    }
    next();
};

export default autoEnableLocationFeatures;
