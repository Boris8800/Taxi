// Utility functions for date, sharing, and UI
function updateDateDisplay() {
  const dateInput = document.getElementById('tripDate');
  const dateDisplay = document.getElementById('tripDateDisplay');
  
  if (dateInput.value) {
    const date = new Date(dateInput.value + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    
    if (selectedDate.getTime() === today.getTime()) {
      dateDisplay.value = `${formattedDate} - Today (${dayName})`;
      parsedDateLabel = dateDisplay.value;
    } else if (selectedDate.getTime() === tomorrow.getTime()) {
      dateDisplay.value = `${formattedDate} - Tomorrow (${dayName})`;
      parsedDateLabel = dateDisplay.value;
    } else {
      dateDisplay.value = `${formattedDate} (${dayName})`;
      parsedDateLabel = dateDisplay.value;
    }
  } else {
    dateDisplay.value = '';
    parsedDateLabel = '';
  }
  
  updateParsedInfoFromStandardInput();
}

function convertToISODate(dateStr) {
  // Remove labels like "Tomorrow (Wednesday)" or "Today (Tuesday)"
  let cleanDate = dateStr.replace(/\s*-\s*(Today|Tomorrow)\s*\([^)]+\)/i, '');
  cleanDate = cleanDate.replace(/\s*\([^)]+\)/i, '');
  
  // Parse both "20 Nov" and "20 November" formats
  const shortMatch = cleanDate.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  const fullMatch = cleanDate.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  
  const match = fullMatch || shortMatch;
  if (match) {
    const day = match[1];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames.findIndex(m => m.toLowerCase().startsWith(match[2].toLowerCase().substring(0, 3))) + 1;
    const year = new Date().getFullYear();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return null;
}

window.openInGoogleMaps = openInGoogleMaps;
function openInGoogleMaps() {
  const pickup = document.getElementById('pickupLocation').value;
  const dropoff = document.getElementById('dropoffLocation').value;
  
  if (!pickup || !dropoff) {
    alert('⚠️ Please enter pickup and dropoff locations first!');
    return;
  }
  
  // Create Google Maps URL with waypoints: Current Location → Pickup → Dropoff → Current Location
  // Using "My+Location" for current GPS position
  const waypoint1 = encodeURIComponent(pickup);
  const waypoint2 = encodeURIComponent(dropoff);
  
  // Google Maps URL with avoid=tolls parameter to avoid toll roads
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=My+Location&waypoints=${waypoint1}|${waypoint2}&travelmode=driving&avoid=tolls`;
  
  // Open in new tab
  window.open(mapsUrl, '_blank');
}

window.shareTrip = shareTrip;
function shareTrip() {
  try {
    const pickup = document.getElementById('pickupLocation').value;
    const dropoff = document.getElementById('dropoffLocation').value;
    
    // Check if trip has been calculated
    if (!pickup || !dropoff) {
      alert('⚠️ Please enter pickup and dropoff locations first');
      return;
    }
    
    const totalDistance = document.getElementById('totalDistance').textContent;
    if (totalDistance === '-' || totalDistance === '0.0 mi') {
      alert('⚠️ Please calculate the trip first');
      return;
    }
    
    const date = document.getElementById('tripDateDisplay').value;
    const time = document.getElementById('tripTime').value;
    const price = document.getElementById('tripPrice').value;
    
    // Format display values with fallbacks
    const displayDate = date || 'Not set';
    // Use parsedTimeLabel if available (includes "Landing time" etc.), otherwise just the time
    const displayTime = parsedTimeLabel || time || 'Not set';
    const displayPrice = price || '0';
    
    const totalTime = document.getElementById('totalTime').textContent;
    const profit = document.getElementById('estimatedProfit').textContent;
    const profitMargin = document.getElementById('profitMargin').textContent;
    const profitPerHour = document.getElementById('profitPerHour').textContent;
    
    // Determine profit level
    let profitPerHourValue = 0;
    if (profitPerHour === 'No Profit') {
      profitPerHourValue = 0;
    } else if (profitPerHour.startsWith('-')) {
      profitPerHourValue = -parseFloat(profitPerHour.replace('-£', '').replace('/hr', ''));
    } else {
      profitPerHourValue = parseFloat(profitPerHour.replace('£', '').replace('/hr', ''));
    }
    
    let profitLevel = '';
    if (profitPerHourValue < 4) {
      profitLevel = '⚠️ LOSS';
    } else if (profitPerHourValue < 5) {
      profitLevel = '⚠️ NO PROFIT';
    } else if (profitPerHourValue < 10) {
      profitLevel = '🔴 LOW PROFIT';
    } else if (profitPerHourValue < 13) {
      profitLevel = '🟡 Medium Profit';
    } else {
      profitLevel = '🟢 High Profit';
    }
    
    const summary = `📊 SMART TRIP v1 - Trip Summary\n\n` +
      `📍 Route: ${pickup} → ${dropoff}\n` +
      `📅 Date: ${displayDate} | Time: ${displayTime}\n\n` +
      `💰 Price: £${displayPrice}\n` +
      `📏 Distance: ${totalDistance}\n` +
      `⏱️ Time: ${totalTime}\n\n` +
      `✅ Profit: ${profit} (${profitMargin} margin)\n` +
      `💵 Per Hour: ${profitPerHour} - ${profitLevel}\n\n` +
      `Generated by Boris SMART TRIP v1 `;
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(() => {
        alert('✅ Trip summary copied! ');
      }).catch(err => {
        console.error('Clipboard error:', err);
        fallbackCopy(summary);
      });
    } else {
      fallbackCopy(summary);
    }
  } catch (error) {
    console.error('Share trip error:', error);
    alert('❌ Error: ' + error.message);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    alert('✅ Trip summary copied! ');
  } catch (err) {
    alert('❌ Could not copy. Please copy manually.');
  }
  document.body.removeChild(textArea);
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Update button text and icon
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  
  if (newTheme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light Mode';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark Mode';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Update button text and icon on load
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  
  if (savedTheme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light Mode';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark Mode';
  }
}