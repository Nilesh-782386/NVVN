// Automatic location setup during registration
class RegistrationLocation {
    static init() {
        this.setupLocationConsent();
        this.autoDetectLocation();
        this.enableLocationFeatures();
    }
    
    // Setup location consent for new registrations
    static setupLocationConsent() {
        const registrationForm = document.getElementById('registration-form') || 
                                document.querySelector('form[action*="register"]') ||
                                document.querySelector('form');
        
        if (registrationForm) {
            // Add location consent checkbox (auto-checked)
            const consentHTML = `
                <div class="form-group form-check mt-3">
                    <input type="checkbox" class="form-check-input" id="location-consent" checked>
                    <label class="form-check-label" for="location-consent">
                        ✅ Enable live location tracking for accurate distance calculation
                    </label>
                    <small class="form-text text-muted">
                        This allows the system to calculate exact distances from your current location to donations.
                    </small>
                </div>
            `;
            
            registrationForm.insertAdjacentHTML('beforeend', consentHTML);
        }
    }
    
    // Auto-detect location during registration
    static autoDetectLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const detectedLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    // Store for registration
                    sessionStorage.setItem('registrationLocation', JSON.stringify(detectedLocation));
                    console.log('📍 Location detected during registration:', detectedLocation);
                    
                    this.showLocationDetected(detectedLocation);
                },
                (error) => {
                    console.log('⚠️ Location detection skipped during registration');
                },
                { timeout: 5000 }
            );
        }
    }
    
    // Show location detected message
    static showLocationDetected(location) {
        const consentElement = document.querySelector('#location-consent');
        if (consentElement) {
            const messageHTML = `
                <div class="alert alert-success mt-3">
                    <strong>📍 Location Detected!</strong>
                    <br>Your location has been detected for accurate distance calculation.
                    <small class="text-muted">(${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})</small>
                </div>
            `;
            
            consentElement.insertAdjacentHTML('afterend', messageHTML);
        }
    }
    
    // Enable all location features
    static enableLocationFeatures() {
        // Auto-enable all location-related features
        document.querySelectorAll('[name="live_tracking"], [name="location_services"]').forEach(el => {
            el.checked = true;
        });
    }
}

// Initialize on registration pages
if (window.location.pathname.includes('/register') || 
    window.location.pathname.includes('/volunteer-register') ||
    window.location.pathname.includes('/ngo-register')) {
    document.addEventListener('DOMContentLoaded', () => {
        RegistrationLocation.init();
    });
}
