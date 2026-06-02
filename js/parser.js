// Free-style text parsing functions

// DEMO: Parse sample booking message and log result
window.demoParseBooking = async function() {
  const sampleText = `SAME DAY PAYMENT\nPick up: LN4 4SY\nDrop off: OX18 3LX\nTomorrow @ 05:00Am\nSaloon car\nNet fare: 150£`;
  const result = await parseFreeStyleText(sampleText);
  console.log('Parsed booking:', result);
  alert('Parsed booking (see console):\n' + JSON.stringify(result, null, 2));
};
window.pasteFromClipboard = pasteFromClipboard;
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    // Remove empty lines (lines with only spaces or tabs)
    const cleanedText = text.split('\n').filter(line => line.trim().length > 0).join('\n');
    document.getElementById('freeStyleInput').value = cleanedText;
    parseFreeStyle(); // Auto-parse after paste
  } catch (err) {
    alert('Please paste manually using Ctrl+V or Cmd+V');
  }
}

window.clearFreeStyleInput = clearFreeStyleInput;
function clearFreeStyleInput() {
  document.getElementById('freeStyleInput').value = '';
  document.getElementById('pickupLocation').value = '';
  document.getElementById('dropoffLocation').value = '';
  document.getElementById('tripDate').value = '';
  document.getElementById('tripTime').value = '';
  document.getElementById('tripPrice').value = '';
  parsedDateLabel = '';
  parsedTimeLabel = '';
  const extractedInfoSummary = document.getElementById('extractedInfoSummary');
  if (extractedInfoSummary) {
    extractedInfoSummary.innerHTML = '<span class="extracted-chip is-muted">No extracted info yet</span>';
  }
  const parsedInfoEl = document.getElementById('parsedInfo');
  if (parsedInfoEl) {
    parsedInfoEl.style.display = 'none';
  }
}

window.parseFreeStyle = parseFreeStyle;
async function parseFreeStyle() {
  window.triggerAnalyzingStatus && window.triggerAnalyzingStatus();
  // Clear all relevant fields before parsing
  document.getElementById('pickupLocation').value = '';
  document.getElementById('dropoffLocation').value = '';
  document.getElementById('tripDate').value = '';
  document.getElementById('tripTime').value = '';
  document.getElementById('tripPrice').value = '';
  parsedDateLabel = '';
  parsedTimeLabel = '';
  const parsedInfoEl = document.getElementById('parsedInfo');
  if (parsedInfoEl) {
    parsedInfoEl.style.display = 'none';
  }
  const freeText = document.getElementById('freeStyleInput').value;
  if (!freeText.trim()) {
    window.clearAnalyzingStatus && window.clearAnalyzingStatus();
    alert("Please enter trip details");
    return;
  }

  let parsed;
  try {
    parsed = await parseFreeStyleText(freeText);
    window.clearAnalyzingStatus && window.clearAnalyzingStatus();
  } catch (e) {
    window.analyzingStatus = false;
    window.analyzingError = true;
    return;
  }

  // Store vehicle type globally
  parsedVehicleType = parsed.vehicleType || '';
  // Store last freestyle parse globally for extra info
  window.lastParsedFreeStyle = parsed;

  // Update form with parsed values (already expanded in parseFreeStyleText)
  if (parsed.pickup) {
    document.getElementById('pickupLocation').value = parsed.pickup;
  }
  if (parsed.dropoff) {
    document.getElementById('dropoffLocation').value = parsed.dropoff;
  }
  // Show price and append 'SAME DAY PAYMENT' if present in message
  let priceText = '';
  if (parsed.price) {
    if (parsed.priceType === 'Cash') {
      priceText = `${parsed.price} Cash`;
    } else {
      priceText = parsed.price;
    }
  }
  if (/SAME DAY PAYMENT/i.test(freeText)) {
    priceText += priceText ? ' | SAME DAY PAYMENT' : 'SAME DAY PAYMENT';
  }
  
  const tripPriceInput = document.getElementById('tripPrice');
  tripPriceInput.value = priceText;
  
  // If "cash" or "CASH" appears in the message, make the fare input red and show cash indicator
  if (/\bcash\b/i.test(freeText)) {
    tripPriceInput.style.backgroundColor = '#ffebee';
    tripPriceInput.style.color = '#c62828';
    tripPriceInput.style.fontWeight = 'bold';
    tripPriceInput.style.borderColor = '#e53935';
    
    // Show cash indicator in Summary header
    const cashIndicatorSummary = document.getElementById('cashIndicatorSummary');
    if (cashIndicatorSummary) {
      cashIndicatorSummary.style.display = 'inline-block';
    }
  } else {
    // Reset to default styling if no cash
    tripPriceInput.style.backgroundColor = '';
    tripPriceInput.style.color = '';
    tripPriceInput.style.fontWeight = '';
    tripPriceInput.style.borderColor = '';
    
    // Hide cash indicator in Summary header
    const cashIndicatorSummary = document.getElementById('cashIndicatorSummary');
    if (cashIndicatorSummary) {
      cashIndicatorSummary.style.display = 'none';
    }
  }

  if (parsed.date) {
    parsedDateLabel = parsed.date;
    document.getElementById('tripDate').value = parsed.date;
  }
  if (parsed.time) {
    // Display the full time with label (e.g., "22:40 (Landing time)")
    document.getElementById('tripTime').value = parsed.time;
    parsedTimeLabel = parsed.time;
  }

  // ...existing code...
  const parsedInfoShowEl = document.getElementById('parsedInfo');
  if (parsedInfoShowEl) {
    parsedInfoShowEl.style.display = 'block';
  }
  window.updateExtractedInfoSection && window.updateExtractedInfoSection();

  // Auto-calculate if we have enough info
  if (parsed.pickup && parsed.dropoff) {
    setTimeout(() => calculateTrip(), 500);
  }
}

