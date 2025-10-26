-- CareConnect Database Schema Updates for Improved Workflow
-- Add priority and NGO approval status columns to donations table

ALTER TABLE donations 
ADD COLUMN priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
ADD COLUMN ngo_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

-- Update the status enum to include new workflow states
ALTER TABLE donations 
MODIFY COLUMN status ENUM('pending_approval', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'rejected') DEFAULT 'pending_approval';

-- Add index for better performance on NGO approval queries
CREATE INDEX IF NOT EXISTS idx_donations_ngo_approval ON donations(ngo_approval_status, city);
CREATE INDEX IF NOT EXISTS idx_donations_priority ON donations(priority);
