// Utility functions for date, sharing, and UI
function updateDateDisplay() {
  const dateInput = document.getElementById('tripDate');
  const dateDisplay = document.getElementById('tripDate');
  
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
    if (!pickup || !dropoff) {
      alert('⚠️ Please enter pickup and dropoff locations first');
      return;
    }
    const totalDistance = document.getElementById('totalDistance').textContent;
    if (totalDistance === '-' || totalDistance === '0.0 mi') {
      alert('⚠️ Please calculate the trip first');
      return;
    }
    const date = document.getElementById('tripDate').value;
    const time = document.getElementById('tripTime').value;
    const price = document.getElementById('tripPrice').value;
    const displayDate = date || 'Not set';
    const displayTime = parsedTimeLabel || time || 'Not set';
    const displayPrice = price || '0';
    const totalTime = document.getElementById('totalTime').textContent;
    const profit = document.getElementById('estimatedProfit').textContent;
    const profitMargin = document.getElementById('profitMargin').textContent;
    const profitPerHour = document.getElementById('profitPerHour').textContent;
    const tripPriceValue = document.getElementById('tripPrice').value || '';
    const isCash = /\bcash\b/i.test(tripPriceValue);
    const cashBadge = isCash ? ' 💰 CASH' : '';
    // Timetable (simple: base → pickup → dropoff → base)
    const base = document.getElementById('baseLocation').value || 'Base';
    const returnToBase = window.returnToBase ? 'ON' : 'OFF';
    // Helper to make address clickable
    function addressLink(addr) {
      if (!addr) return '';
      return `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank">${addr}</a>`;
    }

    // Helper to parse time in HH:mm or H:mm
    function parseTime24(str) {
      const m = str.match(/(\d{1,2}):(\d{2})/);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      let min = parseInt(m[2], 10);
      return h * 60 + min;
    }
    // Helper to format minutes as HH:mm (24h)
    function formatTime24(mins) {
      let h = Math.floor(mins / 60) % 24;
      let m = mins % 60;
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    // Calculate arrival times
    let startMins = parseTime24(displayTime) || 0;
    let pickupMins = startMins + 15; // Base → Pickup (+15 min)
    let dropoffMins = pickupMins;
    let returnMins = pickupMins;
    // Try to extract durations in minutes from totalTime (e.g. "1h 20m" or "45m")
    function parseDuration(str) {
      let m = str.match(/(\d+)\s*h/);
      let h = m ? parseInt(m[1], 10) : 0;
      m = str.match(/(\d+)\s*m/);
      let min = m ? parseInt(m[1], 10) : 0;
      return h * 60 + min;
    }
    let totalTripMins = parseDuration(totalTime);
    // Assume half the time to pickup, half to dropoff, and same for return
    let pickupDuration = Math.round(totalTripMins / (window.returnToBase ? 3 : 2));
    let dropoffDuration = Math.round(totalTripMins / (window.returnToBase ? 3 : 2));
    let returnDuration = window.returnToBase ? totalTripMins - pickupDuration - dropoffDuration : 0;
    dropoffMins = pickupMins + pickupDuration + 15; // Pickup → Dropoff (+15 min)
    returnMins = dropoffMins + dropoffDuration + (window.returnToBase ? 15 : 0); // Dropoff → Base (+15 min if returning)
    let baseReturnMins = returnMins + returnDuration;

    // HTML content for the panel
    const html = `<!DOCTYPE html><html><head><title>Trip Route & Timetable</title>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Segoe+UI:400,700&display=swap">
    <style>
      :root {
        --bg-primary: #f5f7fa;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f8f9fa;
        --bg-gradient-start: #fff3cd;
        --bg-gradient-end: #ffeaa7;
        --text-primary: #333;
        --text-secondary: #2d3748;
        --text-tertiary: #4a5568;
        --border-color: #e2e8f0;
        --shadow-light: rgba(0,0,0,0.1);
        --shadow-medium: rgba(0,0,0,0.2);
      }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        margin: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        min-height: 100vh;
      }
      .route-panel-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        border-radius: 16px;
        box-shadow: 0 4px 24px var(--shadow-medium);
        max-width: 600px;
        margin: 24px auto 0 auto;
        padding: 24px 16px 18px 16px;
        position: relative;
      }
      @media (max-width: 700px) {
        .route-panel-container {
          max-width: 98vw;
          padding: 10vw 2vw 4vw 2vw;
        }
        h2 { font-size: 1.3rem; }
        .section { font-size: 1rem; }
        th, td { font-size: 0.98rem; padding: 8px 6px; }
        .download-btn { font-size: 1rem; padding: 10px 10vw; }
      }
      h2 {
        font-size: 2rem;
        margin-bottom: 18px;
        letter-spacing: 1px;
        font-weight: 700;
        text-shadow: 0 2px 8px #0002;
      }
      .section {
        margin-bottom: 18px;
        font-size: 1.08rem;
        color: #fffbe7;
      }
      .profit { font-weight: bold; color: #00e676; }
      .loss { font-weight: bold; color: #ff5252; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 18px 0 10px 0;
        background: rgba(255,255,255,0.08);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 8px var(--shadow-light);
        word-break: break-word;
      }
      th, td {
        border: none;
        padding: 12px 14px;
        text-align: left;
        font-size: 1rem;
      }
      th {
        background: #ffeaa7;
        color: #333;
        font-weight: 700;
        letter-spacing: 1px;
      }
      tr:nth-child(even) td {
        background: rgba(255,255,255,0.06);
      }
      tr:nth-child(odd) td {
        background: rgba(255,255,255,0.13);
      }
      a {
        color: #ffeaa7;
        text-decoration: underline;
        font-weight: 600;
        word-break: break-all;
      }
      .download-btn {
        margin: 18px 0 0 0;
        padding: 12px 24px;
        background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 1.1rem;
        cursor: pointer;
        font-weight: 700;
        box-shadow: 0 2px 8px var(--shadow-light);
        transition: background 0.2s;
      }
      .download-btn:hover {
        background: linear-gradient(135deg, #128c7e 0%, #25d366 100%);
      }
      .footer {
        margin-top: 32px;
        color: #ffeaa7;
        font-size: 0.95rem;
        text-align: right;
        opacity: 0.8;
      }
    </style></head><body>` +
    `<div class='route-panel-container'>` +
    `<span id='liveDayTimePanel' style="display:block; text-align:right; font-size:15px; font-weight:600; margin-bottom:8px;">
      <span id='panelClock'></span>
      <span id='panelPickupStatusCardClock' style="margin-left:8px;display:inline-block;vertical-align:middle;"></span>
    </span>` +
    `<h2>🚕 Route Control Panel</h2>` +
    `<div class='section'><b>Route:</b> ${addressLink(base)} → ${addressLink(pickup)} → ${addressLink(dropoff)}${window.returnToBase ? ' → ' + addressLink(base) : ''}</div>` +
    `<div class='section'><b>Date:</b> ${displayDate} &nbsp; <b>Time:</b> ${displayTime} <span style='color:#ffeaa7'>(24h)</span></div>` +
    `<div class='section'><b>Fare:</b> £${displayPrice}${cashBadge} &nbsp; <b>Distance:</b> ${totalDistance} &nbsp; <b>Duration:</b> ${totalTime}</div>` +
    `<div class='section'><b>Profit:</b> <span class='${profit.startsWith('-') ? 'loss' : 'profit'}'>${profit}</span> (${profitMargin} margin) &nbsp; <b>Per Hour:</b> ${profitPerHour}</div>` +
    `<div class='section'><b>Return to Base:</b> ${returnToBase}</div>` +
    `<h3 style='color:#ffeaa7; margin-top:30px;display:flex;align-items:center;gap:10px;'>Timetable (24h) <span id='panelPickupStatusCard' style="display:inline-block;vertical-align:middle;"></span></h3>` +
    `<table><tr><th>Stop</th><th>Location</th><th>Notes</th><th>Arrival (24h)</th></tr>` +
    `<tr><td>A</td><td>${addressLink(base)}</td><td>Start/Base</td><td>${formatTime24(pickupMins)}</td></tr>` +
    `<tr><td>B</td><td>${addressLink(pickup)}</td><td>Pickup</td><td>${formatTime24(dropoffMins)}</td></tr>` +
    `<tr><td>C</td><td>${addressLink(dropoff)}</td><td>Dropoff</td><td>${window.returnToBase ? formatTime24(returnMins) : formatTime24(returnMins)}</td></tr>` +
    (window.returnToBase ? `<tr><td>D</td><td>${addressLink(base)}</td><td>Return to Base</td><td>${formatTime24(baseReturnMins)}</td></tr>` : '') +
    `</table>` +
    `<button class='download-btn' onclick='downloadPanel()'>⬇️ Download as HTML</button>` +
    `<div class='footer'>Generated by Boris SMART TRIP v1</div>` +
    `</div>` +
    `<script>
      function downloadPanel() {
        const blob = new Blob([document.documentElement.outerHTML], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'route_panel.html';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      }
      // Copy the live clock and pickup status from the main page if available
      function syncLiveDayTime() {
        try {
          if (window.opener && window.opener.document) {
            var src = window.opener.document.getElementById('liveDayTime');
            var tgt = document.getElementById('panelClock');
            if (src && tgt) tgt.innerHTML = src.innerHTML;
            var statusSrc = window.opener.document.getElementById('pickupStatusCard');
            var statusTgt1 = document.getElementById('panelPickupStatusCard');
            var statusTgt2 = document.getElementById('panelPickupStatusCardClock');
            if (statusSrc && statusTgt1) statusTgt1.innerHTML = statusSrc.innerHTML;
            if (statusSrc && statusTgt2) statusTgt2.innerHTML = statusSrc.innerHTML;
          }
        } catch(e) {}
      }
      setInterval(syncLiveDayTime, 1000);
      syncLiveDayTime();
    </script>` +
    `</body></html>`;
    // Open a new window with the trip summary
    const win = window.open('', '_blank', 'width=700,height=800');
    win.document.write(html);
    win.document.close();
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