// Live Tracking JavaScript (ADD-ON ONLY)
// Real-time location tracking for volunteers

let currentMap = null;
let trackingInterval = null;
let volunteerMarker = null;

// Initialize map with donor and NGO locations
function initLiveMap(donorCoords, ngoCoords) {
    const map = L.map('liveMap').setView([donorCoords.lat, donorCoords.lng], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add donor marker
    L.marker([donorCoords.lat, donorCoords.lng])
        .addTo(map)
        .bindPopup('<b>📍 Donor Location</b><br>' + donorCoords.address)
        .openPopup();
    
    // Add NGO marker
    L.marker([ngoCoords.lat, ngoCoords.lng])
        .addTo(map)
        .bindPopup('<b>🏢 NGO Location</b><br>' + ngoCoords.address);
    
    return map;
}

// Start live location tracking
function startLiveTracking(assignmentId) {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    // Update location every 30 seconds
    trackingInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Send to server
                try {
                    const response = await fetch('/api/live-tracking/location', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            assignment_id: assignmentId,
                            lat: lat,
                            lng: lng
                        })
                    });
                    
                    if (response.ok) {
                        // Update map with volunteer location
                        updateVolunteerMarker(lat, lng);
                        console.log('Location updated successfully');
                    } else {
                        console.error('Failed to update location');
                    }
                } catch (error) {
                    console.error('Failed to send location:', error);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                if (error.code === 1) {
                    alert('Location access denied. Please enable location services and refresh the page.');
                }
            },
            { 
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }, 30000); // Every 30 seconds
    
    // Do immediate first update
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
            const response = await fetch('/api/live-tracking/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignment_id: assignmentId, lat: lat, lng: lng })
            });
            
            if (response.ok) {
                updateVolunteerMarker(lat, lng);
                console.log('Initial location updated');
            }
        } catch (error) {
            console.error('Failed to send initial location:', error);
        }
    }, (error) => {
        console.error('Initial geolocation error:', error);
    }, { enableHighAccuracy: true });
}

// Stop live tracking
function stopLiveTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
        console.log('Live tracking stopped');
    }
}

// Update volunteer marker on map
function updateVolunteerMarker(lat, lng) {
    // Remove existing volunteer marker
    if (volunteerMarker) {
        currentMap.removeLayer(volunteerMarker);
    }
    
    // Add new volunteer marker with custom icon
    const volunteerIcon = L.divIcon({
        className: 'volunteer-marker',
        html: '<div style="background-color: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    volunteerMarker = L.marker([lat, lng], { icon: volunteerIcon })
        .addTo(currentMap)
        .bindPopup('<b>🚶 Volunteer Current Location</b><br>Last updated: ' + new Date().toLocaleTimeString());
    
    // Center map on volunteer location
    currentMap.setView([lat, lng], currentMap.getZoom());
}

// Load volunteer location for NGO tracking
async function loadVolunteerLocation(assignmentId) {
    try {
        const response = await fetch(`/api/live-tracking/volunteer-location/${assignmentId}`);
        const location = await response.json();
        
        if (location) {
            if (!currentMap) {
                // Initialize map first time
                currentMap = L.map('trackingMap').setView([location.lat, location.lng], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(currentMap);
            }
            
            // Update or add volunteer marker
            if (volunteerMarker) {
                volunteerMarker.setLatLng([location.lat, location.lng]);
            } else {
                const volunteerIcon = L.divIcon({
                    className: 'volunteer-marker',
                    html: '<div style="background-color: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                
                volunteerMarker = L.marker([location.lat, location.lng], { icon: volunteerIcon })
                    .addTo(currentMap)
                    .bindPopup('🚶 Volunteer Current Location')
                    .openPopup();
            }
            
            // Update last updated time
            const lastUpdateElement = document.getElementById('lastUpdate');
            if (lastUpdateElement) {
                lastUpdateElement.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
            }
            
            return true;
        } else {
            console.log('Volunteer location not available yet');
            return false;
        }
    } catch (error) {
        console.error('Error loading volunteer location:', error);
        return false;
    }
}

// Initialize tracking for NGO view
function initNGOTracking(assignmentId) {
    // Load initial location
    loadVolunteerLocation(assignmentId);
    
    // Refresh location every 30 seconds
    setInterval(() => {
        loadVolunteerLocation(assignmentId);
    }, 30000);
    
    // Manual refresh button
    const refreshButton = document.getElementById('refreshLocation');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadVolunteerLocation(assignmentId);
        });
    }
}
