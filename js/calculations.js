// Trip calculation functions
function calculateTrip() {
  // Get values from form
  const baseLocation = document.getElementById('baseLocation').value || "Birmingham";
  const pickup = document.getElementById('pickupLocation').value || currentTrip.pickup;
  const dropoff = document.getElementById('dropoffLocation').value || currentTrip.dropoff;
  const date = document.getElementById('tripDateDisplay').value || currentTrip.date;
  const pickupTime = document.getElementById('tripTime').value || currentTrip.pickupTime;
  const price = parseFloat(document.getElementById('tripPrice').value) || currentTrip.price;
  const fuelCostPer100Miles = parseFloat(document.getElementById('fuelCostPer100Miles').value) || 15.00;
  
  // Validate that we have pickup and dropoff locations
  if (!pickup || !dropoff) {
    showValidationMessage('Please enter both pickup and dropoff locations before calculating.', 'warning');
    return;
  }
  
  // Check for postcode presence and show warnings if missing
  const pickupHasPostcode = hasPostcode(pickup);
  const dropoffHasPostcode = hasPostcode(dropoff);
  
  if (!pickupHasPostcode && !dropoffHasPostcode) {
    showValidationMessage('⚠️ No postcodes detected for pickup or dropoff locations. Results may be less accurate.', 'warning');
  } else if (!pickupHasPostcode) {
    showValidationMessage('⚠️ No postcode detected for pickup location. Consider adding a postcode for better accuracy.', 'warning');
  } else if (!dropoffHasPostcode) {
    showValidationMessage('⚠️ No postcode detected for dropoff location. Consider adding a postcode for better accuracy.', 'warning');
  } else {
    // Both have postcodes - clear any previous warnings
    clearValidationMessage();
  }
  
  // Update current trip
  currentTrip = {
    date,
    pickupTime,
    pickup,
    dropoff,
    price,
    fuelCostPer100Miles
  };

  // Reset route results
  routeResults = {
    baseToPickup: { distance: 0, duration: 0 },
    pickupToDropoff: { distance: 0, duration: 0 },
    dropoffToBase: { distance: 0, duration: 0 }
  };

  // Calculate all three routes and send to Google Maps
  calculateRouteWithDetails(baseLocation, pickup, 'baseToPickup', () => {
    calculateRouteWithDetails(pickup, dropoff, 'pickupToDropoff', () => {
      calculateRouteWithDetails(dropoff, baseLocation, 'dropoffToBase', () => {
        updateResults();
        // Send trip data to Google Maps after calculation
        sendToGoogleMaps(pickup, dropoff);
      });
    });
  });
}

function calculateRouteWithDetails(origin, destination, routeKey, callback) {
  directionsService.route(
    {
      origin: origin,
      destination: destination,
      travelMode: 'DRIVING',
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: 'pessimistic'
      }
    },
    (result, status) => {
      if (status === 'OK') {
        const route = result.routes[0].legs[0];
        const distanceMiles = (route.distance.value / 1609.34).toFixed(1);
        const durationMinutes = Math.round(route.duration.value / 60);
        const durationText = formatMinutesToText(durationMinutes);
        
        routeResults[routeKey] = {
          distance: parseFloat(distanceMiles),
          duration: durationMinutes,
          text: durationText
        };
        
        if (routeKey === 'pickupToDropoff') {
          directionsRenderer.setDirections(result);
        }
      } else {
        // Fallback estimation
        const estimatedDistance = estimateDistance(origin, destination);
        const estimatedDuration = estimateDurationMinutes(estimatedDistance);
        
        routeResults[routeKey] = {
          distance: estimatedDistance,
          duration: estimatedDuration,
          text: formatMinutesToText(estimatedDuration)
        };
      }
      
      callback();
    }
  );
}

