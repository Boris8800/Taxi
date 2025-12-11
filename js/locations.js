// Location extraction and expansion utilities
async function extractLocations(text) {
  const locations = [];
  const lowerText = text.toLowerCase();
  
  // NEW PRIORITY 0: Try location validation with Google Maps first
  // This will find and validate postcodes, cities, airports, and any location Google Maps recognizes
  if (typeof window.extractAndValidateLocations === 'function') {
    try {
      const validated = await window.extractAndValidateLocations(text);
      
      // If we found both valid pickup and dropoff locations, use them
      if (validated.pickup && validated.dropoff) {
        console.log('✅ Using validated locations from Google Maps');
        console.log('   Pickup:', validated.pickup.location, '→', validated.pickup.formattedAddress);
        console.log('   Dropoff:', validated.dropoff.location, '→', validated.dropoff.formattedAddress);
        locations.push(validated.pickup.location);
        locations.push(validated.dropoff.location);
        return locations;
      }
      
      // If we only found pickup, use it and continue searching for dropoff
      if (validated.pickup) {
        console.log('✅ Using validated pickup location from Google Maps:', validated.pickup.location);
        locations.push(validated.pickup.location);
      }
      
      // If we only found dropoff, continue searching for pickup
      if (validated.dropoff && locations.length === 0) {
        console.log('✅ Using validated dropoff location from Google Maps:', validated.dropoff.location);
        locations.push(validated.dropoff.location);
      }
      
      // If we found both, return early
      if (locations.length >= 2) {
        return locations;
      }
    } catch (error) {
      console.warn('⚠️ Error validating locations with Google Maps:', error);
      // Continue with traditional extraction methods if validation fails
    }
  }
  
  // PRIORITY 1: Check for vertical listings with "Airport Job" pattern
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
  // Patterns for explicit pickup and dropoff lines (case-insensitive, robust)
  const pickupPatterns = [
    /^\s*pickup\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?$/gmi, // Pickup: TOMORROW STN (captures STN after temporal word)
    /pickup\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // Pickup: TOMORROW STN
    /pickup\s+:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // Pickup : TOMORROW STN
    /pick\s+u\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // PICK U : (typo)
    /pick\s+up\s+(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // Pick up TOMORROW STN
    /pick\s+u\s+(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // Pick u (typo)
    /[\*\•\-]?\s*pick\s*-?\s*up\s*[:\s]\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r\*\•]+?)(?:\s*\.\s*)?(?=\n|[\*\•]|$)/gi,
    /[\*\•\-]?\s*pick\s*-?\s*u\s*[:\s]\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r\*\•]+?)(?:\s*\.\s*)?(?=\n|[\*\•]|$)/gi,
    /pick\s*up\s*[:-]?\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /pick\s*u\s*[:-]?\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi
  ];

  const dropoffPatterns = [
    /^\s*dropoff\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?$/gmi, // Dropoff: TOMORROW location
    /^\s*drop[\s\-]*off\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?$/gmi,
    /dropoff\s+:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /dropoff\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /drop\s+of\s*:\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /drop\s+off\s+([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // Drop off   Gatwick Airport (multiple spaces)
    /drop\s+of\s+(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, // Drop of (typo)
    /[\*\•\-]?\s*drop\s*-?\s*off\s*[:\s]\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r\*\•]+?)(?:\s*\.\s*)?(?=\n|[\*\•]|$)/gi,
    /[\*\•\-]?\s*drop\s*-?\s*of\s*[:\s]\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r\*\•]+?)(?:\s*\.\s*)?(?=\n|[\*\•]|$)/gi,
    /drop\s*off\s*[:-]?\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /drop\s*of\s*[:-]?\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /drop\s+off\s*[:-]?\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
    /drop\s+of\s*[:-]?\s*(?:tomorrow|today|tonight|morning|afternoon|evening)?\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi
  ];
  
  let pickupFound = false;
  let dropoffFound = false;
  
  // Helper function to check if text looks like a date
  function isDateString(text) {
    // Check for full date patterns like "Friday 12th December 2025"
    if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(text)) {
      return true;
    }
    // Check for other date patterns
    if (/\b\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i.test(text)) {
      return true;
    }
    // Check for date with day name but no month: "Wednesday 19th 2025"
    if (/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4}\b/i.test(text)) {
      return true;
    }
    return false;
  }
  
  // Try to find pickup location
  for (const pattern of pickupPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0 && matches[0][1]) {
      let pickup = matches[0][1].trim();
      
      // CRITICAL: Skip if this looks like a date
      if (isDateString(pickup)) {
        console.log(`🗓️ Skipping pickup "${pickup}" - it's a date, not a location`);
        continue;
      }
      
      // Clean up: remove "PICK UP", "PICK U", "Pickup", etc if still present
      pickup = pickup.replace(/^(pick\s*u[p]?|pickup?)\s*:?\s*/gi, '').trim();
      // Clean up temporal words that are not part of location
      pickup = pickup.replace(/^(tomorrow|today|tonight|morning|afternoon|evening)\s+/gi, '').trim();
      // Clean up any trailing/leading special characters and colons
      pickup = pickup.replace(/^[:\-;,\s\*\•⁠]+/, '').replace(/[\*\•\-⁠:;,\s]+$/, '').trim();
      if (pickup) {
        locations[0] = pickup; // Always set as pickup
        pickupFound = true;
        break;
      }
    }
  }

  // Try to find dropoff location
  for (const pattern of dropoffPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0 && matches[0][1]) {
      let dropoff = matches[0][1].trim();
      
      // CRITICAL: Skip if this looks like a date
      if (isDateString(dropoff)) {
        console.log(`🗓️ Skipping dropoff "${dropoff}" - it's a date, not a location`);
        continue;
      }
      
      // Clean up: remove "DROP OFF", "DROP OF", "Dropoff", etc if still present
      dropoff = dropoff.replace(/^(drop\s*off?|dropoff?)\s*:?\s*/gi, '').trim();
      // Clean up temporal words that are not part of location
      dropoff = dropoff.replace(/^(tomorrow|today|tonight|morning|afternoon|evening)\s+/gi, '').trim();
      // Clean up any trailing/leading special characters, colons, and invisible characters
      dropoff = dropoff.replace(/^[:\-;,\s\*\•⁠\u200B-\u200D\uFEFF]+/, '').replace(/[\*\•\-⁠:;,\s\u200B-\u200D\uFEFF]+$/, '').trim();
      if (dropoff) {
        locations[1] = dropoff; // Always set as dropoff
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
    // Full postcode to airport code: "SS9 4SZ to LHR" (stop at word boundary - must be 3-4 letter airport code only)
    /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\s+to\s+(LHR|LGW|STN|LTN|LCY|BRS|BHX|MAN)\b/gi,
    // Airport code to full postcode: "LHR to SS9 4SZ"
    /\b(LHR|LGW|STN|LTN|LCY|BRS|BHX|MAN)\s+to\s+([A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2})\b/gi,
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

  // FALLBACK: If not enough locations found, try to extract from 'Pickup:' and 'Dropoff:' or 'Pick-up:' and 'Drop-off:' anywhere in the text (case-insensitive)
  // This is a last-resort fallback and does not interfere with earlier logic
  // Anchor to line start and allow optional whitespace before label to avoid matching inside words
  let pickupFallback = text.match(/^\s*pickup\s*:\s*([^\n\r]+)/im);
  let dropoffFallback = text.match(/^\s*drop\s*off\s*:\s*([^\n\r]+)/im);
  if (!(pickupFallback && dropoffFallback)) {
    // Try hyphenated forms if not found
    pickupFallback = text.match(/^\s*pick-up\s*:\s*([^\n\r]+)/im);
    dropoffFallback = text.match(/^\s*drop-off\s*:\s*([^\n\r]+)/im);
  }
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
  // Safety check: return empty string if location is undefined or null
  if (!location) {
    return '';
  }
  
  const locTrimmed = location.trim();
  const locLower = locTrimmed.toLowerCase();
  
  // PRIORITY 1: If location contains a comma, preserve it exactly as entered (full address)
  if (locTrimmed.includes(',')) {
    return locTrimmed;
  }
  
  // PRIORITY 2: For known airports and cities, validate with Google Maps first
  // This ensures we get the correct formatted address
  const knownAirports = [
    'heathrow', 'gatwick', 'stansted', 'luton', 'london city',
    'lhr', 'lgw', 'stn', 'ltn', 'lcy',
    'manchester', 'man', 'birmingham', 'bhx', 'bristol', 'brs',
    'edinburgh', 'edi', 'glasgow', 'gla', 'newcastle', 'ncl',
    'leeds', 'lba', 'liverpool', 'lpl'
  ];
  
  // Check if it's a known airport or city name
  const isKnownLocation = knownAirports.some(keyword => locLower.includes(keyword));
  
  if (isKnownLocation && typeof window.validateLocationWithGoogleMaps === 'function') {
    // For single-word airport names, add "Airport" to help Google Maps
    let searchTerm = locTrimmed;
    if (locLower === 'gatwick' || locLower === 'heathrow' || locLower === 'stansted' || 
        locLower === 'luton' || locLower === 'manchester' || locLower === 'birmingham' || 
        locLower === 'bristol' || locLower === 'edinburgh' || locLower === 'glasgow' || 
        locLower === 'newcastle' || locLower === 'liverpool') {
      searchTerm = locTrimmed + ' Airport';
    }
    
    console.log(`🌍 Validating "${locTrimmed}" (searching: "${searchTerm}") with Google Maps before expansion...`);
    const validation = await window.validateLocationWithGoogleMaps(searchTerm);
    
    if (validation.isValid) {
      console.log(`✅ Google Maps validated: ${validation.formattedAddress}`);
      return validation.formattedAddress;
    } else {
      console.log(`⚠️ Google Maps validation failed: ${validation.reason}, using local expansion`);
    }
  }
  
  // PRIORITY 3: Handle airport codes with terminals
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
      // Special handling for Heathrow - use format Google recognizes
      if (pattern.name === 'London Heathrow Airport') {
        return `Heathrow Terminal ${match[1]}, Longford, UK`;
      }
      return `${pattern.name} Terminal ${match[1]}`;
    }
  }

  // Handle standalone "terminal X" (defaults to Heathrow)
  const standaloneTerminal = locLower.match(/^t\s*([1-5])$|^terminal\s*([1-5])$/i);
  if (standaloneTerminal) {
    const termNum = standaloneTerminal[1] || standaloneTerminal[2];
    return `Heathrow Terminal ${termNum}, Longford, UK`;
  }
  
  // PRIORITY 4: Handle airport names with terminals
  // "Heathrow T3", "heathrow terminal 3", "Gatwick North" → Full name with terminal
  const airportNameTerminal = [
    { keywords: ['heathrow'], name: 'Heathrow', terminalRegex: /(?:terminal\s*|t\s*)([1-5])/i, suffix: ', Longford, UK' },
    { keywords: ['gatwick'], name: 'Gatwick', terminalRegex: /(north|south|n|s)/i, suffix: ', Gatwick, UK' },
    { keywords: ['stansted'], name: 'London Stansted Airport', terminalRegex: null, suffix: ', UK' },
    { keywords: ['luton'], name: 'London Luton Airport', terminalRegex: null, suffix: ', UK' },
    { keywords: ['city airport', 'london city'], name: 'London City Airport', terminalRegex: null, suffix: ', UK' }
  ];
  
  for (const airport of airportNameTerminal) {
    const hasKeyword = airport.keywords.some(kw => locLower.includes(kw));
    if (hasKeyword) {
      if (airport.terminalRegex) {
        const termMatch = locLower.match(airport.terminalRegex);
        if (termMatch) {
          const terminal = termMatch[1].toUpperCase();
          // Map N→North, S→South for Gatwick
          if (terminal === 'N') return `${airport.name} Terminal North${airport.suffix}`;
          if (terminal === 'S') return `${airport.name} Terminal South${airport.suffix}`;
          if (terminal.toLowerCase() === 'north') return `${airport.name} Terminal North${airport.suffix}`;
          if (terminal.toLowerCase() === 'south') return `${airport.name} Terminal South${airport.suffix}`;
          return `${airport.name} Terminal ${terminal}${airport.suffix}`;
        }
      }
      return airport.name + (airport.suffix || '');
    }
  }
  
  // PRIORITY 5: Handle bare airport codes - ALL UK AIRPORTS
  // But first validate with Google Maps if available
  const airportCodes = {
    // London airports
    'lhr': 'London Heathrow Airport',
    'lgw': 'London Gatwick Airport',
    'stn': 'London Stansted Airport',
    'ltn': 'London Luton Airport',
    'lcy': 'London City Airport',
    // Major regional airports
    'bhx': 'Birmingham Airport',
    'man': 'Manchester Airport',
    'edi': 'Edinburgh Airport',
    'gla': 'Glasgow Airport',
    'brs': 'Bristol Airport',
    'ncl': 'Newcastle Airport',
    'lba': 'Leeds Bradford Airport',
    'ema': 'East Midlands Airport',
    // England regional airports
    'sou': 'Southampton Airport',
    'lpl': 'Liverpool John Lennon Airport',
    'dsa': 'Doncaster Sheffield Airport',
    'ext': 'Exeter Airport',
    'boh': 'Bournemouth Airport',
    'nwi': 'Norwich Airport',
    'huy': 'Humberside Airport',
    'mme': 'Durham Tees Valley Airport',
    'nqy': 'Newquay Cornwall Airport',
    // Scotland airports
    'pik': 'Glasgow Prestwick Airport',
    'abz': 'Aberdeen Airport',
    'inv': 'Inverness Airport',
    'dnd': 'Dundee Airport',
    'lsi': 'Sumburgh Airport',
    'syy': 'Stornoway Airport',
    'koi': 'Kirkwall Airport',
    'lwk': 'Lerwick/Tingwall Airport',
    'brr': 'Barra Airport',
    'beb': 'Benbecula Airport',
    'cal': 'Campbeltown Airport',
    'tre': 'Tiree Airport',
    'psl': 'Perth/Scone Airport',
    'ily': 'Islay Airport',
    'eoi': 'Eday Airport',
    // Wales airports
    'cwl': 'Cardiff Airport',
    // Northern Ireland airports
    'bfs': 'Belfast International Airport',
    'bhd': 'George Best Belfast City Airport',
    'ldy': 'City of Derry Airport',
    // Channel Islands
    'gci': 'Guernsey Airport',
    'jer': 'Jersey Airport',
    'aci': 'Alderney Airport',
    // Isle of Man
    'iom': 'Isle of Man Airport',
    // Other regional
    'isc': 'St Mary\'s Airport (Isles of Scilly)',
    'bbp': 'Bembridge Airport',
    'sen': 'Southend Airport',
    'ceg': 'Hawarden Airport'
  };
  
  if (airportCodes[locLower]) {
    const airportName = airportCodes[locLower];
    
    // Validate with Google Maps if available
    if (typeof window.validateLocationWithGoogleMaps === 'function') {
      console.log(`🌍 Validating airport code "${locTrimmed}" (${airportName}) with Google Maps...`);
      const validation = await window.validateLocationWithGoogleMaps(airportName);
      
      if (validation.isValid) {
        console.log(`✅ Google Maps validated: ${validation.formattedAddress}`);
        return validation.formattedAddress;
      } else {
        console.log(`⚠️ Google Maps validation failed, using airport name: ${airportName}`);
      }
    }
    
    return airportName;
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