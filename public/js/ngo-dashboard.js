// NGO Dashboard JavaScript

// View donation details
function viewDetails(donationId) {
    // Create modal or navigate to details page
    window.location.href = `/donation/details/${donationId}`;
}

// Mark donation as completed
function markCompleted(donationId) {
    if (confirm('Are you sure you want to mark this donation as completed?')) {
        fetch(`/ngo/complete-donation/${donationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Donation marked as completed!', 'success');
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

// Auto-refresh dashboard data every 30 seconds
setInterval(() => {
    fetch('/api/ngo/dashboard-data')
        .then(response => response.json())
        .then(data => {
            updateDashboardStats(data);
        })
        .catch(error => {
            console.log('Auto-refresh failed:', error);
        });
}, 30000);

// Update dashboard statistics
function updateDashboardStats(data) {
    if (data.stats) {
        const stats = data.stats;
        
        // Update stat cards if values changed
        const statCards = document.querySelectorAll('.stat-content h3');
        if (statCards.length >= 4) {
            if (statCards[0].textContent !== stats.pending.toString()) {
                statCards[0].textContent = stats.pending;
                animateStatCard(statCards[0].parentElement.parentElement);
            }
            if (statCards[1].textContent !== stats.confirmed.toString()) {
                statCards[1].textContent = stats.confirmed;
                animateStatCard(statCards[1].parentElement.parentElement);
            }
            if (statCards[2].textContent !== stats.volunteers.toString()) {
                statCards[2].textContent = stats.volunteers;
                animateStatCard(statCards[2].parentElement.parentElement);
            }
            if (statCards[3].textContent !== stats.completed.toString()) {
                statCards[3].textContent = stats.completed;
                animateStatCard(statCards[3].parentElement.parentElement);
            }
        }
    }
}

// Animate stat card when updated
function animateStatCard(card) {
    card.style.transform = 'scale(1.05)';
    card.style.transition = 'transform 0.3s ease';
    
    setTimeout(() => {
        card.style.transform = 'scale(1)';
    }, 300);
}

// Map variables
let ngoNetworkMap = null;

// Initialize NGO Network Map
function initializeNGONetworkMap() {
    if (document.getElementById('ngoNetworkMap')) {
        // Initialize map centered on India
        ngoNetworkMap = L.map('ngoNetworkMap').setView([20.5937, 78.9629], 5);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(ngoNetworkMap);
        
        // Load NGO locations and volunteer routes
        loadNGOLocations();
        loadVolunteerRoutes();
        
        // Refresh map data every 2 minutes
        setInterval(() => {
            loadVolunteerRoutes();
        }, 120000);
    }
}

// Load NGO locations on map
function loadNGOLocations() {
    fetch('/api/ngo-locations')
        .then(response => response.json())
        .then(data => {
            if (data.ngos) {
                data.ngos.forEach(ngo => {
                    const marker = L.marker([ngo.latitude, ngo.longitude], {
                        icon: L.divIcon({
                            className: 'ngo-marker',
                            html: '<i class="fas fa-home" style="color: #0d6efd; font-size: 18px;"></i>',
                            iconSize: [25, 25]
                        })
                    }).addTo(ngoNetworkMap);
                    
                    marker.bindPopup(`
                        <div>
                            <h6><strong>${ngo.ngo_name}</strong></h6>
                            <p class="mb-1"><i class="fas fa-map-marker-alt"></i> ${ngo.city}, ${ngo.state}</p>
                            <span class="badge bg-success">Verified</span>
                        </div>
                    `);
                });
            }
        })
        .catch(error => {
            console.error('Error loading NGO locations:', error);
        });
}

// Load volunteer routes on map
function loadVolunteerRoutes() {
    fetch('/api/volunteer-routes')
        .then(response => response.json())
        .then(data => {
            if (data.routes) {
                // Clear existing route lines (if any)
                ngoNetworkMap.eachLayer((layer) => {
                    if (layer instanceof L.Polyline && layer.options.className === 'volunteer-route') {
                        ngoNetworkMap.removeLayer(layer);
                    }
                });
                
                // Clear existing volunteer markers
                ngoNetworkMap.eachLayer((layer) => {
                    if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'volunteer-marker') {
                        ngoNetworkMap.removeLayer(layer);
                    }
                });
                
                data.routes.forEach(route => {
                    // Add volunteer marker
                    const volunteerMarker = L.marker([route.volunteer_lat, route.volunteer_lng], {
                        icon: L.divIcon({
                            className: 'volunteer-marker',
                            html: '<i class="fas fa-user" style="color: #198754; font-size: 16px;"></i>',
                            iconSize: [20, 20]
                        })
                    }).addTo(ngoNetworkMap);
                    
                    volunteerMarker.bindPopup(`
                        <div>
                            <h6><strong>${route.volunteer_name}</strong></h6>
                            <p class="mb-1">Status: <span class="badge bg-${getStatusBadgeColor(route.status)}">${route.status}</span></p>
                            <p class="mb-0">→ ${route.ngo_name}</p>
                        </div>
                    `);
                    
                    // Draw route line
                    const routeLine = L.polyline([
                        [route.volunteer_lat, route.volunteer_lng],
                        [route.ngo_lat, route.ngo_lng]
                    ], {
                        color: route.status === 'assigned' ? '#ffc107' : '#fd7e14',
                        weight: 3,
                        opacity: 0.7,
                        className: 'volunteer-route'
                    }).addTo(ngoNetworkMap);
                    
                    routeLine.bindPopup(`
                        <div>
                            <h6>Active Route</h6>
                            <p class="mb-1"><strong>From:</strong> ${route.volunteer_name}</p>
                            <p class="mb-1"><strong>To:</strong> ${route.ngo_name}</p>
                            <p class="mb-0">Status: <span class="badge bg-${getStatusBadgeColor(route.status)}">${route.status}</span></p>
                        </div>
                    `);
                });
            }
        })
        .catch(error => {
            console.error('Error loading volunteer routes:', error);
        });
}

// Helper function for status badge colors
function getStatusBadgeColor(status) {
    switch(status) {
        case 'pending': return 'warning';
        case 'assigned': return 'info';
        case 'picked_up': return 'primary';
        case 'delivered': return 'success';
        case 'completed': return 'success';
        default: return 'secondary';
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('NGO Dashboard initialized');
    
    // Add tooltips to buttons
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize map after DOM is loaded
    setTimeout(() => {
        initializeNGONetworkMap();
    }, 500);
});