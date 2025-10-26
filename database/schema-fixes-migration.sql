-- CareConnect Database Schema Fixes Migration
-- This script adds missing columns and tables to fix the application

-- 1. Create system_admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Add missing columns to volunteers table
-- Check if columns exist before adding them
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'name' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN name VARCHAR(255)',
    'SELECT "Column name already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'district' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN district VARCHAR(100)',
    'SELECT "Column district already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'vehicle_type' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN vehicle_type VARCHAR(50)',
    'SELECT "Column vehicle_type already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'status' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN status ENUM(\'active\', \'inactive\', \'suspended\') DEFAULT \'active\'',
    'SELECT "Column status already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'ngo_id' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN ngo_id INT',
    'SELECT "Column ngo_id already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'latitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN latitude DECIMAL(10, 8)',
    'SELECT "Column latitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'volunteers' 
     AND column_name = 'longitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE volunteers ADD COLUMN longitude DECIMAL(11, 8)',
    'SELECT "Column longitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add missing columns to ngo_register table
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'primary_phone' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN primary_phone VARCHAR(20)',
    'SELECT "Column primary_phone already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'alternate_phone' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN alternate_phone VARCHAR(20)',
    'SELECT "Column alternate_phone already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'landmark' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN landmark VARCHAR(255)',
    'SELECT "Column landmark already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'district' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN district VARCHAR(100)',
    'SELECT "Column district already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'website_url' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN website_url VARCHAR(255)',
    'SELECT "Column website_url already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'social_handle_url' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN social_handle_url VARCHAR(255)',
    'SELECT "Column social_handle_url already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'registration_certificate' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN registration_certificate VARCHAR(512)',
    'SELECT "Column registration_certificate already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'status' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN status ENUM(\'applied\', \'verified\', \'suspended\', \'rejected\') DEFAULT \'applied\'',
    'SELECT "Column status already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'latitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN latitude DECIMAL(10, 8)',
    'SELECT "Column latitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'longitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN longitude DECIMAL(11, 8)',
    'SELECT "Column longitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'ngo_type' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN ngo_type ENUM(\'multi_purpose\', \'education\', \'health\', \'environment\', \'women_empowerment\', \'child_welfare\', \'elderly_care\', \'disability_support\', \'animal_welfare\', \'disaster_relief\') DEFAULT \'multi_purpose\'',
    'SELECT "Column ngo_type already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'ngo_register' 
     AND column_name = 'can_accept_universal' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE ngo_register ADD COLUMN can_accept_universal BOOLEAN DEFAULT TRUE',
    'SELECT "Column can_accept_universal already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add missing columns to users table
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'users' 
     AND column_name = 'city' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE users ADD COLUMN city VARCHAR(100)',
    'SELECT "Column city already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'users' 
     AND column_name = 'district' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE users ADD COLUMN district VARCHAR(100)',
    'SELECT "Column district already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'users' 
     AND column_name = 'latitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 8)',
    'SELECT "Column latitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'users' 
     AND column_name = 'longitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE users ADD COLUMN longitude DECIMAL(11, 8)',
    'SELECT "Column longitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Add missing columns to donations table
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'district' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN district VARCHAR(100)',
    'SELECT "Column district already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'latitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN latitude DECIMAL(10, 8)',
    'SELECT "Column latitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'longitude' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN longitude DECIMAL(11, 8)',
    'SELECT "Column longitude already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'ai_suggested_priority' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN ai_suggested_priority ENUM(\'critical\', \'high\', \'medium\', \'low\') DEFAULT \'medium\'',
    'SELECT "Column ai_suggested_priority already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'final_priority' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN final_priority ENUM(\'critical\', \'high\', \'medium\', \'low\') DEFAULT \'medium\'',
    'SELECT "Column final_priority already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'is_manual_override' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN is_manual_override BOOLEAN DEFAULT FALSE',
    'SELECT "Column is_manual_override already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'is_custom_item' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN is_custom_item BOOLEAN DEFAULT FALSE',
    'SELECT "Column is_custom_item already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'custom_description' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN custom_description TEXT',
    'SELECT "Column custom_description already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'custom_quantity' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN custom_quantity INTEGER DEFAULT 0',
    'SELECT "Column custom_quantity already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donations' 
     AND column_name = 'is_universal_item' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donations ADD COLUMN is_universal_item BOOLEAN DEFAULT FALSE',
    'SELECT "Column is_universal_item already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Fix donation_requests table (add id column if missing)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'donation_requests' 
     AND column_name = 'id' 
     AND table_schema = DATABASE()) = 0,
    'ALTER TABLE donation_requests ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
    'SELECT "Column id already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. Create default admin user if system_admins table is empty
INSERT IGNORE INTO system_admins (email, password, name) 
VALUES ('admin@careconnect.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Admin');

-- 8. Update existing volunteers to have 'active' status
UPDATE volunteers SET status = 'active' WHERE status IS NULL;

-- 9. Update existing NGOs to have 'applied' status
UPDATE ngo_register SET status = 'applied' WHERE status IS NULL;

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_ngo_id ON volunteers(ngo_id);
CREATE INDEX IF NOT EXISTS idx_ngo_register_status ON ngo_register(status);
CREATE INDEX IF NOT EXISTS idx_donations_district ON donations(district);
CREATE INDEX IF NOT EXISTS idx_donations_priority ON donations(priority);
CREATE INDEX IF NOT EXISTS idx_donations_ngo_approval ON donations(ngo_approval_status);

-- Migration completed successfully
SELECT 'Schema fixes migration completed successfully!' as status;
