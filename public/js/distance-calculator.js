// Simple distance calculator for volunteer acceptance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}

// Get volunteer's current location
function getVolunteerLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('📍 Got current location from GPS');
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.log('❌ Geolocation error:', error);
                    // Fallback to volunteer's saved location from profile
                    getSavedVolunteerLocation().then(resolve);
                }
            );
        } else {
            console.log('❌ Geolocation not supported');
            getSavedVolunteerLocation().then(resolve);
        }
    });
}

// Get volunteer's saved location from profile
async function getSavedVolunteerLocation() {
    try {
        console.log('🔄 Getting saved volunteer location...');
        const response = await fetch('/api/volunteer/my-location');
        const data = await response.json();
        
        if (data.success && data.location && data.location.lat !== 0 && data.location.lng !== 0) {
            console.log('📍 Got saved volunteer location:', data.location);
            return data.location;
        } else {
            console.log('❌ No saved location found, using fallback');
            return { lat: 20.5937, lng: 78.9629 }; // Fallback to Nagpur, Maharashtra
        }
    } catch (error) {
        console.log('❌ Error getting saved location:', error);
        return { lat: 20.5937, lng: 78.9629 }; // Fallback to Nagpur, Maharashtra
    }
}

// Get donation coordinates (from data attributes or API)
async function getDonationCoordinates(donationId) {
    // Try to get from data attribute first
    const donationElement = document.querySelector(`[data-donation-id="${donationId}"]`);
    if (donationElement) {
        const lat = parseFloat(donationElement.getAttribute('data-lat'));
        const lng = parseFloat(donationElement.getAttribute('data-lng'));
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            console.log(`📍 Got coordinates from data attributes for donation ${donationId}:`, { lat, lng });
            return { lat, lng };
        }
    }
    
    // Fallback: API call
    try {
        console.log(`🔄 Fetching coordinates from API for donation ${donationId}...`);
        const response = await fetch(`/api/donations/${donationId}/coordinates`);
        const data = await response.json();
        
        if (data.success && data.coordinates) {
            console.log(`📍 Got coordinates from API for donation ${donationId}:`, data.coordinates);
            return data.coordinates;
        } else {
            console.log(`❌ No coordinates found for donation ${donationId}`);
            return null;
        }
    } catch (error) {
        console.log('❌ Error getting donation coordinates:', error);
        return null;
    }
}

// Calculate and display distance for all donation cards
async function calculateAllDistances() {
    console.log('🔄 Calculating distances for all donations...');
    
    // Get volunteer's current location
    const volunteerLocation = await getVolunteerLocation();
    console.log('📍 Volunteer location:', volunteerLocation);
    
    if (!volunteerLocation || volunteerLocation.lat === 0) {
        console.log('❌ No volunteer location available, using fallback location');
        // Use a fallback location (Nagar, Maharashtra)
        volunteerLocation = { lat: 20.5937, lng: 78.9629 };
    }
    
    // Calculate distance for each donation card
    const donationCards = document.querySelectorAll('.donation-request-card');
    console.log(`📊 Found ${donationCards.length} donation cards`);
    
    for (const card of donationCards) {
        const acceptButton = card.querySelector('.btn-accept');
        if (!acceptButton) continue;
        
        const donationId = acceptButton.getAttribute('data-distance-id');
        if (!donationId) continue;
        
        try {
            // First try to get coordinates from data attributes
            const lat = parseFloat(card.getAttribute('data-lat'));
            const lng = parseFloat(card.getAttribute('data-lng'));
            
            let donationCoords = null;
            
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                donationCoords = { lat, lng };
                console.log(`📍 Donation ${donationId} coordinates from data attributes:`, donationCoords);
            } else {
                // Fallback to API call
                donationCoords = await getDonationCoordinates(donationId);
                console.log(`📍 Donation ${donationId} coordinates from API:`, donationCoords);
            }
            
            if (donationCoords && donationCoords.lat && donationCoords.lng) {
                const distance = calculateDistance(
                    volunteerLocation.lat, 
                    volunteerLocation.lng,
                    donationCoords.lat,
                    donationCoords.lng
                );
                
                console.log(`📏 Distance for donation ${donationId}: ${distance.toFixed(1)} km`);
                
                // Update distance display
                updateDistanceDisplay(donationId, distance);
                
                // Add distance to accept button
                addDistanceToAcceptButton(acceptButton, distance);
                
            } else {
                console.log(`❌ No coordinates for donation ${donationId}`);
                showDistanceError(`Unable to get location for donation #${donationId}`);
            }
        } catch (error) {
            console.log(`❌ Error calculating distance for donation ${donationId}:`, error);
            showDistanceError(`Error calculating distance for donation #${donationId}`);
        }
    }
}

