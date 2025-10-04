// Volunteer Dashboard JavaScript

// Accept a donation request
function acceptRequest(donationId) {
    if (confirm('Are you sure you want to accept this donation request?')) {
        fetch(`/accept-donation/${donationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Donation request accepted successfully!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('Error accepting donation request', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error accepting donation request', 'error');
        });
    }
}

// Mark donation as picked up
function markPickedUp(donationId) {
    if (confirm('Confirm that you have picked up this donation?')) {
        fetch(`/volunteer/pickup/${donationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Donation marked as picked up!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('Error updating donation status', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error updating donation status', 'error');
        });
    }
}

// Mark donation as delivered
function markDelivered(donationId) {
    if (confirm('Confirm that you have delivered this donation?')) {
        fetch(`/volunteer/deliver/${donationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Donation marked as delivered!', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('Error updating donation status', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error updating donation status', 'error');
        });
    }
}

// View request details
function viewRequestDetails(donationId) {
    window.location.href = `/donation/details/${donationId}`;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Auto-refresh available requests every 60 seconds
setInterval(() => {
    fetch('/volunteer-dashboard-data')
        .then(response => response.json())
        .then(data => {
            if (data.newRequests) {
                showNotification('New donation requests available!', 'info');
            }
        })
        .catch(error => {
            console.log('Auto-refresh failed:', error);
        });
}, 60000);

// Removed performance visualization components

// Removed map functionality

// Removed NGO map loading

// Removed pickup map loading

// Removed volunteer location map

// Removed performance charts

// Removed progress chart

// Removed response time chart

// ===== VOLUNTEER AVAILABILITY SYSTEM =====

let volunteerLocation = null;

// Load current availability display
function loadCurrentAvailability() {
    fetch('/api/volunteer/availability')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.availability) {
                displayCurrentAvailability(data.availability);
            } else {
                showDefaultAvailabilityMessage();
            }
        })
        .catch(error => {
            console.error('Error loading availability:', error);
            showDefaultAvailabilityMessage();
        });
}

// Display current availability
function displayCurrentAvailability(availability) {
    const container = document.getElementById('currentAvailability');
    if (availability.length === 0) {
        showDefaultAvailabilityMessage();
        return;
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availabilityHtml = availability.map(slot => `
        <div class="availability-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${days[slot.day_of_week]}</strong>
                    <span class="ms-2 text-muted">${slot.start_time} - ${slot.end_time}</span>
                </div>
                <div class="text-muted small">
                    <i class="fas fa-map-marker-alt"></i> ${slot.max_radius_km}km radius
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = availabilityHtml;
}

// Show default availability message
function showDefaultAvailabilityMessage() {
    const container = document.getElementById('currentAvailability');
    container.innerHTML = `
        <div class="text-center text-muted py-3">
            <i class="fas fa-calendar-alt fa-2x mb-2"></i>
            <p>Click "Update Schedule" to set your availability</p>
        </div>
    `;
}

// Open availability modal
function openAvailabilityModal() {
    const modal = new bootstrap.Modal(document.getElementById('availabilityModal'));
    modal.show();
    loadExistingAvailability();
}

// Load existing availability into form
function loadExistingAvailability() {
    fetch('/api/volunteer/availability')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.availability) {
                populateAvailabilityForm(data.availability);
            }
        })
        .catch(error => {
            console.error('Error loading existing availability:', error);
        });
}

