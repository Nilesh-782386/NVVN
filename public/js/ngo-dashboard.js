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

// Chart variables
let donationStatusChart = null;
let monthlyTrendsChart = null;
let volunteersChart = null;
let itemsChart = null;

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

// Initialize Analytics Charts
function initializeAnalyticsCharts() {
    loadAnalyticsData();
}

// Load analytics data and create charts
function loadAnalyticsData() {
    fetch('/api/ngo/analytics-data')
        .then(response => response.json())
        .then(data => {
            createDonationStatusChart(data.statusData);
            createMonthlyTrendsChart(data.monthlyData);
            createVolunteersChart(data.volunteerData);
            createItemsChart(data.itemsData);
        })
        .catch(error => {
            console.error('Error loading analytics data:', error);
            // Create charts with sample data if API fails
            createChartsWithSampleData();
        });
}

// Create Donation Status Distribution Chart
function createDonationStatusChart(data) {
    const ctx = document.getElementById('donationStatusChart');
    if (!ctx) return;
    
    const statusData = data || {
        pending: 15,
        assigned: 8,
        picked_up: 12,
        delivered: 25,
        completed: 18
    };
    
    donationStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Assigned', 'Picked Up', 'Delivered', 'Completed'],
            datasets: [{
                data: [statusData.pending, statusData.assigned, statusData.picked_up, statusData.delivered, statusData.completed],
                backgroundColor: [
                    '#ffc107', // warning (pending)
                    '#17a2b8', // info (assigned)
                    '#007bff', // primary (picked_up)
                    '#28a745', // success (delivered)
                    '#6f42c1'  // purple (completed)
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
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Create Monthly Trends Chart
function createMonthlyTrendsChart(data) {
    const ctx = document.getElementById('monthlyTrendsChart');
    if (!ctx) return;
    
    const monthlyData = data || {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        donations: [12, 18, 25, 30, 22, 35],
        completed: [8, 15, 20, 25, 18, 28]
    };
    
    monthlyTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Total Donations',
                data: monthlyData.donations,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Completed',
                data: monthlyData.completed,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Create Active Volunteers Chart
function createVolunteersChart(data) {
    const ctx = document.getElementById('volunteersChart');
    if (!ctx) return;
    
    const volunteerData = data || {
        labels: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'],
        volunteers: [12, 8, 15, 10, 7]
    };
    
    volunteersChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: volunteerData.labels,
            datasets: [{
                label: 'Active Volunteers',
                data: volunteerData.volunteers,
                backgroundColor: [
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(23, 162, 184, 0.8)',
                    'rgba(0, 123, 255, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(111, 66, 193, 0.8)'
                ],
                borderColor: [
                    '#ffc107',
                    '#17a2b8',
                    '#007bff',
                    '#28a745',
                    '#6f42c1'
                ],
                borderWidth: 2
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
                    beginAtZero: true
                }
            }
        }
    });
}

// Create Items Donated Chart
function createItemsChart(data) {
    const ctx = document.getElementById('itemsChart');
    if (!ctx) return;
    
    const itemsData = data || {
        labels: ['Books', 'Clothes', 'Toys', 'Grains', 'Footwear', 'School Supplies'],
        items: [85, 120, 65, 95, 40, 75]
    };
    
    itemsChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: itemsData.labels,
            datasets: [{
                label: 'Items Donated',
                data: itemsData.items,
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderColor: '#007bff',
                borderWidth: 2,
                pointBackgroundColor: '#007bff',
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
                r: {
                    beginAtZero: true,
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });
}

// Create charts with sample data if API fails
function createChartsWithSampleData() {
    createDonationStatusChart(null);
    createMonthlyTrendsChart(null);
    createVolunteersChart(null);
    createItemsChart(null);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('NGO Dashboard initialized');
    
    // Add tooltips to buttons
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize map and charts after DOM is loaded
    setTimeout(() => {
        initializeNGONetworkMap();
        initializeAnalyticsCharts();
    }, 500);
});