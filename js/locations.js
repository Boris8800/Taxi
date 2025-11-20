// Location extraction and expansion utilities
function extractLocations(text) {
  const locations = [];
  const lowerText = text.toLowerCase();
  
  // PRIORITY 0: Check for vertical listings with "Airport Job" pattern FIRST
  // Pattern: "Heathrow Airport Job\nHeathrow Airport\nE5 0QQ"
  // In this format: Airport name is ALWAYS pickup, Postcode is ALWAYS dropoff
  const airportJobMatch = text.match(/(heathrow|gatwick|stansted|luton|london city|birmingham|manchester)\s+airport\s+job/gi);
  if (airportJobMatch) {
    // Split into lines and look for airport name and postcode
    const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    let airportLocation = null;
    let postcodeLocation = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains airport name (and isn't the job title)
      // Allow for trailing punctuation like periods
      if (!airportLocation && line.match(/(heathrow|gatwick|stansted|luton|lhr|lgw|stn|ltn)(?:\s+airport)?[\s\.]*$/gi) && !line.match(/job/i)) {
        airportLocation = line.trim().replace(/\.$/, '').trim(); // Keep original case
      }
      
      // Check if line is a full postcode
      if (!postcodeLocation && line.match(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}$/i)) {
        postcodeLocation = line.trim(); // Keep original case
      }
    }
    
    // For "Airport Job" format: Airport is ALWAYS pickup, Postcode is ALWAYS dropoff
    if (airportLocation && postcodeLocation) {
      locations.push(airportLocation); // Airport = pickup (first position)
      locations.push(postcodeLocation); // Postcode = dropoff (second position)
      return locations;
    }
  }
  
  // PRIORITY 1: Check for "Pick-up is from X drop-off is in Y" format
  // This covers: "Pick-up is from Heathrow Airport drop-off is in SW1X"
  const pickupIsFromMatch = text.match(/pick[\s\-]*up\s+is\s+(?:from|at)\s+([^,\n]+?)(?:\s+drop[\s\-]*off\s+is\s+(?:in|at)\s+([^,\n]+?))?(?=\.|,|\n|$)/gi);
  const dropoffIsInMatch = text.match(/drop[\s\-]*off\s+is\s+(?:in|at)\s+([^,\n]+?)(?=\.|,|\n|$)/gi);
  
  if (pickupIsFromMatch || dropoffIsInMatch) {
    let pickupLoc = null;
    let dropoffLoc = null;
    
    // Extract pickup
    if (pickupIsFromMatch && pickupIsFromMatch[0]) {
      const match = pickupIsFromMatch[0].match(/pick[\s\-]*up\s+is\s+(?:from|at)\s+([^,\n]+?)(?:\s+drop[\s\-]*off|$)/i);
      if (match && match[1]) {
        pickupLoc = match[1].trim(); // Keep original case
      }
    }
    
    // Extract dropoff
    if (dropoffIsInMatch && dropoffIsInMatch[0]) {
      const match = dropoffIsInMatch[0].match(/drop[\s\-]*off\s+is\s+(?:in|at)\s+([^,\n]+?)(?=\.|,|\n|$)/i);
      if (match && match[1]) {
        dropoffLoc = match[1].trim(); // Keep original case
      }
    }
    
    if (pickupLoc && dropoffLoc) {
      locations.push(pickupLoc);
      locations.push(dropoffLoc);
      return locations;
    }
  }
  
  // PRIORITY 2: Check for labeled format "Pickup Location:", "Drop off location:", etc.
  // This covers: "Pickup Locaion:Heathrow Airport" and "Drop off location:London WC1A"
  const pickupLocationMatch = text.match(/pickup\s+(?:locaion|location)\s*:\s*([^\n]+?)(?=\n|$)/gi);
  const dropoffLocationMatch = text.match(/drop\s*(?:[\s\-])?off\s+location\s*:\s*([^\n]+?)(?=\n|$)/gi);
  
  if (pickupLocationMatch || dropoffLocationMatch) {
    let pickupLoc = null;
    let dropoffLoc = null;
    
    // Extract pickup location (preserve original case)
    if (pickupLocationMatch && pickupLocationMatch[0]) {
      const match = pickupLocationMatch[0].match(/pickup\s+(?:locaion|location)\s*:\s*([^\n]+?)(?=\n|$)/i);
      if (match && match[1]) {
        pickupLoc = match[1].trim().replace(/,$/, '').trim(); // Keep original case
      }
    }
    
    // Extract dropoff location (preserve original case)
    if (dropoffLocationMatch && dropoffLocationMatch[0]) {
      const match = dropoffLocationMatch[0].match(/drop\s*(?:[\s\-])?off\s+location\s*:\s*([^\n]+?)(?=\n|$)/i);
      if (match && match[1]) {
        dropoffLoc = match[1].trim().replace(/,$/, '').trim(); // Keep original case
      }
    }
    
    if (pickupLoc && dropoffLoc) {
      locations.push(pickupLoc);
      locations.push(dropoffLoc);
      return locations;
    }
  }
  
  // PRIORITY 3: Check for "Pickup:" and "Drop off:" format with bullet points or asterisks
  // This covers: "* Pickup: Heathrow Airport" and "* Drop off: E4 8YY" and "Pick Up: Location"
  const pickupPatterns = [
    /[\*\•\-]\s*pickup\s*:\s*([^\n\*\•]+?)(?=\n|[\*\•]|$)/gi,
    /pickup\s*:\s*([^\n]+?)(?=\n|$)/gi,
    /pick\s+up\s*:\s*([^\n]+?)(?=\n|$)/gi  // Added "Pick Up:" pattern
  ];
  
  const dropoffPatterns = [
    /[\*\•\-]\s*drop\s*off\s*:\s*([^\n\*\•]+?)(?=\n|[\*\•]|$)/gi,
    /drop\s*off\s*:\s*([^\n]+?)(?=\n|$)/gi,
    /drop\s+off\s*:\s*([^\n]+?)(?=\n|$)/gi  // Added "Drop Off:" pattern
  ];
  
  let pickupFound = false;
  let dropoffFound = false;
  
  // Try to find pickup location
  for (const pattern of pickupPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0 && matches[0][1]) {
      const pickup = matches[0][1].trim().toLowerCase();
      // Clean up any trailing special characters
      const cleanPickup = pickup.replace(/[\*\•\-\⁠]+$/, '').trim();
      if (cleanPickup) {
        locations.push(cleanPickup);
        pickupFound = true;
        break;
      }
    }
  }
  
  // Try to find dropoff location
  for (const pattern of dropoffPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0 && matches[0][1]) {
      const dropoff = matches[0][1].trim().toLowerCase();
      // Clean up any trailing special characters and invisible characters
      const cleanDropoff = dropoff.replace(/[\*\•\-\⁠\u200B-\u200D\uFEFF]+/g, '').trim();
      if (cleanDropoff) {
        locations.push(cleanDropoff);
        dropoffFound = true;
        break;
      }
    }
  }
  
  // If we found both pickup and dropoff, return them
  if (pickupFound && dropoffFound) {
    return locations;
  }
  
  // PRIORITY 1: Check for "X to Y" or "X\nTo\nY" format (first location is pickup, second is dropoff)
  // Check for vertical "To" format first: "Heathrow Airport\nTo\nEX33 1HT"
  const verticalToMatch = text.match(/([^\n]+)\s*\n\s*To\s*\n\s*([^\n]+)/i);
  if (verticalToMatch && verticalToMatch[1] && verticalToMatch[2]) {
    const loc1 = verticalToMatch[1].trim().replace(/,$/, '').trim(); // Remove trailing comma, keep case
    const loc2 = verticalToMatch[2].trim(); // Keep original case
    if (loc1 && loc2) {
      locations.push(loc1); // First location = pickup
      locations.push(loc2); // Second location = dropoff
      return locations;
    }
  }

  // Check for explicit arrow/chevron/emoji format: "Gatwick airport➡️SE1 7NJ", "A -> B", "A => B"
  const arrowPattern = /([^\n➡️➝→\-=>]+?)\s*[➡️➝→\-=>]+\s*([^\n➡️➝→\-=>]+)/;
  const arrowMatch = text.match(arrowPattern);
  if (arrowMatch && arrowMatch[1] && arrowMatch[2]) {
    const loc1 = arrowMatch[1].trim().replace(/,$/, '').trim();
    const loc2 = arrowMatch[2].trim();
    if (loc1 && loc2) {
      locations.push(loc1);
      locations.push(loc2);
      return locations;
    }
  }

  // Check for arrow format: "Stansted ➝ WC2B 5SN" or "LHR → E1 1DU"
  const legacyArrowMatch = text.match(/([^\n➝→]+?)\s*[➝→]\s*([^\n➝→]+)/);
  if (legacyArrowMatch && legacyArrowMatch[1] && legacyArrowMatch[2]) {
    const loc1 = legacyArrowMatch[1].trim().replace(/,$/, '').trim(); // Remove trailing comma, keep case
    const loc2 = legacyArrowMatch[2].trim(); // Keep original case
    if (loc1 && loc2) {
      locations.push(loc1); // First location = pickup
      locations.push(loc2); // Second location = dropoff
      return locations;
    }
  }
  
  // Check for dash-separated format: "Heathrow------SW1X 9NU" or "LHR----E4 8YY"
  const dashMatch = text.match(/\b([A-Za-z][A-Za-z0-9\s,]*?)\s*-{2,}\s*([A-Z]{1,2}\d{1,2}[A-Z]?(?:\s+\d[A-Z]{2})?)\b/i);
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    const loc1 = dashMatch[1].trim().replace(/,$/, '').trim(); // Remove trailing comma, keep case
    const loc2 = dashMatch[2].trim(); // Keep original case
    if (loc1 && loc2) {
      locations.push(loc1); // First location = pickup
      locations.push(loc2); // Second location = dropoff
      return locations;
    }
  }
  
  // This covers: "Heathrow to CT14 6DL", "LHR to SW1A 0PW", etc.
  const toPatterns = [
    // "From X To Y" format: "From Stansted To W6 8DR"
    /\bfrom\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|\w+)\s+to\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\b/gi,
    /\bfrom\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|\w+)\b/gi,
    /\bfrom\s+([^\n]+?)\s+to\s+([^\n]+?)(?=\n|$)/gi,
    // Full postcode to full postcode: "SW1A 0PW to CT14 6DL"
    /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\s+to\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\b/gi,
    // Location name to full postcode: "Gatwick to N11 1PN" (must be at least 3 chars and not AM/PM)
    /\b([a-z]{3,}(?:\s+[a-z]+)*)\s+to\s+([A-Z]{1,2}\d{1,2}[A-Z]?(?:\s+\d[A-Z]{2})?)\b/gi,
    // Full postcode to location name: "CT14 6DL to Heathrow"
    /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\s+to\s+([a-z]{3,}(?:\s+[a-z]+)*)\b/gi,
    // Partial postcode to partial postcode: "N8 7RU to LGW"
    /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s+to\s+([A-Z0-9\s]{2,8})\b/gi,
    // Location to location: "Heathrow to Gatwick", "LHR to LGW" (at least 3 chars)
    /\b([a-z]{3,}(?:\s+[a-z]+)*)\s+to\s+([a-z]{3,}(?:\s+[a-z]+)*)\b/gi,
    // X TO Y uppercase format
    /\b([A-Z]{1,4})\s+TO\s+([A-Z0-9\s]{2,8})\b/g
  ];
  
  for (const pattern of toPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const match = matches[0]; // Take first match
      if (match[1] && match[2]) {
        const loc1 = match[1].trim(); // Keep original case
        const loc2 = match[2].trim(); // Keep original case
        // First location is pickup, second is dropoff
        locations.push(loc1);
        locations.push(loc2);
        return locations; // Return immediately - we found our pickup and dropoff
      }
    }
  }
  
  // PRIORITY 3: Split text by common separators to find individual postcodes
  // This handles cases like "SW1A 0PW‼️GL5 2RR" by looking for postcode patterns anywhere
  const fullPostcodePattern = /([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})/g;
  const fullPostcodeMatches = text.match(fullPostcodePattern);
  if (fullPostcodeMatches) {
    fullPostcodeMatches.forEach(pc => {
      const normalized = pc.toLowerCase().trim();
      if (!locations.includes(normalized)) {
        locations.push(normalized);
      }
    });
  }
  
  // If we found 2 postcodes, return them (pickup and dropoff)
  if (locations.length >= 2) {
    return locations.slice(0, 2);
  }

  // FALLBACK: If not enough locations found, try to extract from 'Pickup:' and 'Dropoff:' anywhere in the text (case-insensitive)
  // This is a last-resort fallback and does not interfere with earlier logic
  const pickupFallback = text.match(/pickup\s*:\s*([^\n\r]+)/i);
  const dropoffFallback = text.match(/drop\s*off\s*:\s*([^\n\r]+)/i);
  if (pickupFallback && dropoffFallback) {
    const pickupLoc = pickupFallback[1].trim();
    const dropoffLoc = dropoffFallback[1].trim();
    if (pickupLoc && dropoffLoc) {
      return [pickupLoc, dropoffLoc];
    }
  }
  
  // PRIORITY 4: Continue looking for other location patterns (terminals, airports, etc.)
  // Enhanced patterns for WhatsApp-style messages including new format
  const patterns = [
    // Pick Up: / Drop Off: format with specific extraction (process first for priority)
    /pick\s*up\s*:\s*([^\n]+?)(?=\n|$)/gi,
    /drop\s*off\s*:\s*([^\n]+?)(?=\n|$)/gi,
    // Partial postcodes (like GL5, RH8)
    /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/gi,
    // X to Y format with dashes (e.g., Gatwick--------Ec2A)
    /\b([a-z0-9\s]{2,20})-{2,}([a-z0-9\s]{2,20})\b/gi,
    // Airport terminals (LHR 2, LHR T2, etc.)
    /\b(LHR\s*[T]?\s*[1-5])\b/gi,
    /\b(LGW\s*(?:North|South)?)\b/gi,
    /\b(terminal\s+[1-5])\b/gi,
    /\b(t[1-5])\b/gi,
    /\b(heathrow\s+(?:airport\s+)?t[1-5]|heathrow\s+(?:airport\s+)?terminal\s+[1-5])\b/gi,
    /\b(gatwick\s+(?:airport\s+)?(?:north|south)\s+terminal?)\b/gi,
    // Simple location names
    /\b(lhr|lgw|stn|ltn|lcy|brs|bhx|man|gatwick|heathrow|stansted|luton|bristol)\b/gi
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      // For "X TO Y" or "X----Y" patterns (two locations)
      if (match[1] && match[2] && (pattern.toString().includes('TO') || pattern.toString().includes('-{2,}'))) {
        const loc1 = match[1].toLowerCase().trim();
        const loc2 = match[2].toLowerCase().trim();
        if (!locations.includes(loc1)) {
          locations.push(loc1);
        }
        if (!locations.includes(loc2)) {
          locations.push(loc2);
        }
      } else {
        // For single location patterns
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const loc = match[i].toLowerCase().trim();
            // Skip if this is a partial postcode that's already covered by a full postcode
            const isPartialOfExisting = locations.some(existing => {
              return existing.startsWith(loc + ' ') && existing.match(/^[a-z]{1,2}\d{1,2}[a-z]?\s+\d[a-z]{2}$/);
            });
            if (!locations.includes(loc) && !isPartialOfExisting) {
              locations.push(loc);
            }
          }
        }
      }
    }
  }
  
  return locations;
}

