// --- EVENT HOOKS FOR ANALYZING ---
document.addEventListener('DOMContentLoaded', () => {
  const fsInput = document.getElementById('freeStyleInput');
  if (fsInput) {
    fsInput.addEventListener('input', () => {
      if (fsInput.value.trim().length > 0 && !waitingForLocation) window.triggerAnalyzingStatus();
    });
  }
  // Patch parse buttons
  const parseBtn = document.querySelector('button[onclick*="parseFreeStyle"]');
  if (parseBtn) {
    parseBtn.addEventListener('click', () => {
      if (!waitingForLocation) window.triggerAnalyzingStatus();
    });
  }
  const pasteBtn = document.querySelector('button[onclick*="pasteFromClipboard"]');
  if (pasteBtn) {
    pasteBtn.addEventListener('click', () => {
      if (!waitingForLocation) window.triggerAnalyzingStatus();
    });
  }
});
// Global analyzing state for status card
window.analyzingStatus = false;
window.analyzingTimeout = null;
window.analyzingError = false;

window.triggerAnalyzingStatus = function() {
  window.analyzingStatus = true;
  window.analyzingError = false;
  if (window.analyzingTimeout) clearTimeout(window.analyzingTimeout);
  window.analyzingTimeout = setTimeout(() => {
    window.analyzingStatus = false;
    window.analyzingError = true;
  }, 5000);
}

window.clearAnalyzingStatus = function() {
  window.analyzingStatus = false;
  window.analyzingError = false;
  if (window.analyzingTimeout) clearTimeout(window.analyzingTimeout);
}
// Live day and time display for Trip Details, plus pickup status card (main and summary)
let lastTravelStatus = '';
let waitingForLocation = true;
let lastTravelStatusStyle = '';
let lastTravelStatusUpdate = 0;
let lastTravelStatusPromise = null;

