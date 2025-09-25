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

// ===== NOTIFICATION SYSTEM =====

// Global notification variables
let notificationCount = 0;
let notifications = [];

// Toggle notification panel
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        setTimeout(() => {
            panel.classList.add('show');
        }, 10);
        loadNotifications();
    } else {
        closeNotificationPanel();
    }
}

// Close notification panel
function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.remove('show');
    setTimeout(() => {
        panel.style.display = 'none';
    }, 300);
}

// Load notifications from API
function loadNotifications() {
    fetch('/api/notifications/ngo')
        .then(response => response.json())
        .then(data => {
            notifications = data.notifications || [];
            displayNotifications();
            updateNotificationBadge();
        })
        .catch(error => {
            console.error('Error loading notifications:', error);
            // Show sample notifications for demo
            showSampleNotifications();
        });
}

// Display notifications in panel
function displayNotifications() {
    const notificationList = document.getElementById('notificationList');
    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-item text-center text-muted py-4">
                <i class="fas fa-bell-slash fa-2x mb-2"></i>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }
    
    notificationList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" onclick="markAsRead('${notification.id}')">
            <div class="d-flex">
                <div class="notification-icon me-3">
                    <i class="fas ${getNotificationIcon(notification.type)} text-${getNotificationColor(notification.type)}"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${notification.title}</h6>
                    <p class="mb-1 text-muted small">${notification.message}</p>
                    <small class="text-muted">${formatTime(notification.created_at)}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationCount = unreadCount;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Show notification toast
function showNotificationToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('notificationToastContainer');
    const toastId = 'toast_' + Date.now();
    
    const toastHTML = `
        <div id="${toastId}" class="toast show" role="alert" style="min-width: 300px;">
            <div class="toast-header">
                <i class="fas ${getNotificationIcon(type)} text-${getNotificationColor(type)} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small class="text-muted">now</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Auto remove toast after 5 seconds
    setTimeout(() => {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.remove();
        }
    }, 5000);
}

// Mark notification as read
function markAsRead(notificationId) {
    fetch(`/api/notifications/mark-read/${notificationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update local notification status
            notifications = notifications.map(n => 
                n.id === notificationId ? { ...n, read: true } : n
            );
            displayNotifications();
            updateNotificationBadge();
        }
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
}

// Mark all notifications as read
function markAllAsRead() {
    fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            notifications = notifications.map(n => ({ ...n, read: true }));
            displayNotifications();
            updateNotificationBadge();
        }
    })
    .catch(error => {
        console.error('Error marking all notifications as read:', error);
    });
}

// Helper functions for notifications
function getNotificationIcon(type) {
    switch(type) {
        case 'volunteer_assigned': return 'fa-user-check';
        case 'donation_completed': return 'fa-check-circle';
        case 'new_volunteer': return 'fa-user-plus';
        case 'urgent': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch(type) {
        case 'volunteer_assigned': return 'success';
        case 'donation_completed': return 'primary';
        case 'new_volunteer': return 'info';
        case 'urgent': return 'warning';
        default: return 'secondary';
    }
}

function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return time.toLocaleDateString();
}

// Show sample notifications for demo
function showSampleNotifications() {
    notifications = [
        {
            id: '1',
            type: 'volunteer_assigned',
            title: 'New Volunteer Accepted Request',
            message: 'John Doe has accepted a donation request for books and clothes.',
            created_at: new Date(Date.now() - 15 * 60000), // 15 minutes ago
            read: false
        },
        {
            id: '2',
            type: 'donation_completed',
            title: 'Donation Delivered',
            message: 'A donation of toys and stationery has been successfully delivered.',
            created_at: new Date(Date.now() - 2 * 60 * 60000), // 2 hours ago
            read: false
        },
        {
            id: '3',
            type: 'new_volunteer',
            title: 'New Volunteer Registered',
            message: 'Sarah Johnson has registered as a volunteer in Mumbai area.',
            created_at: new Date(Date.now() - 24 * 60 * 60000), // 1 day ago
            read: true
        }
    ];
    
    displayNotifications();
    updateNotificationBadge();
}

// Check for new notifications periodically
function startNotificationPolling() {
    // Check for notifications every 30 seconds
    setInterval(() => {
        checkForNewNotifications();
    }, 30000);
}

// Check for new notifications
function checkForNewNotifications() {
    fetch('/api/notifications/check-new')
        .then(response => response.json())
        .then(data => {
            if (data.hasNew) {
                // Reload notifications and show toast
                loadNotifications();
                showNotificationToast(
                    'New Notification',
                    'You have new notifications!',
                    'info'
                );
            }
        })
        .catch(error => {
            console.log('Error checking for new notifications:', error);
        });
}

// ===== SEARCH & FILTER FUNCTIONALITY =====

// Apply filters to donation table
function applyDonationFilters() {
    const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
    const volunteerSearch = document.getElementById('volunteerSearch').value.toLowerCase();
    const itemTypeFilter = document.getElementById('itemTypeFilter').value.toLowerCase();
    
    const tableRows = document.querySelectorAll('tbody tr');
    let visibleCount = 0;
    
    tableRows.forEach(row => {
        let shouldShow = true;
        
        // Status filter
        if (statusFilter && !row.textContent.toLowerCase().includes(statusFilter)) {
            shouldShow = false;
        }
        
        // Volunteer search
        if (volunteerSearch) {
            const volunteerCell = row.children[3]; // Volunteer column
            if (volunteerCell && !volunteerCell.textContent.toLowerCase().includes(volunteerSearch)) {
                shouldShow = false;
            }
        }
        
        // Item type filter
        if (itemTypeFilter) {
            const itemsCell = row.children[2]; // Items column
            if (itemsCell && !itemsCell.textContent.toLowerCase().includes(itemTypeFilter)) {
                shouldShow = false;
            }
        }
        
        if (shouldShow) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show/hide "no results" message
    showNoResultsMessage(visibleCount === 0);
}

// Show no results message
function showNoResultsMessage(show) {
    let noResultsRow = document.getElementById('noResultsRow');
    
    if (show && !noResultsRow) {
        const tbody = document.querySelector('tbody');
        const colCount = document.querySelector('thead tr').children.length;
        
        noResultsRow = document.createElement('tr');
        noResultsRow.id = 'noResultsRow';
        noResultsRow.innerHTML = `
            <td colspan="${colCount}" class="text-center py-4">
                <i class="fas fa-search fa-2x text-muted mb-3"></i>
                <p class="text-muted">No donations match your filters</p>
                <button class="btn btn-sm btn-outline-primary" onclick="clearAllFilters()">Clear Filters</button>
            </td>
        `;
        tbody.appendChild(noResultsRow);
    } else if (!show && noResultsRow) {
        noResultsRow.remove();
    }
}

// Clear all filters
function clearAllFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('volunteerSearch').value = '';
    document.getElementById('itemTypeFilter').value = '';
    applyDonationFilters();
}

// Add smooth animations to filter changes
function addFilterAnimations() {
    const filterInputs = document.querySelectorAll('#statusFilter, #volunteerSearch, #itemTypeFilter');
    filterInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.transform = 'scale(1.02)';
            this.style.boxShadow = '0 0 0 0.2rem rgba(0, 123, 255, 0.25)';
            this.style.transition = 'all 0.2s ease';
        });
        
        input.addEventListener('blur', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '';
        });
    });
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
        
        // Initialize notification system
        loadNotifications();
        startNotificationPolling();
        
        // Initialize search and filter functionality
        addFilterAnimations();
    }, 500);
});