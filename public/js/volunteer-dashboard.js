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
    }, 500);
});