function updateLiveDayTime() {
  const el = document.getElementById('liveDayTime');
  if (el) {
    const now = new Date();
    let d = now.getDate();
    let mo = now.getMonth() + 1;
    let y = now.getFullYear() % 100;
    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    el.textContent = `${d<10?'0':''}${d}.${mo<10?'0':''}${mo}.${y<10?'0':''}${y}. ${h<10?'0':''}${h}.${m<10?'0':''}${m}.${s<10?'0':''}${s}`;
  }

  // Pickup status card logic (main and summary)
  const statusEls = [
    document.getElementById('pickupStatusCard'),
    document.getElementById('pickupStatusCardSummary')
  ];
  // Get pickup time from input (expecting HH:mm or HH.mm or HH:mm:ss)
  const pickupTimeStr = (document.getElementById('tripTime') && document.getElementById('tripTime').value) || '';
  let pickupDateStr = (document.getElementById('tripDate') && document.getElementById('tripDate').value) || '';
  // Try to parse pickup date and time
  let pickupDateTime = null;
  if (pickupTimeStr && pickupDateStr) {
    // Try to parse date in dd.mm.yy. or yyyy-mm-dd
    let y, m, d;
    if (/\d{2}\.\d{2}\.\d{2}/.test(pickupDateStr)) {
      // dd.mm.yy.
      const parts = pickupDateStr.match(/(\d{2})\.(\d{2})\.(\d{2})/);
      if (parts) {
        d = parseInt(parts[1],10);
        m = parseInt(parts[2],10)-1;
        y = 2000+parseInt(parts[3],10);
      }
    } else if (/\d{4}-\d{2}-\d{2}/.test(pickupDateStr)) {
      // yyyy-mm-dd
      const parts = pickupDateStr.split('-');
      y = parseInt(parts[0],10);
      m = parseInt(parts[1],10)-1;
      d = parseInt(parts[2],10);
    } else {
      // fallback: today
      const now = new Date();
      y = now.getFullYear();
      m = now.getMonth();
      d = now.getDate();
    }
    // Parse time (HH:mm or HH.mm or HH:mm:ss)
    let th=0, tm=0;
    let tMatch = pickupTimeStr.match(/(\d{1,2})[:.](\d{2})/);
    if (tMatch) {
      th = parseInt(tMatch[1],10);
      tm = parseInt(tMatch[2],10);
    }
    pickupDateTime = new Date(y, m, d, th, tm, 0);
  }

  // Also show pickup time in summary
  const summaryTimeEl = document.getElementById('summaryPickupTime');
  if (summaryTimeEl) {
    summaryTimeEl.textContent = pickupTimeStr ? `Pickup: ${pickupTimeStr}` : '';
  }

  // Calculate travel time from current location to pickup location
  const pickupLoc = (document.getElementById('pickupLocation') && document.getElementById('pickupLocation').value) || '';
  const fs = document.getElementById('freeStyleInput');

  // 1. If no live location, show 'Waiting for location...'
  if (waitingForLocation) {
    for (const statusEl of statusEls) {
      if (statusEl) statusEl.innerHTML = `<span style="display:inline-block;padding:4px 14px;border-radius:8px;font-weight:700;font-size:13px;background:#ffeaa7;color:#c0392b;">Waiting for location...</span>`;
    }
    // Try to get location (will only run once)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(){
        waitingForLocation = false;
      }, function(){
        waitingForLocation = false;
      });
    } else {
      waitingForLocation = false;
    }
    return;
  }

  // 2. If live location exists, but missing pickup location or time, show 'Enter pickup location and time'
  if (!pickupLoc || !pickupDateTime) {
    let msg = 'Enter pickup location and time';
    // 3. If freestyle input has text, show 'Analizando...'
    if (fs && fs.value.trim().length > 0) {
      msg = 'Analyzing...';
    }
    for (const statusEl of statusEls) {
      if (statusEl) statusEl.innerHTML = `<span style="display:inline-block;padding:4px 14px;border-radius:8px;font-weight:700;font-size:13px;background:#ffeaa7;color:#c0392b;">${msg}</span>`;
    }
    return;
  }

  // 4. If travel time is calculated, show the status card as before
  // Only update travel time every 60 seconds or if pickupLoc changes
  const now = Date.now();
  if (!lastTravelStatusPromise || now - lastTravelStatusUpdate > 59000 || lastTravelStatusPromise.pickupLoc !== pickupLoc) {
    lastTravelStatusPromise = getTravelStatusToPickup(pickupLoc, pickupDateTime);
    lastTravelStatusPromise.pickupLoc = pickupLoc;
    lastTravelStatusUpdate = now;
  }
  lastTravelStatusPromise.then(({status, style, error}) => {
    for (const statusEl of statusEls) {
      if (statusEl) {
        if (error) {
          statusEl.innerHTML = `<span style=\"display:inline-block;padding:4px 14px;border-radius:8px;font-weight:700;font-size:13px;background:#ffeaa7;color:#c0392b;\">${error}</span>`;
        } else {
          statusEl.innerHTML = `<span style=\"display:inline-block;padding:4px 14px;border-radius:8px;font-weight:700;font-size:13px;${style}\">${status}</span>`;
        }
      }
    }
  });
}

async function getTravelStatusToPickup(pickupLoc, pickupDateTime) {
  return new Promise((resolve) => {
    if (!window.google || !window.google.maps) {
      resolve({error:'Google Maps not loaded'});
      return;
    }
    if (!navigator.geolocation) {
      resolve({error:'Geolocation not supported'});
      return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
      waitingForLocation = false;
      const origin = {lat: pos.coords.latitude, lng: pos.coords.longitude};
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix({
        origins: [origin],
        destinations: [pickupLoc],
        travelMode: 'DRIVING',
        unitSystem: window.google.maps.UnitSystem.METRIC
      }, function(response, status) {
        if (status === 'OK' && response.rows && response.rows[0] && response.rows[0].elements && response.rows[0].elements[0].status === 'OK') {
          const durationSec = response.rows[0].elements[0].duration.value;
          const eta = new Date(Date.now() + durationSec*1000);
          const diffMin = Math.round((pickupDateTime - eta)/60000);
          if (diffMin > 15) {
            resolve({status:'On time', style:'background:linear-gradient(135deg,#00b894 0%,#00cec9 100%);color:#fff;'});
          } else if (diffMin >= 0) {
            resolve({status:'Just in time', style:'background:linear-gradient(135deg,#ffd43b 0%,#ffeaa7 100%);color:#333;'});
          } else {
            resolve({status:'Late', style:'background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%);color:#fff;'});
          }
        } else {
          resolve({error:'Could not get travel time'});
        }
      });
    }, function(err) {
      let msg = 'Geolocation denied';
      if (err && err.message) msg = err.message;
      resolve({error:msg});
    });
  });
}

