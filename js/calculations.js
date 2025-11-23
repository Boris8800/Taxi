// Trip calculation functions
window.calculateTrip = calculateTrip;
function calculateTrip() {
  // Get values from form
  const baseLocation = document.getElementById('baseLocation').value || "Birmingham";
  const pickup = document.getElementById('pickupLocation').value || currentTrip.pickup;
  const dropoff = document.getElementById('dropoffLocation').value || currentTrip.dropoff;
  const date = document.getElementById('tripDateDisplay').value || currentTrip.date;
  const pickupTime = document.getElementById('tripTime').value || currentTrip.pickupTime;
  const price = parseFloat(document.getElementById('tripPrice').value) || currentTrip.price;
  const fuelCostPer100Miles = parseFloat(document.getElementById('fuelCostPer100Miles').value) || 15.00;
  
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

  // Calculate all three routes
  calculateRouteWithDetails(baseLocation, pickup, 'baseToPickup', () => {
    calculateRouteWithDetails(pickup, dropoff, 'pickupToDropoff', () => {
      calculateRouteWithDetails(dropoff, baseLocation, 'dropoffToBase', updateResults);
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
  
  // Calculate totals, respecting Return to Base toggle
  let totalDistance, totalTime;
  if (window.returnToBase !== false) {
    totalDistance = routeResults.baseToPickup.distance + routeResults.pickupToDropoff.distance + routeResults.dropoffToBase.distance;
    totalTime = routeResults.baseToPickup.duration + routeResults.pickupToDropoff.duration + routeResults.dropoffToBase.duration;
  } else {
    totalDistance = routeResults.baseToPickup.distance + routeResults.pickupToDropoff.distance;
    totalTime = routeResults.baseToPickup.duration + routeResults.pickupToDropoff.duration;
  }
  
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
  if (window.returnToBase !== false) {
    document.getElementById('totalDistance').textContent = `${totalDistance.toFixed(1)} mi`;
    document.getElementById('totalTime').textContent = formatMinutesToText(totalTime);
  } else {
    const noReturnTotal = (routeResults.baseToPickup.distance + routeResults.pickupToDropoff.distance).toFixed(1);
    const returnLeg = routeResults.dropoffToBase.distance.toFixed(1);
    document.getElementById('totalDistance').textContent = `${noReturnTotal} mi (-- ${returnLeg} mi)`;
    const noReturnTime = routeResults.baseToPickup.duration + routeResults.pickupToDropoff.duration;
    const returnTime = routeResults.dropoffToBase.duration;
    document.getElementById('totalTime').textContent = `${formatMinutesToText(noReturnTime)} (-- ${formatMinutesToText(returnTime)})`;
  }
  
  // Update time metrics
  document.getElementById('baseToPickupTime').textContent = routeResults.baseToPickup.text || '--';
  document.getElementById('pickupToDropoffTime').textContent = routeResults.pickupToDropoff.text || '--';
  document.getElementById('dropoffToBaseTime').textContent = routeResults.dropoffToBase.text || '--';
  if (window.returnToBase !== false) {
    document.getElementById('totalTime').textContent = formatMinutesToText(totalTime);
  } else {
    const noReturnTime = routeResults.baseToPickup.duration + routeResults.pickupToDropoff.duration;
    const returnTime = routeResults.dropoffToBase.duration;
    document.getElementById('totalTime').textContent = `${formatMinutesToText(noReturnTime)} (-- ${formatMinutesToText(returnTime)})`;
  }
  
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
    // Update Time Table Card
    const baseLocation = document.getElementById('baseLocation').value || "Birmingham";
    const pickupLocation = document.getElementById('pickupLocation').value || currentTrip.pickup;
    const dropoffLocation = document.getElementById('dropoffLocation').value || currentTrip.dropoff;
    const tripDate = document.getElementById('tripDateDisplay').value || currentTrip.date;
    const pickupTime = document.getElementById('tripTime').value || currentTrip.pickupTime;
    // Calculate dropoff time
    let dropoffTime = '-';
    if (pickupTime && routeResults.pickupToDropoff.duration) {
      // pickupTime format: HH:mm
      let [h, m] = pickupTime.split(':').map(Number);
      let dt = new Date();
      dt.setHours(h, m, 0, 0);
      dt.setMinutes(dt.getMinutes() + routeResults.pickupToDropoff.duration);
      dropoffTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Calculate base-to-pickup arrival time (30 min early)
    let startJourney = '-';
    if (pickupTime && routeResults.baseToPickup.duration) {
      let [h, m] = pickupTime.split(':').map(Number);
      let dt = new Date();
      dt.setHours(h, m, 0, 0);
      dt.setMinutes(dt.getMinutes() - routeResults.baseToPickup.duration - 30);
      startJourney = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    document.getElementById('ttBase').textContent = baseLocation || '-';
    document.getElementById('ttPickup').textContent = pickupLocation || '-';
    document.getElementById('ttDropoff').textContent = dropoffLocation || '-';
    document.getElementById('ttStartJourney').textContent = startJourney;
    document.getElementById('ttPickupTime').textContent = pickupTime || '-';
    document.getElementById('ttDropoffTime').textContent = dropoffTime;

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
  
  // Check if location contains central London postcode (match only valid prefixes, not substrings)
  for (const zone of congestionZones) {
    // Match zone at start, after space, or with full word boundary
    const regex = new RegExp(`\\b${zone}\\d?\\b`, 'i');
    if (regex.test(location)) {
      return true;
    }
  }
  
  // Check for central London landmarks
  const centralLondonKeywords = [
    'westminster', 'piccadilly', 'soho', 'covent garden', 'holborn',
    'city of london', 'shoreditch', 'southwark', 'waterloo',
    'kings cross', 'euston', 'paddington', 'victoria', 'liverpool street'
  ];
  // Exclude Heathrow, other airports, and 'london' from CC
  const excludeKeywords = ['heathrow', 'gatwick', 'stansted', 'luton', 'city airport', 'london'];
  for (const keyword of excludeKeywords) {
    if (locLower.includes(keyword)) {
      return false;
    }
  }
  for (const keyword of centralLondonKeywords) {
    if (locLower.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}