async function expandLocation(location) {
  const locTrimmed = location.trim();
  const locLower = locTrimmed.toLowerCase();
  
  // PRIORITY 1: If location contains a comma, preserve it exactly as entered (full address)
  if (locTrimmed.includes(',')) {
    return locTrimmed;
  }
  
  // PRIORITY 2: Handle airport codes with terminals
  // LHR 2, LHR T2, LHRT2, LHR Terminal 2 → London Heathrow Airport Terminal 2
  const airportTerminalPatterns = [
    { regex: /^lhr\s*t?\s*([1-5])$/i, name: 'London Heathrow Airport' },
    { regex: /^lgw\s*[ns]\s*$/i, name: 'London Gatwick Airport' }, // LGW N, LGW S
    { regex: /^stn\s*$/i, name: 'London Stansted Airport' },
    { regex: /^ltn\s*$/i, name: 'London Luton Airport' },
    { regex: /^lcy\s*$/i, name: 'London City Airport' },
    { regex: /^brs\s*$/i, name: 'Bristol Airport' }
  ];
  
  for (const pattern of airportTerminalPatterns) {
    const match = locLower.match(pattern.regex);
    if (match && match[1]) {
      return `${pattern.name} Terminal ${match[1]}`;
    }
  }
  
  // PRIORITY 3: Handle airport names with terminals
  // "Heathrow T3", "heathrow terminal 3", "Gatwick North" → Full name with terminal
  const airportNameTerminal = [
    { keywords: ['heathrow'], name: 'London Heathrow Airport', terminalRegex: /[t\s]([1-5])/ },
    { keywords: ['gatwick'], name: 'London Gatwick Airport', terminalRegex: /(north|south|n|s)/i },
    { keywords: ['stansted'], name: 'London Stansted Airport', terminalRegex: null },
    { keywords: ['luton'], name: 'London Luton Airport', terminalRegex: null },
    { keywords: ['city airport', 'london city'], name: 'London City Airport', terminalRegex: null }
  ];
  
  for (const airport of airportNameTerminal) {
    const hasKeyword = airport.keywords.some(kw => locLower.includes(kw));
    if (hasKeyword) {
      if (airport.terminalRegex) {
        const termMatch = locLower.match(airport.terminalRegex);
        if (termMatch) {
          const terminal = termMatch[1].toUpperCase();
          // Map N→North, S→South for Gatwick
          if (terminal === 'N') return `${airport.name} Terminal North`;
          if (terminal === 'S') return `${airport.name} Terminal South`;
          if (terminal.toLowerCase() === 'north') return `${airport.name} Terminal North`;
          if (terminal.toLowerCase() === 'south') return `${airport.name} Terminal South`;
          return `${airport.name} Terminal ${terminal}`;
        }
      }
      return airport.name;
    }
  }
  
  // PRIORITY 4: Handle bare airport codes (LHR, LGW, STN, LTN, LCY, BRS)
  const airportCodes = {
    'lhr': 'London Heathrow Airport',
    'lgw': 'London Gatwick Airport',
    'stn': 'London Stansted Airport',
    'ltn': 'London Luton Airport',
    'lcy': 'London City Airport',
    'brs': 'Bristol Airport'
  };
  
  if (airportCodes[locLower]) {
    return airportCodes[locLower];
  }
  
  // PRIORITY 5: Handle UK postcodes - fetch full address for complete postcodes
  // Full postcode: "n11 1pn" → fetch full address from Google
  if (locLower.match(/^[a-z]{1,2}\d{1,2}[a-z]?\s+\d[a-z]{2}$/i)) {
    const formattedPostcode = locTrimmed.toUpperCase();
    
    // Try to get full address from Google Geocoding API
    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 
          address: formattedPostcode,
          componentRestrictions: { country: 'GB' }
        }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(formattedPostcode);
          }
        });
      });
    } else {
      return formattedPostcode;
    }
  }
  
  // Partial postcode: "TN21" → "TN21 Heathfield area of East Sussex, United Kingdom"
  if (locLower.match(/^[a-z]{1,2}\d{1,2}[a-z]?$/i)) {
    const formattedPostcode = locTrimmed.toUpperCase();
    
    // Try to get area information from Google Geocoding API
    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      return new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 
          address: formattedPostcode,
          componentRestrictions: { country: 'GB' }
        }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(formattedPostcode);
          }
        });
      });
    } else {
      return formattedPostcode;
    }
  }
  
  // Return original if no expansion/formatting needed
  return locTrimmed;
}