setInterval(updateLiveDayTime, 1000);
updateLiveDayTime();
// Helper function to remove temporal words from location strings
function cleanTemporalWords(location) {
  if (!location) return location;
  
  const temporalWords = [
    'TOMORROW', 'TODAY', 'TONIGHT', 'MORNING', 'AFTERNOON', 'EVENING',
    'ANY CAR', 'ANYCAR', 'SALOON', 'MPV', 'MPVS', 'ESTATE', 'EXEC', 'EXECUTIVE'
  ];
  
  let cleaned = location.trim();
  let iterations = 0;
  const maxIterations = 5; // Prevent infinite loops
  
  // Keep removing temporal/vehicle words from the start until none are found
  let changed = true;
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    
    for (const word of temporalWords) {
      const regex = new RegExp('^' + word + '\\s+', 'gi');
      const before = cleaned;
      cleaned = cleaned.replace(regex, '');
      if (before !== cleaned) {
        changed = true;
      }
    }
  }
  
  console.log('🧹 Cleaning location display:', location, '→', cleaned);
  return cleaned.trim();
}

// Default trip data
const defaultTrip = {
  date: "18 November",
  pickupTime: "19:35",
  pickup: "London Stansted Airport, STN",
  dropoff: "Royal National Hotel, 38-51 Bedford Way, London WC1H 0DG, UK",
  price: 70 // in GBP
};

let currentTrip = {...defaultTrip};
let map, directionsService, directionsRenderer;
let routeResults = {
  baseToPickup: { distance: 0, duration: 0 },
  pickupToDropoff: { distance: 0, duration: 0 },
  dropoffToBase: { distance: 0, duration: 0 }
};
let parsedVehicleType = '';
let parsedDateLabel = '';
let parsedTimeLabel = '';
let returnToBase = false;
window.returnToBase = returnToBase;

// Make directionsService and directionsRenderer globally accessible
window.directionsService = directionsService;
window.directionsRenderer = directionsRenderer;

// Location database is now loaded from locations.js

function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    draggable: false,
    polylineOptions: { strokeColor: 'blue', strokeWeight: 5 },
  });

  // Make them globally accessible after initialization
  window.directionsService = directionsService;
  window.directionsRenderer = directionsRenderer;

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: window.liveLocationCoords ? { lat: window.liveLocationCoords.lat, lng: window.liveLocationCoords.lng } : { lat: 51.5, lng: -0.12 },
    mapTypeId: 'roadmap'
  });
  window.map = map; // Store globally for access in other functions
  directionsRenderer.setMap(map);

  // Set default values in form
  if (window.liveLocationCoords && window.liveLocationCoords.text) {
    document.getElementById('baseLocation').value = window.liveLocationCoords.text;
  } else {
    document.getElementById('baseLocation').value = "Birmingham";
  }
  document.getElementById('pickupLocation').value = "";
  document.getElementById('dropoffLocation').value = "";
  document.getElementById('tripDate').value = "";
  document.getElementById('tripTime').value = "";
  document.getElementById('tripPrice').value = "";
  document.getElementById('fuelCostPer100Miles').value = "10.00";

  // Clear parsed info display
  const parsedInfo = document.getElementById('parsedInfo');
  if (parsedInfo) {
    parsedInfo.style.display = 'none';
  }
  const parsedDetails = document.getElementById('parsedDetails');
  if (parsedDetails) {
    parsedDetails.innerHTML = '';
  }

  // Clear any existing directions on the map
  directionsRenderer.setDirections({routes: []});

  // Show live location marker if available
  addLiveLocationMarker();

  // Initialize Google Maps Autocomplete for location inputs
  setupGoogleAutocomplete();

  // Add event listeners to standard input fields
  setupInputListeners();

  // Update parsed info initially
  updateParsedInfoFromStandardInput();
}

// Helper to add live location marker to map
function addLiveLocationMarker() {
  if (window.liveLocationCoords && map) {
    if (window.liveLocationMarker) {
      window.liveLocationMarker.setMap(null);
    }
    window.liveLocationMarker = new google.maps.Marker({
      position: { lat: window.liveLocationCoords.lat, lng: window.liveLocationCoords.lng },
      map: map,
      title: 'Your Live Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#00b894',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#2d3436'
      }
    });
    map.setCenter({ lat: window.liveLocationCoords.lat, lng: window.liveLocationCoords.lng });
  }
}

