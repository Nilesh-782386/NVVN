// AVAILABILITY VALIDATION SERVICE (ADD-ON ONLY)
// This service prevents volunteers from blocking themselves without changing existing flow

import { query } from '../db.js';

class AvailabilityValidationService {
  constructor() {
    this.defaultDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  }

  // Validate and fix volunteer availability before saving
  async validateAndFixAvailability(volunteerId, availabilityData) {
    try {
      const { available_days, max_distance, location } = availabilityData;
      
      // Check if no days selected
      if (!available_days || available_days.length === 0) {
        console.log(`⚠️ Volunteer ${volunteerId} selected no days - applying smart default`);
        
        // Apply smart default: current day + next 2 days
        const smartDays = this.getSmartDefaultDays();
        
        return {
          ...availabilityData,
          available_days: smartDays,
          auto_fixed: true,
          fix_reason: 'no_days_selected'
        };
      }
      
      return {
        ...availabilityData,
        auto_fixed: false
      };
      
    } catch (error) {
      console.error('Error validating availability:', error);
      return availabilityData;
    }
  }

  // Get smart default days (current day + next 2 days)
  getSmartDefaultDays() {
    const today = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    const smartDays = [];
    for (let i = 0; i < 3; i++) {
      const dayIndex = (today + i) % 7;
      smartDays.push(days[dayIndex]);
    }
    
    return smartDays;
  }

  // Check if volunteer has valid availability
  async checkVolunteerAvailability(volunteerId) {
    try {
      const result = await query(
        'SELECT available_days, max_distance FROM volunteers WHERE id = ?',
        [volunteerId]
      );
      
      if (result.length === 0) return false;
      
      const volunteer = result[0];
      const hasValidDays = volunteer.available_days && volunteer.available_days.length > 0;
      const hasValidDistance = volunteer.max_distance && volunteer.max_distance > 0;
      
      return hasValidDays && hasValidDistance;
    } catch (error) {
      console.error('Error checking volunteer availability:', error);
      return false;
    }
  }

  // Fix existing volunteers with no availability set
  async fixExistingVolunteers() {
    try {
      console.log('🔧 Fixing volunteers with no availability set...');
      
      const volunteersToFix = await query(`
        SELECT id, name 
        FROM volunteers 
        WHERE (available_days IS NULL OR JSON_LENGTH(available_days) = 0)
        AND status = 'active'
      `);
      
      let fixedCount = 0;
      for (const volunteer of volunteersToFix) {
        const smartDays = this.getSmartDefaultDays();
        
        await query(
          'UPDATE volunteers SET available_days = ? WHERE id = ?',
          [JSON.stringify(smartDays), volunteer.id]
        );
        
        console.log(`✅ Fixed availability for ${volunteer.name} (ID: ${volunteer.id})`);
        fixedCount++;
      }
      
      console.log(`🎉 Fixed ${fixedCount} volunteers with missing availability`);
      return fixedCount;
    } catch (error) {
      console.error('Error fixing existing volunteers:', error);
      return 0;
    }
  }

  // Get availability status for display
  async getAvailabilityStatus(volunteerId) {
    try {
      const result = await query(
        'SELECT available_days, max_distance FROM volunteers WHERE id = ?',
        [volunteerId]
      );
      
      if (result.length === 0) {
        return {
          is_configured: false,
          available_days_count: 0,
          max_distance: 0,
          needs_setup: true
        };
      }
      
      const volunteer = result[0];
      const availableDays = volunteer.available_days ? JSON.parse(volunteer.available_days) : [];
      
      return {
        is_configured: availableDays.length > 0 && volunteer.max_distance > 0,
        available_days_count: availableDays.length,
        max_distance: volunteer.max_distance || 0,
        needs_setup: availableDays.length === 0 || volunteer.max_distance === 0
      };
    } catch (error) {
      console.error('Error getting availability status:', error);
      return {
        is_configured: false,
        available_days_count: 0,
        max_distance: 0,
        needs_setup: true
      };
    }
  }
}

export default new AvailabilityValidationService();
