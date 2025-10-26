// DISTANCE CALCULATION SERVICE (ADD-ON ONLY)
// Provides live distance calculations without changing existing functionality

class DistanceCalculationService {
  constructor() {
    this.earthRadius = 6371; // Earth radius in km
  }

  // Calculate straight-line distance using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.earthRadius * c;
    
    return distance;
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Estimate route distance (straight distance * route factor)
  estimateRouteDistance(straightDistance, areaType = 'urban') {
    const routeFactors = {
      urban: 1.4,    // Cities have longer routes
      suburban: 1.2, // Suburbs
      rural: 1.1     // Rural areas
    };
    
    return straightDistance * routeFactors[areaType];
  }

  // Estimate travel time based on distance and transport mode
  estimateTravelTime(distance, transportMode = 'car') {
    const speeds = {
      car: 40,    // km/h in city traffic
      bike: 15,   // km/h
      walk: 5     // km/h
    };
    
    const timeHours = distance / speeds[transportMode];
    return Math.round(timeHours * 60); // Convert to minutes
  }

  // Estimate fuel cost (rough calculation)
  estimateFuelCost(distance, vehicleType = 'car') {
    const fuelEfficiency = {
      '2-wheeler': 35, // km/l
      '4-wheeler': 15, // km/l
      'none': 0
    };
    
    const fuelPrice = 100; // Rs per liter (adjust as needed)
    const efficiency = fuelEfficiency[vehicleType] || 15;
    
    if (efficiency === 0) return 0;
    
    const fuelUsed = distance / efficiency;
    return Math.round(fuelUsed * fuelPrice);
  }

  // Get distance category for warnings
  getDistanceCategory(distance) {
    if (distance <= 5) return { level: 'close', color: 'success', icon: '✅' };
    if (distance <= 15) return { level: 'moderate', color: 'info', icon: '📍' };
    if (distance <= 30) return { level: 'far', color: 'warning', icon: '⚠️' };
    return { level: 'very_far', color: 'danger', icon: '🚫' };
  }

  // Generate distance display HTML
  generateDistanceDisplay(distance, routeDistance, transportMode = 'car') {
    const category = this.getDistanceCategory(routeDistance);
    const travelTime = this.estimateTravelTime(routeDistance, transportMode);
    const fuelCost = this.estimateFuelCost(routeDistance);
    
    return `
      <div class="distance-display">
        <div class="row text-center mb-3">
          <div class="col-md-4">
            <div class="metric-card">
              <div class="metric-value text-primary">${distance.toFixed(1)} km</div>
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
          ${this.getDistanceMessage(routeDistance, category.level)}
        </div>
        
        ${fuelCost > 0 ? `
          <div class="cost-info mt-2">
            <small class="text-muted">💰 Estimated fuel cost: ₹${fuelCost}</small>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Get appropriate message based on distance
  getDistanceMessage(distance, level) {
    const messages = {
      close: '<br><small>Great! This is very close to your location.</small>',
      moderate: '<br><small>This is a reasonable distance for pickup.</small>',
      far: '<br><small>This is quite far - consider if you can travel this distance.</small>',
      very_far: '<br><small>Very far - not recommended unless you have specific plans in that area.</small>'
    };
    
    return messages[level] || '';
  }
}

export default new DistanceCalculationService();