function updateResults() {
  console.log('updateResults called', {
    routeResults: routeResults,
    currentTrip: currentTrip
  });
  
  // Calculate totals
  const totalDistance = 
    routeResults.baseToPickup.distance + 
    routeResults.pickupToDropoff.distance + 
    routeResults.dropoffToBase.distance;
    
  const totalTime = 
    routeResults.baseToPickup.duration + 
    routeResults.pickupToDropoff.duration + 
    routeResults.dropoffToBase.duration;
  
  // Check for congestion charge (£15 per day if in zone)
  const pickup = document.getElementById('pickupLocation').value;
  const dropoff = document.getElementById('dropoffLocation').value;
  const hasCongestionCharge = isInCongestionZone(pickup) || isInCongestionZone(dropoff);
  const congestionCharge = hasCongestionCharge ? 15 : 0;
  
  // Calculate financials using the fuel cost per 100 miles
  const fuelCostPerMile = currentTrip.fuelCostPer100Miles / 100;
  const fuelCost = (totalDistance * fuelCostPerMile).toFixed(2);
  const totalExpenses = (parseFloat(fuelCost) + congestionCharge).toFixed(2);
  const profit = (currentTrip.price - parseFloat(totalExpenses)).toFixed(2);
  const profitMargin = ((profit / currentTrip.price) * 100).toFixed(1);
  
  // Price per mile BEFORE expenses (gross)
  const pricePerMileGross = (currentTrip.price / routeResults.pickupToDropoff.distance).toFixed(2);
  
  // Price per hour AFTER expenses (net)
  const pricePerHour = (profit / (totalTime / 60)).toFixed(2);
  
  // Update distance metrics
  document.getElementById('baseToPickupDistance').textContent = 
    `${routeResults.baseToPickup.distance} mi`;
  document.getElementById('pickupToDropoffDistance').textContent = 
    `${routeResults.pickupToDropoff.distance} mi`;
  document.getElementById('dropoffToBaseDistance').textContent = 
    `${routeResults.dropoffToBase.distance} mi`;
  document.getElementById('totalDistance').textContent = 
    `${totalDistance.toFixed(1)} mi`;
  
  // Update time metrics
  document.getElementById('baseToPickupTime').textContent = 
    routeResults.baseToPickup.text;
  document.getElementById('pickupToDropoffTime').textContent = 
    routeResults.pickupToDropoff.text;
  document.getElementById('dropoffToBaseTime').textContent = 
    routeResults.dropoffToBase.text;
  document.getElementById('totalTime').textContent = 
    formatMinutesToText(totalTime);
  
  // Update financial metrics
  document.getElementById('netFare').textContent = `£${currentTrip.price}`;
  if (congestionCharge > 0) {
    document.getElementById('fuelCost').textContent = `£${fuelCost} + £${congestionCharge} CC`;
  } else {
    document.getElementById('fuelCost').textContent = `£${fuelCost}`;
  }
  document.getElementById('estimatedProfit').textContent = `£${profit}`;
  document.getElementById('profitMargin').textContent = `${profitMargin}%`;
  
  // Intelligent Alerts based on profit per hour
  const profitPerHourValue = parseFloat((profit / (totalTime / 60)).toFixed(2));
  const alertBadge = document.getElementById('profitAlert');
  const profitPerHourHeader = document.getElementById('profitPerHourHeader');
  
  // Handle different profit scenarios
  if (profitPerHourValue < 4) {
    alertBadge.innerHTML = '<span class="alert-badge alert-danger">⚠️ LOSS</span>';
    profitPerHourHeader.textContent = `£${profitPerHourValue.toFixed(2)}/hr`;
    profitPerHourHeader.style.color = '#e74c3c';
  } else if (profitPerHourValue < 5) {
    alertBadge.innerHTML = '<span class="alert-badge alert-danger">⚠️ NO PROFIT</span>';
    profitPerHourHeader.textContent = `£${profitPerHourValue.toFixed(2)}/hr`;
    profitPerHourHeader.style.color = '#e74c3c';
  } else if (profitPerHourValue < 10) {
    alertBadge.innerHTML = '<span class="alert-badge alert-danger">🔴 LOW PROFIT</span>';
    profitPerHourHeader.textContent = `£${profitPerHourValue.toFixed(2)}/hr`;
    profitPerHourHeader.style.color = '#e74c3c';
  } else if (profitPerHourValue < 13) {
    alertBadge.innerHTML = '<span class="alert-badge alert-warning">🟡 Medium Profit</span>';
    profitPerHourHeader.textContent = `£${profitPerHourValue.toFixed(2)}/hr`;
    profitPerHourHeader.style.color = '#f39c12';
  } else {
    alertBadge.innerHTML = '<span class="alert-badge alert-success">🟢 High Profit</span>';
    profitPerHourHeader.textContent = `£${profitPerHourValue.toFixed(2)}/hr`;
    profitPerHourHeader.style.color = '#00b894';
  }
  if (congestionCharge > 0) {
    alertBadge.innerHTML += '<span class="alert-badge alert-warning" style="background: #e67e22;">£15 CC</span>';
  }
  
  // Update earnings summary
  document.getElementById('pricePerMile').textContent = `£${pricePerMileGross}`;
  document.getElementById('pricePerHour').textContent = `£${pricePerHour}`;
  document.getElementById('totalProfit').textContent = `£${profit}`;
  
  // Update Total Distance and Total Time in Route Efficiency section
  document.getElementById('totalDistanceEfficiency').textContent = `${totalDistance.toFixed(1)} mi`;
  document.getElementById('totalTimeEfficiency').textContent = formatMinutesToText(totalTime);
  
  // Update Profit Per Hour in Route Efficiency section
  const profitPerHourRouteEff = parseFloat(pricePerHour);
  if (profitPerHourRouteEff <= 0.5 && profitPerHourRouteEff >= -0.5) {
    document.getElementById('pricePerHourRouteEff').textContent = 'No Profit';
    document.getElementById('profitPerHour').textContent = 'No Profit';
  } else if (profitPerHourRouteEff < 0) {
    document.getElementById('pricePerHourRouteEff').textContent = `-£${Math.abs(profitPerHourRouteEff).toFixed(2)}/hr`;
    document.getElementById('profitPerHour').textContent = `-£${Math.abs(profitPerHourRouteEff).toFixed(2)}/hr`;
  } else {
    document.getElementById('pricePerHourRouteEff').textContent = `£${profitPerHourRouteEff.toFixed(2)}/hr`;
    document.getElementById('profitPerHour').textContent = `£${profitPerHourRouteEff.toFixed(2)}/hr`;
  }
  
  // Calculate efficiency score (higher is better)
  const efficiencyScore = parseFloat((currentTrip.price / totalTime * 60).toFixed(2));
  const efficiencyPercent = Math.min((efficiencyScore / 50) * 100, 100); // Cap at £50/hr = 100%
  
  console.log('Route Efficiency Debug:', {
    price: currentTrip.price,
    totalTime: totalTime,
    efficiencyScore: efficiencyScore,
    efficiencyPercent: efficiencyPercent
  });
  
  document.getElementById('grossPerHour').textContent = `£${efficiencyScore.toFixed(2)}/hr`;
  
  // Update efficiency progress (0-100% scale)
  const efficiencyBar = document.getElementById('efficiencyProgress');
  const efficiencyWidth = Math.max(0, efficiencyPercent.toFixed(1));
  efficiencyBar.style.width = `${efficiencyWidth}%`;
  document.getElementById('efficiencyPercent').textContent = `${efficiencyWidth}%`;
  console.log('Efficiency bar width set to:', efficiencyBar.style.width);
  
  // Update profit margin progress bar
  const profitMarginValue = parseFloat(profitMargin);
  const profitMarginProgressWidth = Math.max(0, Math.min(profitMarginValue, 100)); // Cap between 0-100%
  document.getElementById('profitMarginPercent').textContent = `${profitMarginValue.toFixed(1)}%`;
  document.getElementById('profitMarginProgress').style.width = `${profitMarginProgressWidth}%`;
  
  // Update parsed info with calculated totals
  updateParsedInfoFromStandardInput();
}