async function parseFreeStyleText(text) {
      // Remove unwanted symbols before any parsing
      text = text.replace(/[.]/g, ' ')
                 .replace(/‼️/g, ' ')
                 .replace(/—{2,}>/g, ' ');
    // Always initialize result object FIRST
    let result = {};
    
        // Enhanced: If line contains 'PICKUP' followed by a time, set as time; if postcode/location, set as pickup
        // BUT exclude "Pickup time:" pattern which is handled separately
        const pickupLineMatch = text.match(/^\s*PICKUP\s+(?!time\s*:)(.+)$/gim);
        if (pickupLineMatch) {
          pickupLineMatch.forEach(line => {
            let value = line.replace(/^\s*PICKUP\s+/i, '').trim();
            // Normalize time formats
            let timeVal = null;
            // 14:00, 2:00 PM, 2 PM, 14.00, 2pm, 2.00pm, 14 00
            if (/^([0-2]?\d:[0-5]\d)(\s*[APap][Mm])?$/.test(value)) {
              // 14:00 or 2:00 PM
              timeVal = value.replace(/\s+/g, '').toUpperCase();
            } else if (/^([0-2]?\d)[.: ]([0-5]\d)(\s*[APap][Mm])?$/.test(value)) {
              // 14.00, 14 00, 2.00pm
              let m = value.match(/^([0-2]?\d)[.: ]([0-5]\d)(\s*[APap][Mm])?$/);
              if (m) {
                timeVal = `${m[1].padStart(2,'0')}:${m[2].padStart(2,'0')}` + (m[3] ? m[3].toUpperCase().replace(/\s+/g,'') : '');
              }
            } else if (/^([0-2]?\d)(\s*[APap][Mm])$/.test(value)) {
              // 2pm, 12AM
              let m = value.match(/^([0-2]?\d)(\s*[APap][Mm])$/);
              if (m) {
                timeVal = `${m[1].padStart(2,'0')}:00${m[2].toUpperCase().replace(/\s+/g,'')}`;
              }
            } else if (/^([0-2]?\d)$/.test(value)) {
              // Just hour, treat as HH:00
              timeVal = value.padStart(2,'0') + ':00';
            }
            if (timeVal) {
              result.time = timeVal;
            } else {
              // Otherwise treat as pickup location
              result.pickup = value;
            }
            // Remove this line from text for further extraction
            text = text.replace(line, '');
          });
        }
    // Handle "Pickup time:" separately - extract time and date, but NOT location
    const pickupTimeMatch = text.match(/Pickup\s+time\s*:\s*([^\n\r]+)/i);
    if (pickupTimeMatch) {
      const timeContent = pickupTimeMatch[1];
      // Extract date from "Dec 10, 2025"
      const dateExtract = timeContent.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i);
      if (dateExtract) {
        result.pickupTimeDate = dateExtract[1]; // Store for later date parsing
      }
      // Extract time from "Dec 10, 2025 | 10:50"
      const timeExtract = timeContent.match(/(\d{1,2}:\d{2})/);
      if (timeExtract) {
        result.time = timeExtract[1];
      }
      text = text.replace(pickupTimeMatch[0], ' ');
    }

    const pickupDateMatch = text.match(/Pickup\s+date\s*:\s*([^\n\r]+)/i);
    if (pickupDateMatch) {
      const pickupDateValue = pickupDateMatch[1].trim();
      if (!result.date) {
        result.date = pickupDateValue;
      }
      text = text.replace(pickupDateMatch[0], ' ');
    }

    text = text.replace(/^\s*Pickup\s+date\s*:\s*[^\n\r]+$/gim, ' ')
               .replace(/^\s*Pickup\s+time\s*:\s*[^\n\r]+$/gim, ' ');

    const atFromToNetMatch = text.match(/(?:^|\n)\s*at\s*(\d{1,2}[:.]\d{2})\s+from\s+([^\n\r]+?)\s+to\s+([^\n\r]+?)\s+£\s*(\d{2,})(?:[.\s]\d{1,2})?\s*net\b/i);
    if (atFromToNetMatch) {
      result.time = atFromToNetMatch[1].replace('.', ':');
      result.pickup = atFromToNetMatch[2].trim();
      result.dropoff = atFromToNetMatch[3].trim();
      result.price = parseFloat(atFromToNetMatch[4]);
      result.priceType = 'Net';
      result.date = 'Date not recognised';
      if (/same day payment|same day/i.test(text)) {
        result.sameDayPayment = true;
      }
      if (/any vehicle/i.test(text)) {
        result.vehicleType = 'Any Vehicle';
      }
      if (/saloon car/i.test(text)) {
        result.vehicleType = 'Saloon Car';
      }
      result.specialFormat = 'AtFromToNet';
      return result;
    }

    const explicitJobMatch = text.match(/(?:^|\n)\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}\s+\d{1,2}:\d{2}\s*(?:AM|PM))?[\s\S]*?\bPickup\s*:\s*([^\n\r]+)[\s\S]*?\bDropoff\s*:\s*([^\n\r]+)[\s\S]*?\b(Fare|Price)\s*(\d+(?:\.\d{1,2})?)\b[\s\S]*?\b(Saloon|Any Vehicle|Any Car|Tesla or Smiler|Tesla|Smiler)\b/i);
    if (explicitJobMatch) {
      const header = explicitJobMatch[1] || '';
      const headerMatch = header.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})\s+(\d{1,2}:\d{2})\s*(AM|PM)/i);
      if (headerMatch) {
        const day = headerMatch[1];
        const monthName = headerMatch[2];
        const yearRaw = headerMatch[3];
        const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10);
        const hour = headerMatch[4];
        const ampm = headerMatch[5].toUpperCase();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(monthName.toLowerCase().substring(0, 3)));
        if (monthIndex >= 0) {
          const parsedDate = new Date(year, monthIndex, parseInt(day, 10));
          const dayName = parsedDate.toLocaleDateString('en-GB', { weekday: 'long' });
          result.date = `${String(parseInt(day, 10)).padStart(2, '0')} ${monthNames[monthIndex]} (${dayName})`;
        }
        result.time = `${hour} ${ampm}`;
      }
      result.pickup = explicitJobMatch[2].trim();
      result.dropoff = explicitJobMatch[3].trim();
      result.price = parseFloat(explicitJobMatch[5]);
      result.vehicleType = explicitJobMatch[6].trim() === 'Tesla' || explicitJobMatch[6].trim() === 'Smiler'
        ? 'Saloon'
        : explicitJobMatch[6].trim();
      if (/same day payment|same day/i.test(text)) {
        result.sameDayPayment = true;
      }
      result.specialFormat = 'ExplicitJob';
      return result;
    }

    const fromToMatch = text.match(/(?:^|\n)\s*(?:at\s+\d{1,2}:\d{2}\s+)?from\s+([^\n\r]+?)\s+to\s+([^\n\r]+?)(?=\s*(?:£|\n|$))/i);
    if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
      result.pickup = fromToMatch[1].trim();
      result.dropoff = fromToMatch[2].trim();
      result.specialFormat = 'AtFromTo';
      text = text.replace(fromToMatch[0], ' ');
    }

    const explicitPickupDropMatch = text.match(/pickup\s*:\s*([^\n\r]+)[\s\S]*?drop(?:off)?\s*:\s*([^\n\r]+)/i);
    if (explicitPickupDropMatch) {
      result.pickup = explicitPickupDropMatch[1].trim();
      result.dropoff = explicitPickupDropMatch[2].trim();
      text = text.replace(explicitPickupDropMatch[0], ' ');
    }
    
    // DISABLED: Let extractLocations handle "Pick up:" patterns instead
    // This prevents false matches like "Pickup time:" being treated as locations
    /*
    // If message contains 'Pick up:' or 'Pickup:' use it as pickup location
    // Match only patterns where colon comes immediately after Pickup/Pick up (no other words between)
    const pickUpColonMatch = text.match(/\bPick\s+up\s*:\s*([^\n\r]+)/i) || text.match(/\bPickup\s*:\s*([^\n\r]+)/i);
    if (pickUpColonMatch) {
      // Make absolutely sure it's not "Pickup time:" or similar
      const hasWordBetween = /\b(Pick\s+up|Pickup)\s+\w+\s*:/i.test(pickUpColonMatch[0]);
      if (!hasWordBetween) {
        result.pickup = await expandLocation(pickUpColonMatch[1].replace(/[.,;\s]+$/, '').trim());
        result.specialFormat = (result.specialFormat ? result.specialFormat + '_' : '') + 'PickUpColon';
      }
    }
    */
    
    // DISABLED: These patterns interfere with extractLocations
    // Let extractLocations handle all pickup/dropoff patterns with cleaned text
    /*
    // If message contains 'Drop off:' or 'Dropoff:' use it as dropoff location (robust to whitespace, punctuation, and line breaks)
    const dropOffMatch = text.match(/Drop\s*off\s*:\s*([^\n\r]+)/i) || text.match(/Dropoff\s*:\s*([^\n\r]+)/i);
    if (dropOffMatch) {
      result.dropoff = await expandLocation(dropOffMatch[1].replace(/[.,;\s]+$/, '').trim());
      result.specialFormat = (result.specialFormat ? result.specialFormat + '_' : '') + 'DropOffColon';
    }
    */
    // If message contains 'T5' or 'Heathrow T5', set pickup to 'Heathrow T5' if not already set
    if (/\b(T5|Heathrow T5)\b/i.test(text) && !result.pickup) {
      result.pickup = 'Heathrow T5';
      result.specialFormat = (result.specialFormat ? result.specialFormat + '_' : '') + 'HeathrowT5';
    }
  // Remove all sequences of two or more dashes before any parsing
  text = text.replace(/-{2,}/g, ' ');
  // Remove all emoji and icon characters before any parsing
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{25AA}-\u{25AB}\u{25FE}-\u{25FF}\u{25B6}\u{25C0}\u{25FB}-\u{25FC}\u{25FD}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267B}\u{267F}\u{2693}\u{26A0}-\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}-\u{2705}\u{2708}-\u{2709}\u{270A}-\u{270B}\u{2728}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{303D}\u{3297}\u{3299}\u{1F004}\u{1F0CF}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}\u{1F201}-\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}-\u{1F251}\u{1F300}-\u{1F320}\u{1F32D}-\u{1F335}\u{1F337}-\u{1F37C}\u{1F37E}-\u{1F393}\u{1F3A0}-\u{1F3CA}\u{1F3CF}-\u{1F3D3}\u{1F3E0}-\u{1F3F0}\u{1F3F4}\u{1F3F8}-\u{1F43E}\u{1F440}\u{1F442}-\u{1F4FC}\u{1F4FF}-\u{1F53D}\u{1F54B}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F57A}\u{1F595}-\u{1F596}\u{1F5A4}\u{1F5FB}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CC}-\u{1F6D2}\u{1F6EB}-\u{1F6EC}\u{1F6F0}-\u{1F6F3}\u{1F910}-\u{1F918}\u{1F980}-\u{1F984}\u{1F9C0}\u{1F9D0}-\u{1F9E6}]/gu, '');
  // Custom parsing for messages with parentheses: extract content, omit parentheses, and remove parentheses from time and other fields
  const parenMatch = text.match(/\(([^)]+)\)/);
  text = text.replace(/\(([^)]+)\)/g, '$1');
              // Custom parsing for 🛞 TODAY🛞🛞 ANY EXECUTIVE @20:00pm.. landing Terminal 3‼️NW10... £55..Net
              const execExampleMatch = text.match(/🛞\s*TODAY🛞🛞[\s\S]*?ANY EXECUTIVE[\s\S]*?@(\d{1,2}:\d{2})pm\.\. landing[\s\S]*?Terminal 3‼️([A-Z]{1,2}\d{1,2})\.\.\.[\s\S]*?£(\d{2,4})\.\.Net/i);
              if (execExampleMatch) {
                result.execTodayExample = true;
                result.vehicleType = 'ANY EXECUTIVE';
                result.date = 'Today';
                result.time = execExampleMatch[1] + ' PM (Landing)';
                result.pickup = 'Heathrow Terminal 3';
                result.dropoff = execExampleMatch[2].replace(/\s+/g, '').toUpperCase();
                result.price = parseFloat(execExampleMatch[3]);
                result.priceType = 'Net';
                result.specialFormat = 'ExecTodayExample';
                result.extraMessage = `🛞 TODAY🛞🛞\nANY EXECUTIVE\n@${execExampleMatch[1]}pm.. landing\nTerminal 3‼️${execExampleMatch[2]}...\n£${execExampleMatch[3]}..Net`;
                return result;
              }
            // Support for vehicle type: S class or similar, E-class or similar
            const sClassMatch = text.match(/\b([se]\s*-?\s*class\s*or\s*similar)\b/i);
            if (sClassMatch) {
              const className = sClassMatch[1].toUpperCase().startsWith('E') ? 'E-Class' : 'S Class';
              result.vehicleType = `${className} or Similar`;
              result.specialFormat = (result.specialFormat ? result.specialFormat + '_' : '') + 'ClassOrSimilar';
            }
          // Extract pickup and dropoff if only 'Pick up =' or 'Pickup =' and 'To' are present
          const pickupDropOnlyMatch = text.match(/pick\s*up\s*[=:]?\s*([\w\s]+)[\s\S]*?to\s*([A-Z0-9 ]{4,15})/i);
          if (pickupDropOnlyMatch) {
            result.pickup = pickupDropOnlyMatch[1].replace(/\s+/g, ' ').trim();
            result.dropoff = pickupDropOnlyMatch[2].replace(/\s+/g, '').toUpperCase();
            result.specialFormat = 'PickupDropOnly';
          }
        // Support 'Date=today', 'Time=1455', 'Pick up = Heathrow', 'To BR51JJ' style
        const eqStyleMatch = text.match(/date\s*[=:]\s*(today|tomorrow|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})[\s\S]*?time\s*[=:]\s*(\d{3,4})[\s\S]*?pick\s*up\s*[=:]\s*([\w\s]+)[\s\S]*?to\s*([A-Z0-9 ]{4,10})/i);
        if (eqStyleMatch) {
          // Date
          const dateRaw = eqStyleMatch[1].trim().toLowerCase();
          if (dateRaw === 'today') {
            const today = new Date();
            // Format as YYYY-MM-DD for input field
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            result.date = `${yyyy}-${mm}-${dd}`;
            result.dateLabel = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ` (Today, ${today.toLocaleDateString('en-GB', { weekday: 'long' })})`;
          } else if (dateRaw === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const yyyy = tomorrow.getFullYear();
            const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const dd = String(tomorrow.getDate()).padStart(2, '0');
            result.date = `${yyyy}-${mm}-${dd}`;
            result.dateLabel = tomorrow.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ` (Tomorrow, ${tomorrow.toLocaleDateString('en-GB', { weekday: 'long' })})`;
          } else {
            result.date = dateRaw;
          }
          // Time (convert 1455 to 14:55)
          let timeRaw = eqStyleMatch[2].trim();
          if (/^\d{4}$/.test(timeRaw)) {
            result.time = timeRaw.slice(0,2) + ':' + timeRaw.slice(2);
          } else {
            result.time = timeRaw;
          }
          // Pickup
          result.pickup = eqStyleMatch[3].replace(/\s+/g, ' ').trim();
          // Dropoff
          result.dropoff = eqStyleMatch[4].replace(/\s+/g, '').toUpperCase();
          result.specialFormat = 'EqStyle_DateTimePickupTo';
        }
      // Support 'Pickup from Heathrow terminal 5 to NR32 4AA' in one line
      const oneLinePickupMatch = text.match(/pickup\s*from\s*([\w\s]*heathrow[\w\s]*t(?:erminal)?\s*5)\s*to\s*([A-Z0-9\s]{4,15})/i);
      if (oneLinePickupMatch) {
        result.pickup = oneLinePickupMatch[1].replace(/\s+/g, ' ').trim();
        result.dropoff = oneLinePickupMatch[2].replace(/\s+/g, '').toUpperCase();
        result.specialFormat = 'HeathrowT5_NR324AA_OneLine';
      }
    // Support 'AT 10:20 pickup From Heathrow T5 to NR32 4AA £200+Car Park' style
    // Improved: allow dropoff to be any postcode or location, with/without spaces, and multi-line
    const atTimePickupMatch = text.match(/at\s*(\d{1,2}:\d{2})\s*pickup\s*from\s*([\w\s]*heathrow[\w\s]*t5)[\s\S]*?to\s*([A-Z0-9\s]{4,15})[\s\S]*?(?:£|\b)(\d{2,4})(?:\s*\+\s*Car Park)?/i);
    if (atTimePickupMatch) {
      result.time = atTimePickupMatch[1];
      result.pickup = atTimePickupMatch[2].replace(/\s+/g, ' ').trim();
      result.dropoff = atTimePickupMatch[3].replace(/\s+/g, '').toUpperCase();
      result.price = parseFloat(atTimePickupMatch[4]);
      if (/car park/i.test(text)) {
        result.carPark = true;
      }
      result.specialFormat = 'HeathrowT5_NR324AA_Time';
    }
  // const result = {}; // Removed duplicate declaration
  // Custom parsing for Payment on POB example
  const pobExampleMatch = text.match(/(🚨🚨 Payment on POB ✅️ ✔️ )[\s\S]*?(Any car 🚗 )[\s\S]*?(Today @ (\d{1,2}:\d{2}) PM \(Landing Time\))[\s\S]*?(Heathrow to ([A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}))[\s\S]*?(Fare; £(\d{2,4}) Net)/i);
  if (pobExampleMatch) {
    result.paymentOnPOB = true;
    result.vehicleType = pobExampleMatch[2].trim();
    result.date = 'Today';
    result.time = pobExampleMatch[4] + ' PM (Landing Time)';
    result.pickup = 'Heathrow';
    result.dropoff = pobExampleMatch[6].replace(/\s+/g, '').toUpperCase();
    result.price = parseFloat(pobExampleMatch[8]);
    result.priceType = 'Net';
    result.specialFormat = 'PaymentOnPOBExample';
    result.extraMessage = `${pobExampleMatch[1]}\n${pobExampleMatch[2]}\n${pobExampleMatch[3]}\n${pobExampleMatch[5]}\n${pobExampleMatch[7]}`;
    return result;
  }
  // Robustly handle 'pickup From Heathrow T5 to NR32 4AA £200+Car Park' format, even with line breaks and extra whitespace
  const multiLinePickupMatch = text.match(/pickup\s*from\s*([\w\s]*heathrow[\w\s]*t5)[\s\S]*?to\s*([A-Z0-9 ]{5,8})[\s\S]*?(?:£|\b)(\d{2,4})(?:\s*\+\s*Car Park)?/i);
  if (multiLinePickupMatch) {
    result.pickup = multiLinePickupMatch[1].replace(/\s+/g, ' ').trim();
    result.dropoff = multiLinePickupMatch[2].replace(/\s+/g, '').toUpperCase();
    result.price = parseFloat(multiLinePickupMatch[3]);
    if (/car park/i.test(text)) {
      result.carPark = true;
    }
    result.specialFormat = 'HeathrowT5_NR324AA';
  }
  // Special handling for 'ASAP' as date/time and 'ANY' vehicle
  const asapPresent = /\bASAP\b/i.test(text);

  // Explicitly detect 'No Prius' (case-insensitive)
  if (/no\s*prius/i.test(text)) {
    result.noPrius = true;
    result.vehicleType = 'No Prius';
  }

  // If any line contains 'ANY' or 'any' (case-insensitive, with extra info), set vehicleType to that line
  const anyLineMatch = text.match(/^\s*.*any.*$/gim);
  if (anyLineMatch && anyLineMatch.length > 0 && !result.vehicleType) {
    result.vehicleType = anyLineMatch[0].trim();
  }

  // Handle 'PICK TODAY AT 05.45AM' or similar
  const pickTodayAtMatch = text.match(/PICK\s+TODAY\s+AT\s+(\d{1,2}[.:]\d{2}\s*(AM|PM)?)/i);
  if (pickTodayAtMatch) {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
    result.date = `${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (Today, ${dayName})`;
    // Normalize time to HH:MM AM/PM
    let time = pickTodayAtMatch[1].replace('.', ':').toUpperCase();
    result.time = time;
  }

  // PRIORITIZE: 'Pick - ...' and 'Drop - ...' for locations (even if not consecutive)
  const pickLine = text.match(/^Pick\s*-\s*([^\n\r]+)/im);
  const dropLine = text.match(/^Drop\s*-\s*([^\n\r]+)/im);
  if (pickLine && pickLine[1]) {
    let pickVal = pickLine[1].trim();
    // Remove leading '- ' if present
    if (pickVal.startsWith('- ')) pickVal = pickVal.slice(2).trim();
    // Ignore if value is empty, just 'Pick', or a time/date phrase
    if (
      pickVal &&
      !/^pick(\s|$)/i.test(pickVal) &&
      !/^(tomorrow|today|\d{1,2}[.:]\d{2}(am|pm)?)/i.test(pickVal) &&
      pickVal.toLowerCase() !== 'pick'
    ) {
      result.pickup = (await expandLocation(pickVal));
    }
  }
  if (dropLine && dropLine[1]) {
    let dropVal = dropLine[1].trim();
    // Remove leading '- ' if present
    if (dropVal.startsWith('- ')) dropVal = dropVal.slice(2).trim();
    if (dropVal && !/^drop(\s|$)/i.test(dropVal)) {
      result.dropoff = (await expandLocation(dropVal));
    }
  }
  
  // Clean the text BEFORE extracting locations to prevent dates/times or vehicle/price lines from being parsed as locations
  // Remove date, time, and mile patterns from text to prevent confusion
  let textForLocationExtraction = text
    .replace(/Pickup\s+time\s*:*/gi, '') // Remove "Pickup time:" phrase but keep the date/time values
    .replace(/\btime\b/gi, '') // Remove the word "time" to prevent it from interfering
    .replace(/: * (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\s*\|\s*\d{1,2}:\d{2}/gi, '') // Remove ": Dec 10, 2025 | 10:50" pattern
    .replace(/\b\d{1,2}\-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\-\d{4}\b/gi, '') // 10-Dec-2025 (standalone)
    .replace(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/gi, '') // 03 Dec 2025
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/gi, '') // Nov 20, 2025
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '') // 10/12/2025 or 10-12-2025
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, '') // 08:50 or 08:50AM
    .replace(/\b\d+\.\d+\s*Miles?\b/gi, '') // 20.57 Miles
    .replace(/\(\d+\s*seater\s*car\s*needed\)/gi, ''); // (9 seater car needed)

  // Remove lines that are just vehicle type or price/fare/net/cash
  // Exclude any line containing vehicle or price keywords anywhere in the line (not just at the start)
  const vehicleOrPriceAnywherePattern = /(saloon|estate|executive|mpv|s\s*-?class|e\s*-?class|any car|vehicle|fare|price|net|cash|\£|\d+\s*net|\d+\s*cash|\d+\s*gbp|\d+\s*pounds|\d+\s*eur|\d+\s*usd)/i;
  textForLocationExtraction = textForLocationExtraction
    .split(/\r?\n/)
    .filter(line =>
      !vehicleOrPriceAnywherePattern.test(line) &&
      !/summary|pickup:|dropoff:/i.test(line)
    )
    .join('\n');

  // Enhanced location extraction - try with cleaned text (has Pickup:/Dropoff: labels)
  let locations = await extractLocations(textForLocationExtraction);
  
  // If locations still not found, try other extraction methods
  if (locations.length < 2) {
    locations = await extractLocations(textForLocationExtraction);
  }
  
  // Enhanced location extraction BEFORE cleaning (to preserve "Airport Job" pattern)
  // Support for "Pick Up - ... Drop Off: ..." format, 'X TO Y' format, and 'Destination:' as dropoff
  // If not found, try explicit "Pick Up - ... Drop Off: ..." pattern
  if (locations.length < 2) {
    const pickDropPattern = /Pick\s*Up\s*[-:]?\s*([^\n\r]+)[\n\r]+Drop\s*Off\s*[:\-]?\s*([^\n\r]+)/i;
    const pickDropMatch = text.match(pickDropPattern);
    if (pickDropMatch && pickDropMatch[1] && pickDropMatch[2]) {
      locations = [pickDropMatch[1].trim(), pickDropMatch[2].trim()];
    } else {
      // Try 'X TO Y' format (e.g., 'CR9 TO LCY')
      const toMatch = text.match(/(?:^|\n)\s*([^\n\r]+?)\s+TO\s+([^\n\r]+?)(?=\s*(?:\n|$))/i);
      if (toMatch && toMatch[1] && toMatch[2]) {
        locations = [toMatch[1].trim(), toMatch[2].trim()];
      } else {
        // Try 'Destination:' as dropoff
        const destinationMatch = text.match(/Destination\s*[:\-]?\s*([^\n\r]+)/i);
        if (destinationMatch && destinationMatch[1]) {
          // If we already have a pickup, use it, otherwise leave pickup undefined
          if (locations.length === 1) {
            locations = [locations[0], destinationMatch[1].trim()];
          } else {
            // Only destination found, treat as dropoff
            locations = ['', destinationMatch[1].trim()];
          }
        }
      }
    }
  }

  // Fallback: Extract Passengers/luggage, Vehicle type, and Price from explicit labels if present
  // Passengers/luggage: 1/0
  const paxLuggageMatch = text.match(/Passengers\s*\/\s*luggage\s*:\s*(\d+)\s*\/\s*(\d+)/i);
  if (paxLuggageMatch) {
    result.passengers = parseInt(paxLuggageMatch[1]);
    result.luggage = parseInt(paxLuggageMatch[2]);
  }

  // Vehicle type: Saloon or "Executive Car (1 Persons)"
  let vehicleTypeMatch = text.match(/Vehicle type\s*:\s*([A-Za-z0-9\s\-]+)/i);
  if (!vehicleTypeMatch) {
    // Try to match at start: "Executive Car (1 Persons)"
    vehicleTypeMatch = text.match(/^([A-Za-z ]+Car)\s*\((\d+) Persons?\)/i);
    if (vehicleTypeMatch) {
      result.vehicleType = vehicleTypeMatch[1].trim();
      result.passengers = parseInt(vehicleTypeMatch[2]);
    } else {
      // Support for 'Vehicle: Executive' and 'Vehicle: Executive Saloon'
      vehicleTypeMatch = text.match(/Vehicle\s*:\s*([A-Za-z0-9\s\-]+)/i);
      if (vehicleTypeMatch) {
        result.vehicleType = vehicleTypeMatch[1].trim();
      }
    }
  } else {
    result.vehicleType = vehicleTypeMatch[1].trim();
  }

  // Price extraction - IMPORTANT: Must avoid extracting numbers from postcodes
  // First, identify all postcodes in the text to avoid confusion
  const postcodePattern = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/gi;
  const postcodesInText = [];
  let postcodeMatch;
  while ((postcodeMatch = postcodePattern.exec(text)) !== null) {
    postcodesInText.push(postcodeMatch[0]);
  }
  
  // Helper function to check if a number is part of a postcode
  function isPartOfPostcode(numberMatch, text) {
    const matchIndex = text.indexOf(numberMatch);
    if (matchIndex === -1) return false;
    
    // Check if this number is within any postcode
    for (const postcode of postcodesInText) {
      const postcodeIndex = text.indexOf(postcode);
      if (postcodeIndex !== -1) {
        const postcodeEnd = postcodeIndex + postcode.length;
        // If the number is within the postcode range, it's part of it
        if (matchIndex >= postcodeIndex && matchIndex < postcodeEnd) {
          return true;
        }
      }
    }
    return false;
  }

  // Price: £90 or Price: 90 or *PAYMENT - £90 SAME DAY or 'PRICE 60 NET' or 'PAYMENT - 80 SAME DAY' or 'Net fare: 150£'
  // IMPORTANT: Price must be 2+ digits (10 or more) and NOT part of a postcode
  // Support both integer and decimal formats: 95, 95.00, 95.50
  let priceLabelMatch = text.match(/Net fare\s*[:\-]?\s*(\d{2,}(?:\.\d{1,2})?)£?/i);
  if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
    priceLabelMatch = null;
  }
  
  if (!priceLabelMatch) {
    // Support 'Price: £10.00' and 'Price:£10' (with or without space after colon)
    priceLabelMatch = text.match(/Price\s*:\s*£\s*(\d{2,}(?:\.\d{1,2})?)/i) || text.match(/Price\s*:\s*£?(\d{2,}(?:\.\d{1,2})?)/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  // Support 'Price: £30.50' and 'Price £30'
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/Price\s*[;:\-]?\s*£\s*(\d{2,}(?:\.\d{1,2})?)/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/\*?PAYMENT\s*[-:]?\s*£?(\d{2,}(?:\.\d{1,2})?)(?:\s*SAME DAY)?/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/\bPAYMENT\b\s*£?(\d{2,}(?:\.\d{1,2})?)/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/PRICE\s*:?\s*£?\s*(\d{2,}(?:\.\d{1,2})?)\s*NET/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/Fare\s*[:\-]?\s*(\d{2,}(?:\.\d{1,2})?)\s*NET/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    // This one should also support decimals
    priceLabelMatch = text.match(/(\d{2,}(?:\.\d{1,2})?)\s*NET/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  // Support '100 net', 'net 100', '100.00 net', '100net', 'net: 100', etc.
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/(\d{2,}(?:\.\d{1,2})?)\s*net\b/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/net\s*:?\s*(\d{2,}(?:\.\d{1,2})?)/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  // Support price as standalone '150£', '150.00£' or '£150', '£150.00' on its own line
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/^(\d{2,}(?:\.\d{1,2})?)£$/m);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/^£(\d{2,}(?:\.\d{1,2})?)$/m);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  // Support 'Fare: 95', 'Fare: 95.00', 'Fare 95', 'fare 60.00' format (case insensitive)
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/\bfare\s+(\d{2,}(?:\.\d{1,2})?)/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  if (!priceLabelMatch) {
    priceLabelMatch = text.match(/\bfare\s*[:\-]\s*(\d{2,}(?:\.\d{1,2})?)/i);
    if (priceLabelMatch && isPartOfPostcode(priceLabelMatch[1], text)) {
      priceLabelMatch = null;
    }
  }
  
  // Add support for 'Cash' payments: look for 'Cash' and a price (2+ digits, with optional decimals)
  let cashMatch = text.match(/(\d{2,}(?:\.\d{1,2})?)\s*Cash/i);
  if (cashMatch && isPartOfPostcode(cashMatch[1], text)) {
    cashMatch = null;
  }
  
  // FALLBACK: Recognize standalone decimal numbers like 60.00, 45.00, 25.00 (must be on their own line or word boundary)
  if (!priceLabelMatch && !cashMatch) {
    // Match numbers with exactly 2 decimals (like 60.00, 45.00) that are 10 or more
    const standaloneDecimalMatch = text.match(/\b(\d{2,}\.\d{2})\b/);
    if (standaloneDecimalMatch && !isPartOfPostcode(standaloneDecimalMatch[1], text)) {
      priceLabelMatch = standaloneDecimalMatch;
    }
  }
  
  if (typeof result.price === 'undefined' && !priceLabelMatch && cashMatch) {
    result.price = parseFloat(cashMatch[1]);
    result.priceType = 'Cash';
  } else if (typeof result.price === 'undefined' && priceLabelMatch) {
    const extractedPrice = parseFloat(priceLabelMatch[1]);
    if (extractedPrice >= 10) {
      result.price = extractedPrice;
      // If 'Cash' is present anywhere, mark as cash
      if (/\bCash\b/i.test(text)) {
        result.priceType = 'Cash';
      }
      // If 'same day payment' or 'same day' is present, mark as sameDayPayment
      if (/same day payment|same day/i.test(text)) {
        result.sameDayPayment = true;
      }
    }
  }

  // Detect 'Car Park' as an extra charge or note
  if (/car park/i.test(text)) {
    result.carPark = true;
  }
  
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

  // Normalize common typo 'Tommorow' to 'Tomorrow' (and similar variants)
  cleanText = cleanText.replace(/\bTomm?o?r?o?w\b/gi, 'Tomorrow');
  text = text.replace(/\bTomm?o?r?o?w\b/gi, 'Tomorrow');
  
  // Filter out undefined, null, or empty locations
  locations = locations.filter(loc => loc && loc.trim());
  
  // Clean locations: remove colons, commas, semicolons at the start or end
  locations = locations.map(loc => {
    if (!loc) return loc;
    // Remove : ; , at the beginning or end
    return loc.trim().replace(/^[:\-;,\s]+/, '').replace(/[:\-;,\s]+$/, '').trim();
  });
  // Exclude 'Today' (case-insensitive) from locations
  locations = locations.filter(loc => loc.toLowerCase() !== 'today');
  
  // Simple logic: first location is pickup, second is dropoff
  // Only set if not already set by explicit Pickup:/Dropoff: patterns
  if (locations.length >= 2) {
    if (!result.pickup) result.pickup = await expandLocation(locations[0]);
    if (!result.dropoff) result.dropoff = await expandLocation(locations[1]);
  } else if (locations.length === 1) {
    if (!result.pickup) result.pickup = await expandLocation(locations[0]);
  }
  
  // Clean pickup and dropoff if already set (remove colons, etc)
  if (result.pickup) {
    result.pickup = result.pickup.trim().replace(/^[:\-;,\s]+/, '').replace(/[:\-;,\s]+$/, '').trim();
  }
  if (result.dropoff) {
    result.dropoff = result.dropoff.trim().replace(/^[:\-;,\s]+/, '').replace(/[:\-;,\s]+$/, '').trim();
  }
  
  // Extract price with better pattern matching including PAYMENT format
  // Prioritize patterns with "net" keyword first
  let priceMatch = cleanText.match(/\*?payment[\s\-]*£(\d+(?:\.\d{2})?)(?:\s*same\s*day)?\*?/i) || // *PAYMENT- £75 SAME DAY* or PAYMENT- £75
                    cleanText.match(/payment[\s\-]*£(\d+(?:\.\d{2})?)/i) || // PAYMENT- £75
                    cleanText.match(/£\s*(\d+(?:\.\d{2})?)\s*net\s*cash/i) || // £80 Net cash
                    cleanText.match(/(\d+)\s*net\s*cash/i) || // 80 net cash
                    cleanText.match(/£\s*(\d+(?:\.\d{2})?)\s*cash/i) || // £80 cash
                    cleanText.match(/(\d+)\s*net/i) || // 47net, 48 net (prioritize before other patterns)
                    cleanText.match(/fare\s+£(\d+(?:\.\d{2})?)\s*net/i) || // FARE £70 NET
                    cleanText.match(/(\d+)£\s*net/i) || // 48£ Net
                    cleanText.match(/price\s*[;:\-]?\s*£?\s*(\d+(?:\.\d{2})?)\s*net/i) ||
                    cleanText.match(/fare\s*[;:\-]\s*£?\s*(\d+(?:\.\d{2})?)\s*(?:net)?/i) || // Fare; £107 net or Fare: 60
                    cleanText.match(/net\s*fare\s*[;:]\s*£?(\d+(?:\.\d{2})?)/i) ||
                    cleanText.match(/£\s*(\d+(?:\.\d{2})?)\s*net/i) ||
                    cleanText.match(/(?:net\s*fare|price|fare|clear)\s*[:\-]?\s*£?\s*(\d+(?:\.\d{2})?)/i) || 
                    cleanText.match(/saloon\s*:\s*(\d+)£/i) || // Saloon : 65£
                    cleanText.match(/£\s*(\d+(?:\.\d{2})?)/) ||
                    cleanText.match(/(\d+)\s*(?:pounds|gbp)\b/i) ||
                    cleanText.match(/\b(\d{2,3})\b(?!\d*[\.\.\-]\d)/); // Standalone 2-3 digit numbers (last resort)

  // Prevent time-like patterns (e.g., '05 40', '05:40', '05 40 AM') from being parsed as price
  if (priceMatch && (typeof result.price === 'undefined' || result.price === null)) {
    const val = priceMatch[1];
    const matchedText = priceMatch[0]; // Get the full matched text, not just the captured group

    // If the matched text contains £, 'net', 'cash', 'payment', 'fare', it's definitely a price
    if (/£|net|cash|payment|fare|price/i.test(matchedText)) {
      result.price = parseFloat(val);
      // Check if it's a cash payment
      if (/\bcash\b/i.test(matchedText)) {
        result.priceType = 'Cash';
      }
    } else {
      // Only check for time-like patterns if we're not sure it's a price
      const timeLikePattern = new RegExp(`\\b${val}(:|\\s)\\d{2}(\\s*(AM|PM))?\\b`, 'i');
      if (!timeLikePattern.test(cleanText) && parseFloat(val) >= 10) {
        result.price = parseFloat(val);
      }
    }
  }
  
  // Enhanced date parsing with full date format support
  const dateMatch = cleanText.match(/\b(tonight)\b/i) || // TONIGHT
                   // Full date with day name: Friday 12th December 2025
                   cleanText.match(/((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i) ||
                   cleanText.match(/(\d{1,2}\-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\-\d{4})/i) || // 10-Dec-2025
                   cleanText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i) || // 03 Dec 2025 or 21 Nov 2025
                   cleanText.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i) || // Nov 20, 2025 or Dec 10, 2025
                   cleanText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+\d{4})?)/i) || // 20th Nov or 21st Nov 2025
                   cleanText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/) ||
                   cleanText.match(/\b(today|tomorrow)\b/i) ||
                   cleanText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i) ||
                   // Date with day name but no month: Wednesday 19th 2025
                   cleanText.match(/((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4})/i) ||
                   cleanText.match(/Date\s*:\s*ASAP(\s*\(Passenger ready\))?/i); // Date: ASAP or Date: ASAP (Passenger ready)
  
  // Check for day name (MONDAY, TUESDAY, etc.) for next 7 days
  const dayNameMatch = cleanText.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  
  if (asapPresent) {
    // If ASAP is present anywhere, always set date to today and time to ASAP
    const today = new Date();
    const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
    result.date = `${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (Today, ${dayName})`;
    result.time = 'ASAP';
  } else if (dateMatch) {
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
    } else if (dateMatch[0].toUpperCase().startsWith('DATE: ASAP')) {
      // Support for 'Date: ASAP' and 'Date: ASAP (Passenger ready)'
      result.date = dateMatch[0].replace(/date\s*:\s*/i, '').trim();
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
        // Handle 10-Dec-2025 format
        const dashMonthMatch = dateStr.match(/(\d{1,2})\-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\-(\d{4})/i);
        const shortMonthMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        // Handle Dec 10, 2025 format (month-day-year)
        const monthDayYearMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i);
        
        if (dashMonthMatch) {
          const day = dashMonthMatch[1];
          const year = dashMonthMatch[3];
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(dashMonthMatch[2].toLowerCase()));
          parsedDate = new Date(year, monthIndex, day);
          const dayName = parsedDate.toLocaleDateString('en-GB', { weekday: 'long' });
          const fullMonth = monthNames[monthIndex];
          result.date = `${day} ${fullMonth} ${year} (${dayName})`;
        } else if (monthDayYearMatch) {
          const day = monthDayYearMatch[2];
          const year = monthDayYearMatch[3];
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(monthDayYearMatch[1].toLowerCase()));
          parsedDate = new Date(year, monthIndex, day);
          const dayName = parsedDate.toLocaleDateString('en-GB', { weekday: 'long' });
          const fullMonth = monthNames[monthIndex];
          result.date = `${day} ${fullMonth} ${year} (${dayName})`;
        } else if (shortMonthMatch) {
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
                   cleanText.match(/(?:tomorrow|today|tonight)\s+at\s+(\d{1,2}[:\.]?\d{2})\s*(?:am|pm)/i) || // TOMORROW AT 23.00PM or TOMORROW AT 23:00PM
                   cleanText.match(/at\s+(\d{1,2}[:\.]?\d{2})\s*(?:am|pm)/i) || // AT 23.00PM or AT 23:00PM
                   cleanText.match(/tonight\s+@\s*(\d{1,2}:\d{2})\s*(?:am|pm)/i) || // TONIGHT @ 21:25 pm
                   cleanText.match(/tomorrow\s+@\s*(\d{1,2}:\d{2})\s*(?:am|pm)?/i) || // TOMORROW @ 09:50 (typo handled by normalization)
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
    // Convert dot to colon if needed (e.g., "23.00" -> "23:00")
    if (/^\d{1,2}\.\d{2}$/.test(time)) {
      time = time.replace('.', ':');
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
  
  // Parse passenger count from indicators like "(1 Persons)" or "🔴🔴" (red dots) or "Seven Passenger"
  const passengerCountMatch = cleanText.match(/\((\d+)\s*persons?\)/i);
  const redDotsMatch = cleanText.match(/(🔴+)/);
  const wordPassengerMatch = cleanText.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+passengers?\b/i);
  
  let passengerCount = null;
  if (passengerCountMatch) {
    passengerCount = parseInt(passengerCountMatch[1]);
  } else if (redDotsMatch) {
    // Count red dots to determine passenger count
    passengerCount = redDotsMatch[1].length;
  } else if (wordPassengerMatch) {
    // Convert word to number
    const wordToNum = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    passengerCount = wordToNum[wordPassengerMatch[1].toLowerCase()];
  }
  
  // Parse vehicle type - comprehensive patterns for all variations including passenger count and 'X seater' patterns
  let vehicleMatch = cleanText.match(/\b(exec\s*\/\/\/?\s*e\s*class\s*or\s*similar|e\s*class\s*or\s*similar|e\s*class|e-class|estate\s*car|saloon\s*car|ex[e|c]cutive\s*car|ex[e|c]cutive|mpv\s*8|mpvs|mpv|9\s*seater|8\s*seater|7\s*seater|minivan|minibus|estate|saloon|any\s*car|any\s*tesla|tesla|electric\s*car|electric)\b/gi);
  // Add support for '4 seater', '5 seater', etc.
  if (!vehicleMatch) {
    vehicleMatch = cleanText.match(/\b(\d{1,2}\s*seater)\b/i);
  }
  if (vehicleMatch) {
    // Get the first match and format it nicely
    let vehicle = vehicleMatch[0].trim();
    // Standardize the formatting for known types
    if (/tesla\s+or\s+(smiler|similar)/i.test(text)) {
      result.vehicleType = 'Tesla or Similar';
    } else
    if (vehicle.match(/exec\s*\/\/\/?\s*e\s*class\s*or\s*similar/i)) {
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
    } else if (vehicle.match(/mpvs/i)) {
      result.vehicleType = 'MPV';
    } else if (vehicle.match(/9\s*seater/i)) {
      result.vehicleType = '9 Seater';
    } else if (vehicle.match(/8\s*seater/i)) {
      result.vehicleType = '8 Seater';
    } else if (vehicle.match(/7\s*seater/i)) {
      result.vehicleType = '7 Seater';
    } else if (vehicle.match(/any\s*car/i)) {
      result.vehicleType = 'Any Car';
    } else if (vehicle.match(/any\s*tesla/i)) {
      result.vehicleType = 'Any Tesla';
    } else if (vehicle.match(/tesla/i)) {
      result.vehicleType = 'Tesla';
    } else if (vehicle.match(/electric\s*car/i)) {
      result.vehicleType = 'Electric Car';
    } else if (vehicle.match(/electric/i)) {
      result.vehicleType = 'Electric';
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
    } else if (vehicle.match(/\d{1,2}\s*seater/i)) {
      // For '4 seater', '5 seater', etc., use as-is with capitalization
      result.vehicleType = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);
    } else {
      result.vehicleType = vehicle.charAt(0).toUpperCase() + vehicle.slice(1).toLowerCase();
    }
    // Add passenger count to vehicle type if available and not already present
    if (passengerCount && !result.vehicleType.match(/\d+\s*seater/)) {
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
  
  // CRITICAL FIX: Clean temporal words from pickup and dropoff before returning
  const temporalWords = [
    'tomorrow', 'today', 'tonight', 'morning', 'afternoon', 'evening',
    'same day payment', 'same day',
    'any car', 'anycar', 'saloon', 'mpv', 'mpvs', 'estate', 'exec', 'executive'
  ];

  function cleanTemporalWordsFromLocation(loc) {
    if (!loc) return loc;
    let cleaned = loc;
    // Remove temporal words at any position, case-insensitive, as whole words
    for (const word of temporalWords) {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      cleaned = cleaned.replace(regex, '').replace(/\s{2,}/g, ' ');
    }
    // Remove 'Today:' at the start (with or without space)
    cleaned = cleaned.replace(/^Today\s*:/i, '');
    // Remove leading/trailing punctuation like :, ;, .
    cleaned = cleaned.replace(/^[\s:;,.]+|[\s:;,.]+$/g, '');
    return cleaned.trim();
  }

  if (result.pickup) {
    const before = result.pickup;
    result.pickup = cleanTemporalWordsFromLocation(result.pickup);
    console.log('🧹 Parser cleaning pickup:', before, '→', result.pickup);
  }
  if (result.dropoff) {
    const before = result.dropoff;
    result.dropoff = cleanTemporalWordsFromLocation(result.dropoff);
    console.log('🧹 Parser cleaning dropoff:', before, '→', result.dropoff);
  }
  
  return result;
}