function setupGoogleAutocomplete() {
  // Add autocomplete to base location
  const baseInput = document.getElementById('baseLocation');
  const baseAutocomplete = new google.maps.places.Autocomplete(baseInput, {
    componentRestrictions: { country: 'uk' },
    fields: ['formatted_address', 'name']
  });

  // Add autocomplete to pickup location
  const pickupInput = document.getElementById('pickupLocation');
  const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, {
    componentRestrictions: { country: 'uk' },
    fields: ['formatted_address', 'name']
  });

  // Add autocomplete to dropoff location
  const dropoffInput = document.getElementById('dropoffLocation');
  const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, {
    componentRestrictions: { country: 'uk' },
    fields: ['formatted_address', 'name']
  });

  // Update field values when place is selected
  baseAutocomplete.addListener('place_changed', function() {
    const place = baseAutocomplete.getPlace();
    if (place.formatted_address) {
      baseInput.value = place.formatted_address;
    } else if (place.name) {
      baseInput.value = place.name;
    }
    updateParsedInfoFromStandardInput();
  });

  pickupAutocomplete.addListener('place_changed', function() {
    const place = pickupAutocomplete.getPlace();
    if (place.formatted_address) {
      pickupInput.value = place.formatted_address;
    } else if (place.name) {
      pickupInput.value = place.name;
    }
    updateParsedInfoFromStandardInput();
  });

  dropoffAutocomplete.addListener('place_changed', function() {
    const place = dropoffAutocomplete.getPlace();
    if (place.formatted_address) {
      dropoffInput.value = place.formatted_address;
    } else if (place.name) {
      dropoffInput.value = place.name;
    }
    updateParsedInfoFromStandardInput();
  });
}

function setupInputListeners() {
  // Add event listeners to all standard input fields
  const inputFields = [
    'pickupLocation',
    'dropoffLocation', 
    'tripDate',
    'tripTime',
    'tripPrice',
    'baseLocation'
  ];
  
  inputFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', updateParsedInfoFromStandardInput);
      field.addEventListener('change', updateParsedInfoFromStandardInput);
      
      // Add Enter key listener to auto-calculate
      field.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          calculateTrip();
        }
      });
    }
  });
}

