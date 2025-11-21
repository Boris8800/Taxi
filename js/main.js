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
  const pickup = document.getElementById('pickupLocation').value;
  const dropoff = document.getElementById('dropoffLocation').value;
  const date = document.getElementById('tripDateDisplay').value;
  const time = document.getElementById('tripTime').value;
  const price = document.getElementById('tripPrice').value;
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

  document.getElementById('parsedDetails').innerHTML = `
    <strong>Pickup:</strong> ${pickup || 'Not set'}<br>
    <strong>Dropoff:</strong> ${dropoff || 'Not set'}<br>
    <strong>Price:</strong> ${price ? '£' + price : 'Not set'}<br>
    <strong>Date:</strong> ${date || 'Not set'}<br>
    <strong>Time:</strong> ${time || 'Not set'}<br>
    <strong>Base Location:</strong> ${baseLocation || 'Not set'}<br>
    <strong>Vehicle:</strong> ${vehicleType}<br>
    ${extraInfo}
    <strong>Total Distance:</strong> ${totalDistance !== '-' ? totalDistance : 'Not calculated'}<br>
    <strong>Total Time:</strong> ${(totalTime && totalTime !== '-' && totalTime !== 'Not calculated') ? totalTime : 'Not Specified'}<br>
    <strong>Profit:</strong> ${showNotSpecified ? 'Not Specified' : ((profit && profit !== '-' && profit !== 'Not calculated') ? profit : 'Not Specified')}${profitBadge}${ccBadge}<br>
    <strong>Profit/h:</strong> ${showNotSpecified ? 'Not Specified' : ((profitPerHour && profitPerHour !== '-' && profitPerHour !== 'Not calculated') ? profitPerHour : 'Not Specified')}
  `;

  // Show the parsed info section
  document.getElementById('parsedInfo').style.display = 'block';
}

window.onload = function() {
  loadTheme();
  initMap();
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