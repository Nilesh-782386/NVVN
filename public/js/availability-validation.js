// AVAILABILITY VALIDATION SCRIPT (ADD-ON ONLY)
// Prevents volunteers from accidentally blocking themselves

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', function() {
    initializeAvailabilityValidation();
  });

  function initializeAvailabilityValidation() {
    // Find availability form
    const availabilityForm = document.getElementById('availabilityForm') || 
                           document.querySelector('form[action*="availability"]') ||
                           document.querySelector('form[action*="update-availability"]');
    
    if (!availabilityForm) {
      console.log('Availability form not found - validation not applied');
      return;
    }

    console.log('🔧 Initializing availability validation...');
    
    // Add validation to form submission
    availabilityForm.addEventListener('submit', function(e) {
      if (!validateAvailabilitySelection()) {
        e.preventDefault();
        return false;
      }
    });

    // Add smart defaults on page load
    applySmartDefaults();
    
    // Add real-time validation feedback
    addRealTimeValidation();
  }

  function validateAvailabilitySelection() {
    const selectedDays = document.querySelectorAll('input[name="available_days"]:checked');
    
    if (selectedDays.length === 0) {
      // Show warning and auto-fix
      showAvailabilityWarning();
      autoSelectSmartDays();
      return false; // Prevent form submission until user confirms
    }
    
    return true;
  }

  function showAvailabilityWarning() {
    // Remove existing warning
    const existingWarning = document.getElementById('availability-warning');
    if (existingWarning) {
      existingWarning.remove();
    }

    // Create warning message
    const warningDiv = document.createElement('div');
    warningDiv.id = 'availability-warning';
    warningDiv.className = 'alert alert-warning mt-3';
    warningDiv.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <div>
          <strong>⚠️ No days selected!</strong><br>
          <small>We've auto-selected the next 3 days for you. You can change this selection or click "Save" to continue.</small>
        </div>
      </div>
    `;

    // Insert warning after form
    const form = document.getElementById('availabilityForm') || 
                document.querySelector('form[action*="availability"]');
    if (form) {
      form.parentNode.insertBefore(warningDiv, form.nextSibling);
    }
  }

  function autoSelectSmartDays() {
    const checkboxes = document.querySelectorAll('input[name="available_days"]');
    const today = new Date().getDay();
    
    // Clear all selections first
    checkboxes.forEach(checkbox => checkbox.checked = false);
    
    // Select current day + next 2 days
    for (let i = 0; i < 3; i++) {
      const dayIndex = (today + i) % 7;
      if (checkboxes[dayIndex]) {
        checkboxes[dayIndex].checked = true;
      }
    }
    
    console.log('✅ Auto-selected smart default days');
  }

  function applySmartDefaults() {
    const checkboxes = document.querySelectorAll('input[name="available_days"]');
    const anySelected = Array.from(checkboxes).some(cb => cb.checked);
    
    if (!anySelected) {
      // Add quick setup buttons
      addQuickSetupButtons();
    }
  }

  function addQuickSetupButtons() {
    const form = document.getElementById('availabilityForm') || 
                document.querySelector('form[action*="availability"]');
    
    if (!form) return;

    const quickSetupDiv = document.createElement('div');
    quickSetupDiv.className = 'quick-setup mt-3';
    quickSetupDiv.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h6 class="card-title">
            <i class="fas fa-magic"></i> Quick Setup
          </h6>
          <p class="card-text small text-muted">Choose your availability pattern:</p>
          <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-outline-primary" onclick="selectAvailabilityPattern('weekdays')">
              <i class="fas fa-briefcase"></i> Weekdays
            </button>
            <button type="button" class="btn btn-outline-primary" onclick="selectAvailabilityPattern('weekends')">
              <i class="fas fa-coffee"></i> Weekends
            </button>
            <button type="button" class="btn btn-outline-primary" onclick="selectAvailabilityPattern('all')">
              <i class="fas fa-calendar"></i> All Days
            </button>
          </div>
        </div>
      </div>
    `;

    form.parentNode.insertBefore(quickSetupDiv, form);
  }

  function addRealTimeValidation() {
    const checkboxes = document.querySelectorAll('input[name="available_days"]');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        updateAvailabilityStatus();
      });
    });
  }

  function updateAvailabilityStatus() {
    const selectedDays = document.querySelectorAll('input[name="available_days"]:checked');
    const statusElement = document.getElementById('availability-status');
    
    if (statusElement) {
      if (selectedDays.length === 0) {
        statusElement.innerHTML = `
          <span class="badge bg-warning">
            <i class="fas fa-exclamation-triangle"></i> No days selected
          </span>
        `;
      } else {
        statusElement.innerHTML = `
          <span class="badge bg-success">
            <i class="fas fa-check"></i> ${selectedDays.length} days selected
          </span>
        `;
      }
    }
  }

  // Global functions for quick setup buttons
  window.selectAvailabilityPattern = function(pattern) {
    const checkboxes = document.querySelectorAll('input[name="available_days"]');
    
    // Clear all selections
    checkboxes.forEach(checkbox => checkbox.checked = false);
    
    // Apply pattern
    switch(pattern) {
      case 'weekdays':
        // Monday to Friday (indices 1-5)
        for (let i = 1; i <= 5; i++) {
          if (checkboxes[i]) checkboxes[i].checked = true;
        }
        break;
      case 'weekends':
        // Saturday and Sunday (indices 6 and 0)
        if (checkboxes[6]) checkboxes[6].checked = true; // Saturday
        if (checkboxes[0]) checkboxes[0].checked = true; // Sunday
        break;
      case 'all':
        // All days
        checkboxes.forEach(checkbox => checkbox.checked = true);
        break;
    }
    
    // Update status
    updateAvailabilityStatus();
    
    // Remove quick setup
    const quickSetup = document.querySelector('.quick-setup');
    if (quickSetup) {
      quickSetup.remove();
    }
    
    console.log(`✅ Applied ${pattern} availability pattern`);
  };

})();
