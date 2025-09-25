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
    fetch('/api/volunteer/dashboard-data')
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

// Map variables
let volunteerAreaMap = null;

// Chart variables
let volunteerProgressChart = null;
let responseTimeChart = null;

// Initialize Volunteer Area Map
function initializeVolunteerAreaMap() {
    if (document.getElementById('volunteerAreaMap')) {
        // Initialize map centered on volunteer's area (default to Mumbai for demo)
        volunteerAreaMap = L.map('volunteerAreaMap').setView([19.0760, 72.8777], 10);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(volunteerAreaMap);
        
        // Load local NGOs and donation pickup points
        loadLocalNGOs();
        loadDonationPickups();
        loadVolunteerLocation();
        
        // Refresh map data every 2 minutes
        setInterval(() => {
            loadDonationPickups();
        }, 120000);
    }
}

// Load local NGO locations on map
function loadLocalNGOs() {
    fetch('/api/ngo-locations')
        .then(response => response.json())
        .then(data => {
            if (data.ngos) {
                data.ngos.forEach(ngo => {
                    const marker = L.marker([ngo.latitude, ngo.longitude], {
                        icon: L.divIcon({
                            className: 'ngo-marker-volunteer',
                            html: '<i class="fas fa-home" style="color: #0d6efd; font-size: 16px;"></i>',
                            iconSize: [22, 22]
                        })
                    }).addTo(volunteerAreaMap);
                    
                    marker.bindPopup(`
                        <div>
                            <h6><strong>${ngo.ngo_name}</strong></h6>
                            <p class="mb-1"><i class="fas fa-map-marker-alt"></i> ${ngo.city}, ${ngo.state}</p>
                            <span class="badge bg-success">Verified NGO</span>
                        </div>
                    `);
                });
            }
        })
        .catch(error => {
            console.error('Error loading local NGOs:', error);
        });
}

// Load donation pickup points
function loadDonationPickups() {
    fetch('/api/volunteer/pickup-locations')
        .then(response => response.json())
        .then(data => {
            if (data.pickups) {
                // Clear existing pickup markers
                volunteerAreaMap.eachLayer((layer) => {
                    if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'pickup-marker') {
                        volunteerAreaMap.removeLayer(layer);
                    }
                });
                
                data.pickups.forEach(pickup => {
                    const marker = L.marker([pickup.latitude, pickup.longitude], {
                        icon: L.divIcon({
                            className: 'pickup-marker',
                            html: '<i class="fas fa-map-marker-alt" style="color: #ffc107; font-size: 16px;"></i>',
                            iconSize: [20, 20]
                        })
                    }).addTo(volunteerAreaMap);
                    
                    marker.bindPopup(`
                        <div>
                            <h6>Pickup Request #${pickup.id}</h6>
                            <p class="mb-1"><strong>Items:</strong> ${pickup.items}</p>
                            <p class="mb-1"><strong>Address:</strong> ${pickup.address}</p>
                            <span class="badge bg-warning">Available</span>
                        </div>
                    `);
                });
            }
        })
        .catch(error => {
            console.error('Error loading pickup locations:', error);
            // If API doesn't exist, skip this feature
        });
}

// Load volunteer's own location
function loadVolunteerLocation() {
    // For demo, use a fixed location. In real app, this would come from user profile
    const volunteerLocation = [19.0896, 72.8656]; // Example location in Mumbai
    
    const volunteerMarker = L.marker(volunteerLocation, {
        icon: L.divIcon({
            className: 'volunteer-self-marker',
            html: '<i class="fas fa-user" style="color: #198754; font-size: 18px; background: white; border-radius: 50%; padding: 4px; border: 2px solid #198754;"></i>',
            iconSize: [30, 30]
        })
    }).addTo(volunteerAreaMap);
    
    volunteerMarker.bindPopup(`
        <div>
            <h6><strong>Your Location</strong></h6>
            <p class="mb-0"><i class="fas fa-user-check"></i> Ready to help!</p>
        </div>
    `);
}

// Initialize Volunteer Performance Charts
function initializeVolunteerCharts() {
    createVolunteerProgressChart();
    createResponseTimeChart();
}

// Create Volunteer Progress Chart
function createVolunteerProgressChart() {
    const ctx = document.getElementById('volunteerProgressChart');
    if (!ctx) return;
    
    // Sample data - in real app this would come from API
    const progressData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        completed: [2, 4, 3, 6, 5, 8]
    };
    
    volunteerProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: progressData.labels,
            datasets: [{
                label: 'Requests Completed',
                data: progressData.completed,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#28a745',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Create Response Time Chart
function createResponseTimeChart() {
    const ctx = document.getElementById('responseTimeChart');
    if (!ctx) return;
    
    // Sample data - in real app this would come from API
    const responseData = {
        labels: ['< 1 hour', '1-4 hours', '4-12 hours', '12-24 hours', '> 24 hours'],
        times: [12, 18, 8, 4, 2]
    };
    
    responseTimeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: responseData.labels,
            datasets: [{
                data: responseData.times,
                backgroundColor: [
                    '#28a745', // green for < 1 hour
                    '#17a2b8', // teal for 1-4 hours
                    '#ffc107', // yellow for 4-12 hours
                    '#fd7e14', // orange for 12-24 hours
                    '#dc3545'  // red for > 24 hours
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

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
    
    // Initialize map and charts after DOM is loaded
    setTimeout(() => {
        initializeVolunteerAreaMap();
        initializeVolunteerCharts();
        loadCurrentAvailability();
        initializeAvailabilityForm();
    }, 500);
});