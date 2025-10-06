-- Add location feature columns to tables for new registrations
-- This migration adds location tracking capabilities to all user types

-- Add location features to volunteers table
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS location_features JSON DEFAULT '{"live_tracking": true, "auto_detect": true, "gps_permission": true}';
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS live_tracking_enabled BOOLEAN DEFAULT true;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS auto_location_detect BOOLEAN DEFAULT true;

-- Add location features to ngo_register table
ALTER TABLE ngo_register ADD COLUMN IF NOT EXISTS location_settings JSON DEFAULT '{"static_coordinates": true, "coordinates_locked": true, "live_distance_calc": true}';
ALTER TABLE ngo_register ADD COLUMN IF NOT EXISTS static_coordinates BOOLEAN DEFAULT true;
ALTER TABLE ngo_register ADD COLUMN IF NOT EXISTS distance_calculation BOOLEAN DEFAULT true;

-- Add location features to users table (for donors)
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_preferences JSON DEFAULT '{"auto_coordinates": true, "map_integration": true, "distance_visible": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_coordinates BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS map_integration BOOLEAN DEFAULT true;

-- Create index for better performance on location queries
CREATE INDEX IF NOT EXISTS idx_volunteers_location ON volunteers(live_tracking_enabled, auto_location_detect);
CREATE INDEX IF NOT EXISTS idx_ngo_location ON ngo_register(static_coordinates, distance_calculation);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(auto_coordinates, map_integration);

-- Update existing records to have default location features (backward compatibility)
UPDATE volunteers SET 
    location_features = '{"live_tracking": true, "auto_detect": true, "gps_permission": true}',
    live_tracking_enabled = true,
    auto_location_detect = true
WHERE location_features IS NULL;

UPDATE ngo_register SET 
    location_settings = '{"static_coordinates": true, "coordinates_locked": true, "live_distance_calc": true}',
    static_coordinates = true,
    distance_calculation = true
WHERE location_settings IS NULL;

UPDATE users SET 
    location_preferences = '{"auto_coordinates": true, "map_integration": true, "distance_visible": true}',
    auto_coordinates = true,
    map_integration = true
WHERE location_preferences IS NULL;