// Update distance display in the card
function updateDistanceDisplay(donationId, distance) {
    const distanceElement = document.getElementById(`distance-${donationId}`);
    if (!distanceElement) return;
    
    // Determine distance category and styling
    let distanceClass = 'distance-far';
    let badgeClass = 'far';
    
    if (distance <= 5) {
        distanceClass = 'distance-near';
        badgeClass = 'near';
    } else if (distance <= 15) {
        distanceClass = 'distance-medium';
        badgeClass = 'medium';
    }
    
    // Update the distance display
    distanceElement.innerHTML = `
        <span class="distance-number">${distance.toFixed(1)} KM</span>
        <small class="text-muted">from your current location</small>
    `;
    distanceElement.className = `distance-value ${distanceClass}`;
    
    // Add distance badge to card
    addDistanceBadge(donationId, distance, badgeClass);
}

// Add distance badge to the card
function addDistanceBadge(donationId, distance, badgeClass) {
    const card = document.querySelector(`[data-donation-id="${donationId}"]`);
    if (!card) return;
    
    // Remove existing badge
    const existingBadge = card.querySelector('.distance-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // Add new badge
    const badge = document.createElement('div');
    badge.className = `distance-badge ${badgeClass}`;
    badge.textContent = `${distance.toFixed(1)} km`;
    card.appendChild(badge);
}

// Add distance info to accept button
function addDistanceToAcceptButton(button, distance) {
    const originalText = button.innerHTML;
    button.innerHTML = `
        <i class="fas fa-check"></i> Accept (${distance.toFixed(1)} km)
    `;
    button.setAttribute('data-distance', distance.toFixed(1));
}

// Show distance error
function showDistanceError(message) {
    console.log('❌ Distance error:', message);
    
    // Update all distance displays with error
    document.querySelectorAll('[id^="distance-"]').forEach(element => {
        element.innerHTML = `
            <span class="text-danger">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </span>
        `;
        element.className = 'distance-value distance-error';
    });
}

// Enhanced accept function with distance logging
async function acceptDonationWithDistance(donationId) {
    const acceptButton = document.querySelector(`[data-distance-id="${donationId}"]`);
    const distance = acceptButton ? acceptButton.getAttribute('data-distance') : null;
    
    console.log(`✅ Accepting donation ${donationId} with distance: ${distance} km`);
    
    try {
        const response = await fetch(`/api/assignments/${donationId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accepted_distance: distance ? parseFloat(distance) : null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message with distance
            const message = distance ? 
                `Donation accepted! Distance: ${distance} km` : 
                'Donation accepted!';
            
            showNotification(message, 'success');
            
            // Reload the page to update the dashboard
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotification(result.error || 'Failed to accept donation', 'error');
        }
    } catch (error) {
        console.error('Error accepting donation:', error);
        showNotification('Error accepting donation. Please try again.', 'error');
    }
}

// Initialize distance calculation when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing distance calculation...');
    
    // Add distance calculation to all accept buttons
    document.querySelectorAll('.btn-accept').forEach(button => {
        const donationId = button.getAttribute('onclick')?.match(/acceptRequest\((\d+)\)/)?.[1];
        if (donationId) {
            button.setAttribute('data-distance-id', donationId);
            button.setAttribute('onclick', `acceptDonationWithDistance(${donationId})`);
        }
    });
    
    // Start distance calculation
    calculateAllDistances();
});

// Show distance error message
function showDistanceError(message) {
    console.error('Distance calculation error:', message);
    
    // Show error in the first distance element if available
    const firstDistanceElement = document.querySelector('.distance-value');
    if (firstDistanceElement) {
        firstDistanceElement.innerHTML = `
            <span class="text-danger">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </span>
        `;
    }
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Create notification element
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