function updateParsedInfoFromStandardInput() {
  // Get current values from standard input fields
  let pickup = document.getElementById('pickupLocation').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.pickup) || '';
  let dropoff = document.getElementById('dropoffLocation').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.dropoff) || '';
  
  // CRITICAL: Clean temporal words before displaying
  pickup = cleanTemporalWords(pickup);
  dropoff = cleanTemporalWords(dropoff);
  
  // Copy pickup and dropoff HTML from summary to time table
  const summaryPickupHTML = pickup ? `<a href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickup)}' target='_blank' style='color:#00b894;text-decoration:underline;'>${pickup}</a>` : '-';
  const summaryDropoffHTML = dropoff ? `<a href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropoff)}' target='_blank' style='color:#e67e22;text-decoration:underline;'>${dropoff}</a>` : '-';
  const ttPickup = document.getElementById('ttPickup');
  if (ttPickup) ttPickup.innerHTML = summaryPickupHTML;
  const ttDropoff = document.getElementById('ttDropoff');
  if (ttDropoff) ttDropoff.innerHTML = summaryDropoffHTML;
  const date = document.getElementById('tripDate').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.date) || '';
  const time = document.getElementById('tripTime').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.time) || '';
  const price = document.getElementById('tripPrice').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.price) || '';
  const baseLocation = document.getElementById('baseLocation').value;
  
  // Get total distance and time if calculated
  const totalDistance = document.getElementById('totalDistance').textContent;
  const totalTime = document.getElementById('totalTime').textContent;
  
  // Get profit, CC, and profit per hour if calculated
  const profit = document.getElementById('estimatedProfit').textContent;
  const profitPerHour = document.getElementById('profitPerHour').textContent;
  const fuelCostText = document.getElementById('fuelCost').textContent;
  const hasCongestionCharge = fuelCostText.includes('CC');
  const ccBadge = hasCongestionCharge ? ' <span style="background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">CC £15</span>' : '';

  // If no price/fare info, always show Not Specified for Profit and Profit/h
  let showNotSpecified = false;
  if (!price || price === '-' || price === 'Not set') {
    showNotSpecified = true;
  }

  // Determine profit level badge
  let profitBadge = '';
  if (!showNotSpecified && profitPerHour !== '-' && profitPerHour !== 'Not calculated') {
    let profitPerHourValue = 0;
    if (profitPerHour === 'No Profit') {
      profitPerHourValue = 0;
    } else if (profitPerHour.startsWith('-')) {
      profitPerHourValue = -parseFloat(profitPerHour.replace('-£', '').replace('/hr', ''));
    } else {
      profitPerHourValue = parseFloat(profitPerHour.replace('£', '').replace('/hr', ''));
    }
    if (profitPerHourValue < 4) {
      profitBadge = ' <span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">LOSS</span>';
    } else if (profitPerHourValue < 5) {
      profitBadge = ' <span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">NO PROFIT</span>';
    } else if (profitPerHourValue < 10) {
      profitBadge = ' <span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">LOW</span>';
    } else if (profitPerHourValue < 13) {
      profitBadge = ' <span style="background: #f39c12; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">MEDIUM</span>';
    } else {
      profitBadge = ' <span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">GOOD</span>';
    }
  }

  // Update parsed information display
  const vehicleType = parsedVehicleType || 'Not Specified';

  // Try to get extra parsed info from the freestyle parser if available
  let extraInfo = '';
  if (window.lastParsedFreeStyle) {
    if (window.lastParsedFreeStyle.noPrius) {
      extraInfo += '<strong>No Prius:</strong> Yes<br>';
    }
    if (window.lastParsedFreeStyle.carPark) {
      extraInfo += '<strong>Car Park:</strong> Required<br>';
    }
    // Removed Same Day Payment from summary
  }

  let paymentOnPOBLabel = '';
  let isPOB = false;
  if (window.lastParsedFreeStyle) {
    if (window.lastParsedFreeStyle.paymentOnPOB || (window.lastParsedFreeStyle.extraMessage && window.lastParsedFreeStyle.extraMessage.toLowerCase().includes('payment on pob'))) {
      isPOB = true;
    }
  }
  if (isPOB) {
    paymentOnPOBLabel = ' <span style="background: #00b894; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">Payment on POB</span>';
  }
  
  // Check if payment is cash
  const tripPriceValue = document.getElementById('tripPrice').value || '';
  const isCash = /\bcash\b/i.test(tripPriceValue);
  const cashBadge = isCash ? ' <span style="margin-left: 8px; padding: 4px 12px; background: #e53935; color: white; border-radius: 6px; font-weight: bold; font-size: 13px; animation: flash 1.5s infinite; box-shadow: 0 2px 6px rgba(229, 57, 53, 0.3);">💰 CASH</span>' : '';
  
  document.getElementById('parsedDetails').innerHTML = `
    <strong>Pickup:</strong> ${pickup ? `<a href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickup)}' target='_blank' style='color:#00b894;text-decoration:underline;'>${pickup}</a>` : 'Not set'}<br>
    <strong>Dropoff:</strong> ${dropoff ? `<a href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropoff)}' target='_blank' style='color:#e67e22;text-decoration:underline;'>${dropoff}</a>` : 'Not set'}<br>
    <hr style="margin: 6px 0; border: none; border-top: 1px solid #e0e0e0;">
    <strong>Fare:</strong> ${price ? (price.toString().startsWith('£') ? price : '£' + price) : 'Not set'}${paymentOnPOBLabel}${cashBadge}<br>
    <hr style="margin: 6px 0; border: none; border-top: 1px solid #e0e0e0;">
    <strong>Date:</strong> ${date || 'Not set'}<br>
    <strong>Time:</strong> ${time || 'Not set'}<br>
    <hr style="margin: 6px 0; border: none; border-top: 1px solid #e0e0e0;">
    <strong>Base Location:</strong> ${baseLocation || 'Not set'}<br>
    <strong>Return to Base:</strong> <span style="font-weight:700;color:${returnToBase ? '#00b894' : '#e74c3c'}">${returnToBase ? 'ON' : 'OFF'}</span><br>
    <strong>Vehicle:</strong> ${vehicleType}<br>
    <hr style=\"margin: 6px 0; border: none; border-top: 1px solid #e0e0e0;\">
    ${extraInfo}
    <strong>Total Distance:</strong> ${totalDistance !== '-' ? totalDistance : 'Not calculated'}<br>
    <strong>Total Time:</strong> ${(totalTime && totalTime !== '-' && totalTime !== 'Not calculated') ? totalTime : 'Not Specified'}<br>
    <hr style=\"margin: 6px 0; border: none; border-top: 1px solid #e0e0e0;\">
    <strong>Profit:</strong> ${showNotSpecified ? 'Not Specified' : ((profit && profit !== '-' && profit !== 'Not calculated') ? profit : 'Not Specified')}${profitBadge}${ccBadge}<br>
    <strong>Profit/h:</strong> ${showNotSpecified ? 'Not Specified' : ((profitPerHour && profitPerHour !== '-' && profitPerHour !== 'Not calculated') ? profitPerHour : 'Not Specified')}<br>
    <strong>Profit/Mile:</strong> ${(() => {
      let profitValue = parseFloat((profit || '').replace('£',''));
      let distanceValue = parseFloat((totalDistance || '').replace('mi',''));
      if (!isNaN(profitValue) && !isNaN(distanceValue) && distanceValue > 0) {
        return '£' + (profitValue / distanceValue).toFixed(2);
      } else {
        return 'Not Specified';
      }
    })()}
  `;

  // Only show the parsed info section if there's actual data to display
  const hasData = pickup || dropoff || price || date || time;
  if (hasData) {
    document.getElementById('parsedInfo').style.display = 'block';
  } else {
    document.getElementById('parsedInfo').style.display = 'none';
  }
}

function toggleReturnToBase() {
  returnToBase = !returnToBase;
  window.returnToBase = returnToBase;
  document.getElementById('returnToBaseStatus').textContent = returnToBase ? 'ON' : 'OFF';
  const toggleBtn = document.getElementById('returnToBaseToggle');
  if (!returnToBase) {
    toggleBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
  } else {
    toggleBtn.style.background = 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)';
  }
  updateTripAnalysis();
}

function updateTripAnalysis() {
  // Update map, summary, and statistics based on returnToBase
  // Hide/show the entire metric row for Dropoff → Base (distance and time)
  const dropoffToBaseDistanceRow = document.getElementById('dropoffToBaseDistance').closest('.metric');
  const dropoffToBaseTimeRow = document.getElementById('dropoffToBaseTime').closest('.metric');
  if (returnToBase) {
    dropoffToBaseDistanceRow.style.display = '';
    dropoffToBaseTimeRow.style.display = '';
  } else {
    dropoffToBaseDistanceRow.style.display = 'none';
    dropoffToBaseTimeRow.style.display = 'none';
  }
  
  // Recalculate if we have valid locations
  const pickup = document.getElementById('pickupLocation').value;
  const dropoff = document.getElementById('dropoffLocation').value;
  if (pickup && dropoff) {
    // Recalculate with new toggle state
    updateResults();
  }
  
  updateParsedInfoFromStandardInput();
}

function openInGoogleMaps() {
  // Use 'Current Location' for base in Google Maps navigation
  const base = 'Current Location';
  // Sanitize pickup and dropoff: remove commas, extra spaces, and line breaks
  const pickup = document.getElementById('pickupLocation').value.replace(/,/g, '').replace(/\s+/g, ' ').replace(/\n/g, '').trim();
  const dropoff = document.getElementById('dropoffLocation').value.replace(/,/g, '').replace(/\s+/g, ' ').replace(/\n/g, '').trim();
  
  // Debug logs
  console.log('Pickup:', pickup);
  console.log('Dropoff:', dropoff);
  console.log('Return to Base:', window.returnToBase);
  
  let url;
  if (window.returnToBase !== false) {
    // Return to Base ON: Current Location → pickup → dropoff → Current Location
    url = `https://www.google.com/maps/dir/${encodeURIComponent(base)}/${encodeURIComponent(pickup)}/${encodeURIComponent(dropoff)}/${encodeURIComponent(base)}`;
  } else {
    // Return to Base OFF: Use Directions API format with empty origin for current location
    url = `https://www.google.com/maps/dir/?api=1&origin=&destination=${encodeURIComponent(dropoff)}&waypoints=${encodeURIComponent(pickup)}`;
  }
  
  console.log('Navigation URL:', url);
  window.open(url, '_blank');
}

