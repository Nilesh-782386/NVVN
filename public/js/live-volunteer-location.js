// Live volunteer location service
class LiveVolunteerLocation {
    constructor() {
        this.currentLocation = null;
        this.isTracking = false;
    }

    // Get volunteer's live GPS location
    async getLiveLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date(),
                        source: 'live_gps'
                    };
                    
                    // Save to session for consistency
                    sessionStorage.setItem('volunteerLiveLocation', JSON.stringify(this.currentLocation));
                    console.log('📍 Volunteer live location detected:', this.currentLocation);
                    
                    resolve(this.currentLocation);
                },
                (error) => {
                    console.error('❌ Live location error:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0 // Always get fresh location
                }
            );
        });
    }

    // Calculate distance from live location to target coordinates
    calculateDistanceTo(targetLat, targetLng) {
        if (!this.currentLocation) {
            console.log('❌ No live location available');
            return null;
        }

        const distance = this.calculateDistance(
            this.currentLocation.lat,
            this.currentLocation.lng,
            targetLat,
            targetLng
        );

        console.log(`📏 Distance from live location: ${distance.toFixed(1)} km`);
        return distance;
    }

    // Haversine distance calculation
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Initialize live location on page load
    async init() {
        try {
            await this.getLiveLocation();
            this.updateAllDistanceDisplays();
            return this.currentLocation;
        } catch (error) {
            console.error('Failed to initialize live location:', error);
            return null;
        }
    }

    // Update all distance displays on the page
    updateAllDistanceDisplays() {
        // This will be implemented in the specific page files
        console.log('🔄 Updating all distance displays with live location...');
    }
}

// Global instance
window.volunteerLocationService = new LiveVolunteerLocation();