// Populate availability form with existing data
function populateAvailabilityForm(availability) {
    // Clear all checkboxes first
    document.querySelectorAll('.day-checkbox').forEach(cb => {
        cb.checked = false;
        const daySchedule = cb.closest('.day-schedule');
        daySchedule.classList.remove('active');
        daySchedule.querySelector('.time-inputs').style.display = 'none';
    });
    
    // Set max radius if available
    if (availability.length > 0) {
        document.getElementById('maxRadius').value = availability[0].max_radius_km || 10;
    }
    
    // Populate each day
    availability.forEach(slot => {
        const dayCheckbox = document.getElementById(`day${slot.day_of_week}`);
        const daySchedule = dayCheckbox.closest('.day-schedule');
        const timeInputs = daySchedule.querySelector('.time-inputs');
        
        dayCheckbox.checked = true;
        daySchedule.classList.add('active');
        timeInputs.style.display = 'block';
        
        timeInputs.querySelector('.start-time').value = slot.start_time.substring(0, 5);
        timeInputs.querySelector('.end-time').value = slot.end_time.substring(0, 5);
    });
}

// Initialize availability form interactions
function initializeAvailabilityForm() {
    // Handle day checkbox changes
    document.querySelectorAll('.day-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const daySchedule = this.closest('.day-schedule');
            const timeInputs = daySchedule.querySelector('.time-inputs');
            
            if (this.checked) {
                daySchedule.classList.add('active');
                timeInputs.style.display = 'block';
            } else {
                daySchedule.classList.remove('active');
                timeInputs.style.display = 'none';
            }
        });
    });
    
    // Handle label clicks
    document.querySelectorAll('.day-label').forEach(label => {
        label.addEventListener('click', function(e) {
            if (e.target === this) {
                const checkbox = this.previousElementSibling;
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    });
}

// Get current location
function getCurrentLocation() {
    const statusDiv = document.getElementById('locationStatus');
    
    if (!navigator.geolocation) {
        statusDiv.textContent = 'Geolocation is not supported by this browser';
        statusDiv.className = 'text-danger small mt-1';
        return;
    }
    
    statusDiv.textContent = 'Getting your location...';
    statusDiv.className = 'text-info small mt-1';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            volunteerLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            statusDiv.textContent = `Location set (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`;
            statusDiv.className = 'text-success small mt-1';
        },
        function(error) {
            statusDiv.textContent = 'Error getting location: ' + error.message;
            statusDiv.className = 'text-danger small mt-1';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// Save availability
function saveAvailability() {
    const maxRadius = document.getElementById('maxRadius').value;
    const availability = [];
    
    // Collect availability data
    document.querySelectorAll('.day-checkbox:checked').forEach(checkbox => {
        const daySchedule = checkbox.closest('.day-schedule');
        const day = parseInt(daySchedule.getAttribute('data-day'));
        const startTime = daySchedule.querySelector('.start-time').value;
        const endTime = daySchedule.querySelector('.end-time').value;
        
        if (startTime && endTime) {
            availability.push({
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                max_radius_km: parseInt(maxRadius),
                latitude: volunteerLocation?.latitude,
                longitude: volunteerLocation?.longitude
            });
        }
    });
    
    if (availability.length === 0) {
        showNotification('Please select at least one day with availability', 'warning');
        return;
    }
    
    // Save to server
    fetch('/api/volunteer/availability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            availability: availability,
            location: volunteerLocation
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Availability schedule saved successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('availabilityModal'));
            modal.hide();
            loadCurrentAvailability();
            
            // Trigger auto-assignment check
            checkForAutoAssignments();
        } else {
            showNotification('Error saving availability: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error saving availability:', error);
        showNotification('Error saving availability', 'error');
    });
}

// Check for auto-assignments after updating availability
function checkForAutoAssignments() {
    fetch('/api/volunteer/check-auto-assignments', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.assignments && data.assignments.length > 0) {
            showNotification(`${data.assignments.length} request(s) automatically assigned to you!`, 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    })
    .catch(error => {
        console.log('Auto-assignment check failed:', error);
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Volunteer Dashboard initialized');
    
    // Add hover effects to donation cards
    const donationCards = document.querySelectorAll('.donation-request-card');
    donationCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        });
    });
    
    // Initialize dashboard after DOM is loaded
    setTimeout(() => {
        loadCurrentAvailability();
        initializeAvailabilityForm();
    }, 500);
});