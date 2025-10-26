-- Create assignment_metrics table for distance logging
CREATE TABLE IF NOT EXISTS assignment_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    volunteer_id INT NOT NULL,
    accepted_distance DECIMAL(8,2) NULL,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_volunteer_id (volunteer_id),
    INDEX idx_accepted_at (accepted_at)
);

-- Add latitude and longitude columns to volunteers table if they don't exist
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL;

-- Add latitude and longitude columns to donations table if they don't exist
ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL;
