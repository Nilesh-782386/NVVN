// LIVE DISTANCE DISPLAY (ADD-ON ONLY)
// Shows real-time distance calculation during donation acceptance

(function() {
  'use strict';
  
  let distanceCalculator = null;
  let currentVolunteerLocation = null;
  let currentDonationLocation = null;

  // Initialize distance display when page loads
  document.addEventListener('DOMContentLoaded', function() {
    initializeDistanceDisplay();
  });

  function initializeDistanceDisplay() {
    // Check if we're on a donation details page
    const donationLat = getDonationLatitude();
    const donationLng = getDonationLongitude();
    
    if (donationLat && donationLng) {
      currentDonationLocation = { lat: donationLat, lng: donationLng };
      startDistanceCalculation();
    }
  }

  // Get donation coordinates from page data
  function getDonationLatitude() {
    // Try to get from data attributes or global variables
    const latElement = document.querySelector('[data-donation-lat]');
    if (latElement) return parseFloat(latElement.dataset.donationLat);
    
    // Try to get from global variable
    if (window.donationData && window.donationData.latitude) {
      return parseFloat(window.donationData.latitude);
    }
    
    return null;
  }

  function getDonationLongitude() {
    const lngElement = document.querySelector('[data-donation-lng]');
    if (lngElement) return parseFloat(lngElement.dataset.donationLng);
    
    if (window.donationData && window.donationData.longitude) {
      return parseFloat(window.donationData.longitude);
    }
    
    return null;
  }

  // Start the distance calculation process
  function startDistanceCalculation() {
    showLoadingState();
    
    // Try to get volunteer's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentVolunteerLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'gps'
          };
          calculateAndDisplayDistance();
        },
        (error) => {
          console.log('GPS not available, trying saved location...');
          getSavedLocation();
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 300000 
        }
      );
    } else {
      getSavedLocation();
    }
  }

  // Get volunteer's saved location as fallback
  async function getSavedLocation() {
    try {
      const response = await fetch('/api/volunteer/my-location');
      const data = await response.json();
      
      if (data.location && data.location.lat && data.location.lng) {
        currentVolunteerLocation = {
          ...data.location,
          source: 'profile',
          accuracy: 1000
        };
        calculateAndDisplayDistance();
      } else {
        showLocationError();
      }
    } catch (error) {
      console.error('Failed to get saved location:', error);
      showLocationError();
    }
  }

  // Calculate and display distance information
  function calculateAndDisplayDistance() {
    if (!currentVolunteerLocation || !currentDonationLocation) {
      showLocationError();
      return;
    }

    // Calculate distances
    const straightDistance = calculateDistance(
      currentVolunteerLocation.lat,
      currentVolunteerLocation.lng,
      currentDonationLocation.lat,
      currentDonationLocation.lng
    );

    const routeDistance = estimateRouteDistance(straightDistance);
    const travelTime = estimateTravelTime(routeDistance);
    const fuelCost = estimateFuelCost(routeDistance);

    // Display the information
    displayDistanceInfo(straightDistance, routeDistance, travelTime, fuelCost);
    updateAcceptButton(routeDistance);
  }

  // Calculate straight-line distance using Haversine formula
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Estimate route distance (straight distance * factor)
  function estimateRouteDistance(straightDistance) {
    const routeFactor = 1.3; // Adjust based on area type
    return straightDistance * routeFactor;
  }

  // Estimate travel time
  function estimateTravelTime(distance) {
    const avgSpeed = 35; // km/h in city traffic
    return Math.round((distance / avgSpeed) * 60); // minutes
  }

  // Estimate fuel cost
  function estimateFuelCost(distance) {
    const fuelPrice = 100; // Rs per liter
    const efficiency = 15; // km/l
    const fuelUsed = distance / efficiency;
    return Math.round(fuelUsed * fuelPrice);
  }

  // Display distance information
  function displayDistanceInfo(straightDistance, routeDistance, travelTime, fuelCost) {
    const distanceInfo = document.getElementById('distanceInfo');
    if (!distanceInfo) return;

    const category = getDistanceCategory(routeDistance);
    
    const html = `
      <div class="distance-metrics">
        <div class="row text-center mb-3">
          <div class="col-md-4">
            <div class="metric-card">
              <div class="metric-value text-primary">${straightDistance.toFixed(1)} km</div>
              <div class="metric-label">Straight Line</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="metric-card">
              <div class="metric-value text-${category.color}">${routeDistance.toFixed(1)} km</div>
              <div class="metric-label">Estimated Route</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="metric-card">
              <div class="metric-value text-info">${travelTime} min</div>
              <div class="metric-label">Travel Time</div>
            </div>
          </div>
        </div>
        
        <div class="alert alert-${category.color}">
          <strong>${category.icon} Distance: ${routeDistance.toFixed(1)} km</strong>
          ${getDistanceMessage(routeDistance, category.level)}
        </div>
        
        <div class="location-info mt-2">
          <small class="text-muted">
            📍 Your location: ${currentVolunteerLocation.source === 'gps' ? 'GPS (Accurate)' : 'Saved Location (Approximate)'}
          </small>
        </div>
        
        ${fuelCost > 0 ? `
          <div class="cost-info mt-2">
            <small class="text-muted">💰 Estimated fuel cost: ₹${fuelCost}</small>
          </div>
        ` : ''}
      </div>
    `;

    distanceInfo.innerHTML = html;
  }

  // Get distance category
  function getDistanceCategory(distance) {
    if (distance <= 5) return { level: 'close', color: 'success', icon: '✅' };
    if (distance <= 15) return { level: 'moderate', color: 'info', icon: '📍' };
    if (distance <= 30) return { level: 'far', color: 'warning', icon: '⚠️' };
    return { level: 'very_far', color: 'danger', icon: '🚫' };
  }

  // Get distance message
  function getDistanceMessage(distance, level) {
    const messages = {
      close: '<br><small>Great! This is very close to your location.</small>',
      moderate: '<br><small>This is a reasonable distance for pickup.</small>',
      far: '<br><small>This is quite far - consider if you can travel this distance.</small>',
      very_far: '<br><small>Very far - not recommended unless you have specific plans in that area.</small>'
    };
    
    return messages[level] || '';
  }

  // Update accept button based on distance
  function updateAcceptButton(distance) {
    const acceptBtn = document.getElementById('acceptBtn');
    const warningDiv = document.getElementById('distanceWarning');
    
    if (!acceptBtn) return;

    const maxPreferredDistance = getMaxPreferredDistance();
    
    if (distance > maxPreferredDistance) {
      if (warningDiv) {
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `
          <strong>⚠️ Beyond Your Preferred Range:</strong> 
          This donation is ${distance.toFixed(1)} km away (your max: ${maxPreferredDistance} km).
          <br><small>Consider if you can make this trip before accepting.</small>
        `;
      }
      
      acceptBtn.innerHTML = `🚗 Accept Long Distance (${distance.toFixed(1)} km)`;
      acceptBtn.className = acceptBtn.className.replace('btn-success', 'btn-warning');
    } else {
      if (warningDiv) {
        warningDiv.style.display = 'none';
      }
      
      acceptBtn.innerHTML = `✅ Accept Donation (${distance.toFixed(1)} km)`;
      acceptBtn.className = acceptBtn.className.replace('btn-warning', 'btn-success');
    }
  }

  // Get volunteer's preferred max distance
  function getMaxPreferredDistance() {
    // Try to get from localStorage or use default
    return parseInt(localStorage.getItem('preferredMaxDistance')) || 15;
  }

  // Show loading state
  function showLoadingState() {
    const distanceInfo = document.getElementById('distanceInfo');
    if (!distanceInfo) return;

    distanceInfo.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Calculating distance...</span>
        </div>
        <p class="mt-2">Calculating distance from your location...</p>
      </div>
    `;
  }

  // Show location error
  function showLocationError() {
    const distanceInfo = document.getElementById('distanceInfo');
    if (!distanceInfo) return;

    distanceInfo.innerHTML = `
      <div class="alert alert-warning">
        <strong>⚠️ Location Not Available</strong><br>
        <small>Unable to calculate distance. Please ensure your location is set in your profile or enable location access.</small>
      </div>
    `;
  }

  // Enhanced accept donation function with distance logging
  window.acceptDonationWithDistance = function() {
    if (!currentVolunteerLocation || !currentDonationLocation) {
      alert('Unable to calculate distance. Please try again.');
      return;
    }

    const distance = calculateDistance(
      currentVolunteerLocation.lat,
      currentVolunteerLocation.lng,
      currentDonationLocation.lat,
      currentDonationLocation.lng
    );

    const routeDistance = estimateRouteDistance(distance);
    const travelTime = estimateTravelTime(routeDistance);

    // Show confirmation for long distances
    if (routeDistance > getMaxPreferredDistance()) {
      showLongDistanceConfirmation(routeDistance, travelTime);
    } else {
      proceedWithAcceptance(routeDistance, travelTime);
    }
  };

  // Show confirmation modal for long distances
  function showLongDistanceConfirmation(distance, travelTime) {
    const modalHTML = `
      <div class="modal fade" id="distanceWarningModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header alert-warning">
              <h5 class="modal-title">⚠️ Long Distance Alert</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>This donation is <strong>${distance.toFixed(1)} km</strong> away from your location.</p>
              <p>Estimated travel time: <strong>${travelTime} minutes</strong></p>
              <div class="alert alert-info">
                <strong>Consider:</strong><br>
                • Fuel/travel costs<br>
                • Time required<br>
                • Vehicle suitability<br>
                • Return trip
              </div>
              <p>Are you sure you want to accept this assignment?</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" onclick="proceedWithAcceptance(${distance}, ${travelTime})">
                ✅ Yes, I Can Travel This Distance
              </button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                ❌ No, Too Far
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('distanceWarningModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    new bootstrap.Modal(document.getElementById('distanceWarningModal')).show();
  }

  // Proceed with acceptance
  window.proceedWithAcceptance = function(distance, travelTime) {
    // Close modal
    const modal = document.getElementById('distanceWarningModal');
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }

    // Call the original accept function with distance data
    if (window.originalAcceptDonation) {
      window.originalAcceptDonation(distance, travelTime);
    } else {
      // Fallback to standard acceptance
      alert(`Donation accepted! Distance: ${distance.toFixed(1)} km, Travel time: ${travelTime} min`);
    }
  };

})();