window.onload = function() {
  loadTheme();
  // Ask user to allow access to live location
  const locationPrompt = document.createElement('div');
  locationPrompt.id = 'locationPrompt';
  locationPrompt.style.position = 'fixed';
  locationPrompt.style.top = '0';
  locationPrompt.style.left = '0';
  locationPrompt.style.width = '100%';
  locationPrompt.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  locationPrompt.style.color = 'white';
  locationPrompt.style.padding = '18px 0';
  locationPrompt.style.textAlign = 'center';
  locationPrompt.style.zIndex = '9999';
  locationPrompt.style.fontSize = '1.1rem';
  locationPrompt.innerHTML = '🚕 Please allow access to your live location for accurate base detection.<br>📍 Recognizing location...';
  document.body.appendChild(locationPrompt);

  // Try to get user's current location and set as base
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      // Use Google Maps Geocoding API to get address from lat/lng
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, function(results, status) {
        let liveLocationText = '';
        if (status === 'OK' && results[0]) {
          liveLocationText = results[0].formatted_address;
        } else {
          liveLocationText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
        // Set base location in Standard Input
        document.getElementById('baseLocation').value = liveLocationText;
        // Set base location in Time Table
        document.getElementById('ttBase').textContent = liveLocationText;
        // Store live location for map marker
        window.liveLocationCoords = { lat, lng, text: liveLocationText };
        
        // Initialize map and wait for it to load
        initMap();
        
        // Remove prompt after map is fully loaded
        google.maps.event.addListenerOnce(window.map, 'idle', function() {
          if (document.body.contains(locationPrompt)) {
            document.body.removeChild(locationPrompt);
          }
        });
        // Set Return to Base OFF by default
        returnToBase = false;
        window.returnToBase = false;
        const toggleBtn = document.getElementById('returnToBaseToggle');
        if (toggleBtn) {
          toggleBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
          document.getElementById('returnToBaseStatus').textContent = 'OFF';
        }
        updateTripAnalysis();
        // Show live location marker on map
        if (window.map && window.liveLocationCoords) {
          if (window.liveLocationMarker) {
            window.liveLocationMarker.setMap(null);
          }
          window.liveLocationMarker = new google.maps.Marker({
            position: { lat: window.liveLocationCoords.lat, lng: window.liveLocationCoords.lng },
            map: window.map,
            title: 'Your Live Location',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#00b894',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#2d3436'
            }
          });
          // Optionally center map on live location
          window.map.setCenter({ lat: window.liveLocationCoords.lat, lng: window.liveLocationCoords.lng });
        }
      });
    }, function(error) {
      locationPrompt.innerHTML = '⚠️ Location access denied. Using default base location.';
      setTimeout(() => {
        if (document.body.contains(locationPrompt)) document.body.removeChild(locationPrompt);
      }, 3500);
      initMap();
      returnToBase = false;
      window.returnToBase = false;
      const toggleBtn = document.getElementById('returnToBaseToggle');
      if (toggleBtn) {
        toggleBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        document.getElementById('returnToBaseStatus').textContent = 'OFF';
      }
      updateTripAnalysis();
    });
  } else {
    // Geolocation not supported
    locationPrompt.innerHTML = '⚠️ Geolocation not supported. Using default base location.';
    setTimeout(() => {
      if (document.body.contains(locationPrompt)) document.body.removeChild(locationPrompt);
    }, 3500);
    initMap();
    returnToBase = false;
    window.returnToBase = false;
    const toggleBtn = document.getElementById('returnToBaseToggle');
    if (toggleBtn) {
      toggleBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
      document.getElementById('returnToBaseStatus').textContent = 'OFF';
    }
    updateTripAnalysis();
  }
};

// Show a message for a given pickup and dropoff (for demo or logic injection)
function showPickupDropoffMessage(pickup, dropoff) {
  // Option 1: Set the fields directly
  document.getElementById('pickupLocation').value = pickup;
  document.getElementById('dropoffLocation').value = dropoff;
  updateParsedInfoFromStandardInput();

  // Option 2: Show an alert or custom message (uncomment if needed)
  // alert(`Pick Up - ${pickup}\nDrop Off: ${dropoff}`);
}