// Free-style text parsing functions
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('freeStyleInput').value = text;
    parseFreeStyle(); // Auto-parse after paste
  } catch (err) {
    alert('Please paste manually using Ctrl+V or Cmd+V');
  }
}

function clearFreeStyleInput() {
  document.getElementById('freeStyleInput').value = '';
  document.getElementById('pickupLocation').value = '';
  document.getElementById('dropoffLocation').value = '';
  document.getElementById('tripDateDisplay').value = '';
  document.getElementById('tripTime').value = '';
  document.getElementById('tripPrice').value = '';
  parsedDateLabel = '';
  parsedTimeLabel = '';
  document.getElementById('parsedInfo').style.display = 'none';
}

async function parseFreeStyle() {
  const freeText = document.getElementById('freeStyleInput').value;
  if (!freeText.trim()) {
    alert("Please enter trip details");
    return;
  }
  
  const parsed = await parseFreeStyleText(freeText);
  
  // Store vehicle type globally
  parsedVehicleType = parsed.vehicleType || '';
  
  // Update form with parsed values
  if (parsed.pickup) {
    document.getElementById('pickupLocation').value = parsed.pickup;
  }
  if (parsed.dropoff) {
    document.getElementById('dropoffLocation').value = parsed.dropoff;
  }
  if (parsed.price) {
    document.getElementById('tripPrice').value = parsed.price;
  }
  if (parsed.date) {
    parsedDateLabel = parsed.date;
    document.getElementById('tripDateDisplay').value = parsed.date;
  }
  if (parsed.time) {
    // Display the full time with label (e.g., "22:40 (Landing time)")
    document.getElementById('tripTime').value = parsed.time;
    parsedTimeLabel = parsed.time;
  }
  
  // Update parsed information display with additional details
  const pickup = document.getElementById('pickupLocation').value;
  const dropoff = document.getElementById('dropoffLocation').value;
  const price = document.getElementById('tripPrice').value;
  const date = document.getElementById('tripDateDisplay').value;
  const time = document.getElementById('tripTime').value;
  const baseLocation = document.getElementById('baseLocation').value;
  
  const timeOfDay = parsed.timeOfDay ? ` (${parsed.timeOfDay})` : '';
  const vehicleType = parsed.vehicleType || 'Not Specified';
  
  // Get total distance and time if calculated
  const totalDistance = document.getElementById('totalDistance').textContent;
  const totalTime = document.getElementById('totalTime').textContent;
  
  // Get profit, CC, and profit per hour if calculated
  const profit = document.getElementById('estimatedProfit').textContent;
  const profitPerHour = document.getElementById('profitPerHour').textContent;
  const fuelCostText = document.getElementById('fuelCost').textContent;
  const hasCongestionCharge = fuelCostText.includes('CC');
  const ccBadge = hasCongestionCharge ? ' <span style="background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">CC £15</span>' : '';
  
  // Determine profit level badge
  let profitBadge = '';
  if (profitPerHour !== '-' && profitPerHour !== 'Not calculated') {
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
  
  document.getElementById('parsedDetails').innerHTML = `
    <strong>Pickup:</strong> ${pickup || 'Not set'}<br>
    <strong>Dropoff:</strong> ${dropoff || 'Not set'}<br>
    <strong>Price:</strong> ${price ? '£' + price : 'Not set'}<br>
    <strong>Date:</strong> ${date || 'Not set'}<br>
    <strong>Time:</strong> ${time || 'Not set'}${timeOfDay}<br>
    <strong>Base Location:</strong> ${baseLocation || 'Not set'}<br>
    <strong>Vehicle:</strong> ${vehicleType}<br>
    <strong>Total Distance:</strong> ${totalDistance !== '-' ? totalDistance : 'Not calculated'}<br>
    <strong>Total Time:</strong> ${totalTime !== '-' ? totalTime : 'Not calculated'}<br>
    <strong>Profit:</strong> ${profit !== '-' ? profit : 'Not calculated'}${profitBadge}${ccBadge}<br>
    <strong>Profit/h:</strong> ${profitPerHour !== '-' ? profitPerHour : 'Not calculated'}
  `;
  
  document.getElementById('parsedInfo').style.display = 'block';
  
  // Auto-calculate if we have enough info
  if (parsed.pickup && parsed.dropoff) {
    setTimeout(() => calculateTrip(), 500);
  }
}

async function parseFreeStyleText(text) {
  const result = {};
  
  // Enhanced location extraction BEFORE cleaning (to preserve "Airport Job" pattern)
  const locations = extractLocations(text);
  
  // Clean the text - remove WhatsApp timestamps and phone numbers
  let cleanText = text.replace(/\[\d{1,2}:\d{2}, \d{1,2}\/\d{1,2}\/\d{4}\]/g, '')
                     .replace(/\+44 \d{2,4} \d{4} \d{4}/g, '')
                     .replace(/\+44 \d{4} \d{6}/g, '')
                     .replace(/🚨/g, '')
                     .replace(/🛞/g, '')
                     .replace(/🚗/g, '')
                     .replace(/🚙/g, '')
                     .replace(/🔴/g, '')
                     .replace(/‼️/g, '')
                     .replace(/\.\.\./g, ' ')
                     .replace(/UPDATED\s*FARE/gi, '')
                     .replace(/SAMEDAY PAYMENT/gi, '')
                     .replace(/SAME DAY PAYMENT/gi, '')
                     .replace(/SAME DAY PAYMNET/gi, '')
                     .replace(/\bSAME DAY\b/gi, '')
                     .replace(/URGENT/gi, '')
                     .replace(/\bJob\b/gi, '')
                     .replace(/\bASAP\b/gi, '');
  
  // Simple logic: first location is pickup, second is dropoff
  if (locations.length >= 2) {
    result.pickup = await expandLocation(locations[0]);
    result.dropoff = await expandLocation(locations[1]);
  } else if (locations.length === 1) {
    result.pickup = await expandLocation(locations[0]);
  }
  
  // Extract price with better pattern matching including PAYMENT format
  const priceMatch = cleanText.match(/\*?payment[\s\-]*£(\d+(?:\.\d{2})?)(?:\s*same\s*day)?\*?/i) || // *PAYMENT- £75 SAME DAY* or PAYMENT- £75
                    cleanText.match(/payment[\s\-]*£(\d+(?:\.\d{2})?)/i) || // PAYMENT- £75
                    cleanText.match(/(\d+)£\s*(?:net)?/i) || // 48£ Net or 53£
                    cleanText.match(/price\s*[;:\-]?\s*£?\s*(\d+(?:\.\d{2})?)\s*net/i) ||
                    cleanText.match(/fare[\s\-]*£(\d+(?:\.\d{2})?)/i) || // fare£60 or fare £60
                    cleanText.match(/fare\s*[;:\-]\s*£?\s*(\d+(?:\.\d{2})?)\s*(?:net)?/i) || // Fare; £107 net or Fare: 60
                    cleanText.match(/\bfare\s+(\d+(?:\.\d{2})?)\b/i) || // fare 75 or fare 60.00
                    cleanText.match(/net\s*fare\s*[;:]\s*£?\s*(\d+(?:\.\d{2})?)/i) ||
                    cleanText.match(/£\s*(\d+(?:\.\d{2})?)\s*net/i) ||
                    cleanText.match(/(?:net\s*fare|price|fare|net|clear)\s*[:\-]?\s*£?\s*(\d+(?:\.\d{2})?)/i) || 
                    cleanText.match(/saloon\s*:\s*(\d+)£/i) || // Saloon : 65£
                    cleanText.match(/£\s*(\d+(?:\.\d{2})?)/) ||
                    cleanText.match(/(\d+)\s*(?:pounds|gbp)\b/i) ||
                    cleanText.match(/\b(\d{2,3})\b(?!\d*[\.\.\-]\d)(?!\s*(?:to|clock|o'clock))/); // Standalone 2-3 digit numbers excluding time patterns
  
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1]);
  }
  
  // Enhanced date parsing with full date format support
  const dateMatch = cleanText.match(/\b(tonight)\b/i) || // TONIGHT
                   cleanText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4})/i) || // Nov 20, 2025
                   cleanText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+\d{4})?)/i) || // 20th Nov or 21st Nov 2025
                   cleanText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i) || // 21 Nov 2025
                   cleanText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/) ||
                   cleanText.match(/\b(today|tomorrow)\b/i) ||
                   cleanText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i) ||
                   // New format: Wednesday 19th  2025
                   cleanText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4}/i);
  
  // Check for day name (MONDAY, TUESDAY, etc.) for next 7 days
  const dayNameMatch = cleanText.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  
  if (dateMatch) {
    if (dateMatch[0].toLowerCase() === 'today' || dateMatch[0].toLowerCase() === 'tonight') {
      const today = new Date();
      const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
      const label = dateMatch[0].toLowerCase() === 'tonight' ? 'Tonight' : 'Today';
      result.date = `${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${label} (${dayName})`;
    } else if (dateMatch[0].toLowerCase() === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayName = tomorrow.toLocaleDateString('en-GB', { weekday: 'long' });
      result.date = `${tomorrow.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - Tomorrow (${dayName})`;
    } else {
      // Format the date properly
      const dateStr = dateMatch[0];
      // Convert "Wednesday 19th  2025" to "19 Nov" format
      if (dateStr.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4}/i)) {
        const parts = dateStr.split(/\s+/);
        const day = parts[1].replace(/(st|nd|rd|th)/i, '');
        const year = parts[2];
        const month = new Date().toLocaleDateString('en-GB', { month: 'long' });
        const parsedDate = new Date(year, new Date().getMonth(), day);
        const dayName = parsedDate.toLocaleDateString('en-GB', { weekday: 'long' });
        result.date = `${day} ${month} (${dayName})`;
      } else {
        // Parse other date formats and add day name
        let parsedDate;
        const shortMonthMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (shortMonthMatch) {
          const day = shortMonthMatch[1];
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(shortMonthMatch[2].toLowerCase()));
          parsedDate = new Date(new Date().getFullYear(), monthIndex, day);
          const dayName = parsedDate.toLocaleDateString('en-GB', { weekday: 'long' });
          const fullMonth = monthNames[monthIndex];
          result.date = `${day} ${fullMonth} (${dayName})`;
        } else {
          result.date = dateStr;
        }
      }
    }
  } else if (dayNameMatch) {
    // Find the next occurrence of this day within the next 7 days
    const targetDay = dayNameMatch[1].toLowerCase();
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIndex = daysOfWeek.indexOf(targetDay);
    
    const today = new Date();
    const currentDayIndex = today.getDay();
    
    // Calculate days until target day
    let daysUntil = targetDayIndex - currentDayIndex;
    if (daysUntil <= 0) {
      daysUntil += 7; // Next week if day has passed or is today
    }
    
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysUntil);
    const dayName = targetDate.toLocaleDateString('en-GB', { weekday: 'long' });
    result.date = `${targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} (${dayName})`;
  } else {
    // If no date found, indicate date not recognized
    result.date = 'Date not recognised';
  }
  
  // Enhanced time parsing with AM/PM support and time-of-day descriptions
  const landingTimeMatch = cleanText.match(/(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*\(landing\)/i) || // 11:12 PM (Landing)
                           cleanText.match(/(\d{1,2}:\d{2})\s*landing\s+time\.?/i) || // 22:40 landing time or 22:40 landing time.
                           cleanText.match(/landing\s+time\.?[:\s]*(\d{1,2}:\d{2})/i) || // landing time: 22:40 or landing time. 22:40
                           cleanText.match(/@\s*(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*\(landing\)/i); // @ 11:12 PM (Landing)
  
  const timeMatch = landingTimeMatch ||
                   cleanText.match(/today\s+@\s*(\d{1,2}:\d{2})\s*(?:am|pm)/i) || // Today @ 7:00am
                   cleanText.match(/tonight\s+@\s*(\d{1,2}:\d{2})\s*(?:am|pm)/i) || // TONIGHT @ 21:25 pm
                   cleanText.match(/\b(\d{1,2}\.\d{2})\s*(?:clock|o'clock)?\b/i) || // 12.00 clock or 12.00
                   cleanText.match(/\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}:\d{2})/i) || // 20th Nov 11:15
                   cleanText.match(/booking\s+pickup\s+time[:\s]+(?:[a-z]+\s+\d+,\s+\d{4}\s*\|\s*)?(\d{1,2}:\d{2})/i) || // Booking pickup time: Nov 20, 2025 | 20:20
                   cleanText.match(/(?:\d{1,2}\s+[a-z]+\s+\d{4})\s+(\d{1,2}:\d{2})\s*(?:AM|PM)/i) || // 21 Nov 2025 21:00 PM
                   cleanText.match(/(?:tomorrow|today|tonight)\s+(\d{1,2}:\d{2})/i) || // TOMORROW 07:25 or TODAY 13:50
                   cleanText.match(/(?:tomorrow|today|tonight)\s+@\s*(\d{1,2}:\d{2})\s*(?:am|pm)?/i) || // Tomorrow @ 08:00
                   cleanText.match(/@\s*(\d{1,2}:\d{2})\s*(?:am|pm)?/i) || // @ 20:20PM
                   cleanText.match(/(?:tomorrow|today)\s+at\s+(\d{1,2}:\d{2})/i) ||
                   cleanText.match(/at\s+(\d{1,2}:\d{2})/i) || // At 23:10
                   cleanText.match(/\b(\d{1,2}:\d{2})\s*(?:am|pm)\b/i) || 
                   cleanText.match(/\btoday\s+(\d{1,2}\s+\d{2})\b/i) ||  // TODAY 13 50 format
                   cleanText.match(/(?:tomorrow|today)\s+(\d{2}\s+\d{2})\b/i) || // TOMORROW 07 45
                   cleanText.match(/\b(\d{1,2}\s+\d{2})\b(?!\s*(?:to|net|fare))/i) ||  // 13 50 format (space instead of colon)
                   cleanText.match(/\b(\d{1,2}\s*(?:am|pm))\b/i) ||
                   cleanText.match(/\b(\d{1,2}\s*(?:AM|PM))\b/i) ||
                   cleanText.match(/\b(\d{1,2}:\d{2})\b/i); // Generic HH:MM format with colon
  
  if (timeMatch) {
    let time = timeMatch[1].trim();
    // Convert decimal format to standard time format (e.g., "12.00" -> "12:00")
    if (/^\d{1,2}\.\d{2}$/.test(time)) {
      time = time.replace(/\./, ':');
    }
    // Convert space to colon if needed (e.g., "13 50" -> "13:50")
    if (/^\d{1,2}\s+\d{2}$/.test(time)) {
      time = time.replace(/\s+/, ':');
    }
    
    // Check if there's AM/PM in the matched text (for formats like "11:12 PM (Landing)")
    const ampmMatch = timeMatch[0].match(/(AM|PM)/i);
    if (ampmMatch && !time.match(/(AM|PM)/i)) {
      time = `${time} ${ampmMatch[1].toUpperCase()}`;
    }
    
    // Add "Landing time" label if it's a landing time format
    if (landingTimeMatch) {
      result.time = `${time} (Landing)`;
    } else {
      result.time = time;
    }
  }
  
  // Parse time-of-day descriptions
  const timeOfDayMatch = cleanText.match(/\b(early morning|morning|afternoon|evening|late night|night)\b/i);
  if (timeOfDayMatch && !result.time) {
    // Add as a note if no specific time found
    result.timeOfDay = timeOfDayMatch[1];
  }
  
  // Parse passenger count from indicators like "(1 Persons)" or "🔴🔴" (red dots)
  const passengerCountMatch = cleanText.match(/\((\d+)\s*persons?\)/i);
  const redDotsMatch = cleanText.match(/(🔴+)/);
  
  let passengerCount = null;
  if (passengerCountMatch) {
    passengerCount = parseInt(passengerCountMatch[1]);
  } else if (redDotsMatch) {
    // Count red dots to determine passenger count
    passengerCount = redDotsMatch[1].length;
  }
  
  // Parse vehicle type - comprehensive patterns for all variations including passenger count
  const vehicleMatch = cleanText.match(/\b(any\s*bmw\s*\/\s*mercedes|bmw\s*\/\s*mercedes|exec\s*\/\?\s*e\s*class\s*or\s*similar|e\s*class\s*or\s*similar|e\s*class|e-class|estate\s*car|saloon\s*car|ex[e|c]cutive\s*car|ex[e|c]cutive|mpv\s*8|mpv|9\s*seater|7\s*seater|8\s*seater|minivan|minibus|estate|saloon|any\s*car)\b/gi);
  if (vehicleMatch) {
    // Get the first match and format it nicely
    let vehicle = vehicleMatch[0].trim();
    // Standardize the formatting
    if (vehicle.match(/any\s*bmw\s*\/\s*mercedes/i)) {
      result.vehicleType = 'Any BMW / MERCEDES';
    } else if (vehicle.match(/bmw\s*\/\s*mercedes/i)) {
      result.vehicleType = 'BMW / MERCEDES';
    } else if (vehicle.match(/exec\s*\/\?\s*e\s*class\s*or\s*similar/i)) {
      result.vehicleType = 'Exec/E Class or Similar';
    } else if (vehicle.match(/e\s*class\s*or\s*similar/i)) {
      result.vehicleType = 'E Class or Similar';
    } else if (vehicle.match(/e\s*class|e-class/i)) {
      result.vehicleType = 'E Class';
    } else if (vehicle.match(/estate\s*car/i)) {
      result.vehicleType = 'Estate Car';
    } else if (vehicle.match(/saloon\s*car/i)) {
      result.vehicleType = 'Saloon Car';
    } else if (vehicle.match(/ex[e|c]cutive\s*car/i)) {
      result.vehicleType = 'Executive Car';
    } else if (vehicle.match(/ex[e|c]cutive/i)) {
      result.vehicleType = 'Executive';
    } else if (vehicle.match(/mpv\s*8/i)) {
      result.vehicleType = 'MPV 8';
    } else if (vehicle.match(/9\s*seater/i)) {
      result.vehicleType = '9 Seater';
    } else if (vehicle.match(/8\s*seater/i)) {
      result.vehicleType = '8 Seater';
    } else if (vehicle.match(/7\s*seater/i)) {
      result.vehicleType = '7 Seater';
    } else if (vehicle.match(/any\s*car/i)) {
      result.vehicleType = 'Any Car';
    } else if (vehicle.match(/minivan/i)) {
      result.vehicleType = 'Minivan';
    } else if (vehicle.match(/minibus/i)) {
      result.vehicleType = 'Minibus';
    } else if (vehicle.match(/estate/i)) {
      result.vehicleType = 'Estate';
    } else if (vehicle.match(/saloon/i)) {
      result.vehicleType = 'Saloon';
    } else if (vehicle.match(/mpv/i)) {
      result.vehicleType = 'MPV';
    } else {
      result.vehicleType = vehicle.charAt(0).toUpperCase() + vehicle.slice(1).toLowerCase();
    }
    
    // Add passenger count to vehicle type if available
    if (passengerCount) {
      result.vehicleType += ` (${passengerCount} ${passengerCount === 1 ? 'Person' : 'Persons'})`;
    }
  } else {
    // Default to 'Not Specified' if no vehicle type found, but include passenger count if available
    if (passengerCount) {
      result.vehicleType = `Vehicle for ${passengerCount} ${passengerCount === 1 ? 'Person' : 'Persons'}`;
    } else {
      result.vehicleType = 'Not Specified';
    }
  }
  
  return result;
}