function estimateDistance(origin, destination) {
  // Simple estimation - in real app use proper geocoding
  return Math.random() * 40 + 10; // 10-50 miles
}

function estimateDurationMinutes(distance) {
  // Estimate minutes based on distance (assuming 40 mph average + traffic)
  return Math.round((distance / 40) * 60 * 1.3); // 30% extra for traffic
}

function formatMinutesToText(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Utility function to check if a location contains a postcode
function hasPostcode(location) {
  if (!location) return false;
  
  // Check for full UK postcode pattern (e.g., "SW1A 0AA" or "M1 1AA")
  const fullPostcodePattern = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\b/i;
  
  // Check for partial postcode pattern (e.g., "SW1A" or "M1")
  const partialPostcodePattern = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\b/i;
  
  return fullPostcodePattern.test(location) || partialPostcodePattern.test(location);
}

// Function to show validation messages
function showValidationMessage(message, type = 'warning') {
  const alertElement = document.getElementById('profitAlert');
  if (alertElement) {
    let alertClass, icon;
    
    if (type === 'error') {
      alertClass = 'alert-danger';
      icon = '❌';
    } else if (type === 'warning') {
      alertClass = 'alert-warning';
      icon = '⚠️';
    } else {
      alertClass = 'alert-warning';
      icon = '⚠️';
    }
    
    alertElement.innerHTML = `<span class="alert-badge ${alertClass}">${icon} ${message}</span>`;
  }
}

// Function to clear validation messages
function clearValidationMessage() {
  const alertElement = document.getElementById('profitAlert');
  if (alertElement) {
    alertElement.innerHTML = '';
  }
}

// Function to send trip data to Google Maps
function sendToGoogleMaps(pickup, dropoff) {
  if (!pickup || !dropoff) {
    console.log('Cannot send to Google Maps: missing pickup or dropoff location');
    return;
  }
  
  try {
    // Create Google Maps URL with directions
    const encodedPickup = encodeURIComponent(pickup);
    const encodedDropoff = encodeURIComponent(dropoff);
    const googleMapsUrl = `https://www.google.com/maps/dir/${encodedPickup}/${encodedDropoff}`;
    
    console.log('Trip data sent to Google Maps:', {
      pickup: pickup,
      dropoff: dropoff,
      url: googleMapsUrl
    });
    
    // Store the URL for potential future use (could be used to open in new tab)
    window.lastGoogleMapsUrl = googleMapsUrl;
    
    // Optionally, you can uncomment the next line to automatically open Google Maps
    // window.open(googleMapsUrl, '_blank');
    
  } catch (error) {
    console.error('Error sending data to Google Maps:', error);
  }
}

function isInCongestionZone(location) {
  const locLower = location.toLowerCase().trim();
  
  // Central London postcodes in congestion charge zone
  const congestionZones = [
    'ec1', 'ec2', 'ec3', 'ec4',
    'wc1', 'wc2',
    'sw1', 'sw1a', 'sw1e', 'sw1h', 'sw1p', 'sw1v', 'sw1w', 'sw1x', 'sw1y',
    'w1', 'w1a', 'w1b', 'w1c', 'w1d', 'w1f', 'w1g', 'w1h', 'w1j', 'w1k', 'w1s', 'w1t', 'w1u', 'w1w',
    'se1', 'se11',
    'e1'
  ];
  
  // Check if location contains central London postcode
  for (const zone of congestionZones) {
    if (locLower.includes(zone)) {
      return true;
    }
  }
  
  // Check for central London landmarks
  const centralLondonKeywords = [
    'westminster', 'piccadilly', 'soho', 'covent garden', 'holborn',
    'city of london', 'shoreditch', 'southwark', 'waterloo',
    'kings cross', 'euston', 'paddington', 'victoria', 'liverpool street'
  ];
  
  for (const keyword of centralLondonKeywords) {
    if (locLower.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}