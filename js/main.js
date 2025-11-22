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

// Location database is now loaded from locations.js

function initMap() {
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    draggable: false,
    polylineOptions: { strokeColor: 'blue', strokeWeight: 5 },
  });

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: { lat: 51.5, lng: -0.12 }, // London center
    mapTypeId: 'roadmap'
  });
  directionsRenderer.setMap(map);
  
  // Set default values in form
  document.getElementById('baseLocation').value = "Birmingham";
  document.getElementById('pickupLocation').value = "";
  document.getElementById('dropoffLocation').value = "";
  document.getElementById('tripDate').value = "";
  document.getElementById('tripTime').value = "";
  document.getElementById('tripPrice').value = "";
  document.getElementById('fuelCostPer100Miles').value = "10.00";
  
  // Initialize Google Maps Autocomplete for location inputs
  setupGoogleAutocomplete();
  
  // Add event listeners to standard input fields
  setupInputListeners();
  
  // Update parsed info initially
  updateParsedInfoFromStandardInput();
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
    'tripDateDisplay',
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
  const pickup = document.getElementById('pickupLocation').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.pickup) || '';
  const dropoff = document.getElementById('dropoffLocation').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.dropoff) || '';
  const date = document.getElementById('tripDateDisplay').value || (window.lastParsedFreeStyle && window.lastParsedFreeStyle.date) || '';
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
    if (window.lastParsedFreeStyle.sameDayPayment) {
      extraInfo += '<strong>Same Day Payment:</strong> Yes<br>';
    }
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
  document.getElementById('parsedDetails').innerHTML = `
    <strong>Pickup:</strong> ${pickup || 'Not set'}<br>
    <strong>Dropoff:</strong> ${dropoff || 'Not set'}<br>
    <hr style="margin: 6px 0; border: none; border-top: 1px solid #e0e0e0;">
    <strong>Price:</strong> ${price ? (price.toString().startsWith('£') ? price : '£' + price) : 'Not set'}${paymentOnPOBLabel}<br>
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
    <strong>Profit/h:</strong> ${showNotSpecified ? 'Not Specified' : ((profitPerHour && profitPerHour !== '-' && profitPerHour !== 'Not calculated') ? profitPerHour : 'Not Specified')}
  `;

  // Always show the parsed info section after parsing
  document.getElementById('parsedInfo').style.display = 'block';
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
  // For demonstration, just update the dropoff to base stats visibility
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
  // Only recalculate trip if toggle changes
  calculateTrip();
  // You can add more logic here to update map routes, profit, etc.
  updateParsedInfoFromStandardInput();
}

window.onload = function() {
  loadTheme();
  initMap();
  // Set Return to Base button color to red by default
  const toggleBtn = document.getElementById('returnToBaseToggle');
  if (toggleBtn) {
    toggleBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
    document.getElementById('returnToBaseStatus').textContent = 'OFF';
  }
  // Demo: Show message for Pick Up - TN22 5HB, Drop Off: Heathrow Terminal 5
  showPickupDropoffMessage('TN22 5HB', 'Heathrow Terminal 5');
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