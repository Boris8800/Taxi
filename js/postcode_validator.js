// Location validation using Google Maps Geocoding API

/**
 * Extracts all potential UK postcodes from a text message
 * Supports both full postcodes (SW1A 1AA) and partial/outward codes (WC2N, SW1A)
 * @param {string} text - The text to search for postcodes
 * @returns {Array<string>} - Array of potential postcodes found
 */
function extractAllPostcodes(text) {
  const postcodes = [];
  
  // Words to exclude (not real postcodes)
  const excludeWords = ['MORROW', 'TOMORROW', 'TODAY', 'ANY CAR', 'ANYCAR', 'TONIGHT', 'MORNING'];
  
  // Airport codes that might look like postcodes - ALL UK AIRPORTS
  const airportCodes = [
    // London airports
    'LHR', 'LGW', 'STN', 'LTN', 'LCY',
    // Major regional airports
    'BHX', 'MAN', 'EDI', 'GLA', 'BRS', 'NCL', 'LBA', 'EMA',
    // Other England airports
    'SOU', 'LPL', 'DSA', 'EXT', 'BOH', 'NWI', 'HUY', 'MME', 'NQY',
    // Scotland airports
    'PIK', 'ABZ', 'INV', 'DND', 'LSI', 'SYY', 'KOI', 'LWK', 'BRR', 'BEB', 'CAL', 'TRE', 'PSL', 'ILY', 'EOI',
    // Wales airports
    'CWL',
    // Northern Ireland airports
    'BFS', 'BHD', 'LDY',
    // Channel Islands
    'GCI', 'JER', 'ACI',
    // Isle of Man
    'IOM',
    // Other regional
    'ISC', 'BBP', 'SEN', 'CEG'
  ];
  
  // UK Postcode patterns
  // Full postcode: SW1A 1AA, E1 6AN, etc.
  const fullPostcodePattern = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/gi;
  // Partial/Outward code: WC2N, SW1A, E1, etc. (used when full postcode not available)
  const partialPostcodePattern = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/gi;
  
  // First, try to find full postcodes
  let matches = [...text.matchAll(fullPostcodePattern)];
  
  // If no full postcodes found, try partial postcodes
  if (matches.length === 0) {
    matches = [...text.matchAll(partialPostcodePattern)];
  }
  
  for (const match of matches) {
    let postcode = match[1].trim().toUpperCase();
    // Normalize: ensure single space between outward and inward parts (if full postcode)
    postcode = postcode.replace(/\s+/g, ' ');
    
    // Get context around the match to check for excluded words
    const matchIndex = match.index;
    const contextBefore = text.substring(Math.max(0, matchIndex - 20), matchIndex).toUpperCase();
    const contextAfter = text.substring(matchIndex, Math.min(text.length, matchIndex + postcode.length + 20)).toUpperCase();
    const fullContext = contextBefore + contextAfter;
    
    // Check if it's in the exclude list or if excluded words are in context
    let shouldExclude = false;
    for (const excluded of excludeWords) {
      if (postcode === excluded || postcode.includes(excluded) || excluded.includes(postcode) || fullContext.includes(excluded)) {
        shouldExclude = true;
        console.log(`Excluding postcode "${postcode}" due to context with "${excluded}"`);
        break;
      }
    }
    
    // Check if it matches an airport code (usually 3 letters)
    if (airportCodes.includes(postcode.replace(/\s/g, ''))) {
      shouldExclude = true;
      console.log(`Excluding "${postcode}" - it's an airport code`);
    }
    
    if (shouldExclude) {
      continue;
    }
    
    // Ensure format is correct: minimum 2 characters for partial, 5 for full
    const minLength = postcode.includes(' ') ? 5 : 2;
    if (postcode.length >= minLength && !postcodes.includes(postcode)) {
      postcodes.push(postcode);
    }
  }
  
  return postcodes;
}

/**
 * Finds the first valid postcode in the text by validating each with Google Maps
 * @param {string} text - The text to search for postcodes
 * @param {string} excludePostcode - Postcode to exclude (already used as pickup)
 * @returns {Promise<Object|null>} - Valid postcode object or null
 */
async function findValidPostcode(text, excludePostcode = null) {
  const postcodes = extractAllPostcodes(text);
  
  console.log(`Found ${postcodes.length} potential postcodes:`, postcodes);
  
  // Validate each postcode with Google Maps until we find a valid one
  for (const postcode of postcodes) {
    // Skip if this is the excluded postcode
    if (excludePostcode && postcode === excludePostcode) {
      console.log(`Skipping ${postcode} (already used)`);
      continue;
    }
    
    // Clean the postcode before validating
    const cleanedPostcode = cleanLocationString(postcode);
    
    console.log(`Validating postcode with Google Maps: ${cleanedPostcode} (original: ${postcode})`);
    const validation = await validateLocationWithGoogleMaps(cleanedPostcode);
    
    if (validation.isValid) {
      console.log(`✓ Valid postcode found: ${cleanedPostcode} → ${validation.formattedAddress}`);
      return {
        location: cleanedPostcode,
        formattedAddress: validation.formattedAddress,
        coordinates: validation.coordinates,
        types: validation.types
      };
    } else {
      console.log(`✗ Invalid postcode: ${cleanedPostcode} (${validation.reason})`);
    }
  }
  
  console.log('No valid postcode found');
  return null;
}


/**
 * Extracts all potential location names (cities, airports, addresses)
 * ONLY extracts known cities and airports - no random words
 * @param {string} text - The text to search for locations
 * @returns {Array<string>} - Array of potential location names found
 */
function extractAllLocationNames(text) {
  const locations = [];
  
  // Known UK airports (case insensitive) - ALL UK AIRPORTS WITH IATA CODES
  const airports = [
    // LONDON AIRPORTS
    // Heathrow
    'Heathrow Airport', 'Heathrow', 'LHR',
    'Heathrow T1', 'Heathrow T2', 'Heathrow T3', 'Heathrow T4', 'Heathrow T5',
    'Heathrow Terminal 1', 'Heathrow Terminal 2', 'Heathrow Terminal 3', 'Heathrow Terminal 4', 'Heathrow Terminal 5',
    'LHR T1', 'LHR T2', 'LHR T3', 'LHR T4', 'LHR T5',
    'LHR Terminal 1', 'LHR Terminal 2', 'LHR Terminal 3', 'LHR Terminal 4', 'LHR Terminal 5',
    // Gatwick
    'Gatwick Airport', 'Gatwick', 'LGW',
    'Gatwick North', 'Gatwick South', 'Gatwick North Terminal', 'Gatwick South Terminal',
    'LGW North', 'LGW South',
    // Stansted
    'Stansted Airport', 'Stansted', 'STN',
    'Stansted Terminal', 'STN Terminal',
    // Luton
    'Luton Airport', 'Luton', 'LTN',
    'Luton Terminal', 'LTN Terminal',
    // London City
    'London City Airport', 'London City', 'LCY',
    'LCY Terminal',
    
    // ENGLAND - MAJOR REGIONAL AIRPORTS
    // Birmingham
    'Birmingham Airport', 'Birmingham', 'BHX',
    // Manchester
    'Manchester Airport', 'Manchester', 'MAN',
    // Bristol
    'Bristol Airport', 'Bristol', 'BRS',
    // Newcastle
    'Newcastle Airport', 'Newcastle', 'NCL',
    // Leeds Bradford
    'Leeds Bradford Airport', 'Leeds Bradford', 'LBA',
    // East Midlands
    'East Midlands Airport', 'East Midlands', 'EMA',
    // Southampton
    'Southampton Airport', 'Southampton', 'SOU',
    // Liverpool
    'Liverpool Airport', 'Liverpool John Lennon Airport', 'Liverpool', 'LPL',
    
    // ENGLAND - OTHER AIRPORTS
    // Doncaster Sheffield
    'Doncaster Sheffield Airport', 'Doncaster', 'Sheffield', 'DSA',
    // Exeter
    'Exeter Airport', 'Exeter', 'EXT',
    // Bournemouth
    'Bournemouth Airport', 'Bournemouth', 'BOH',
    // Norwich
    'Norwich Airport', 'Norwich', 'NWI',
    // Humberside
    'Humberside Airport', 'Humberside', 'HUY',
    // Durham Tees Valley
    'Durham Tees Valley Airport', 'Teesside Airport', 'Durham', 'MME',
    // Newquay Cornwall
    'Newquay Airport', 'Cornwall Airport', 'Newquay', 'NQY',
    // Blackpool
    'Blackpool Airport', 'Blackpool', 'BLK',
    // Coventry
    'Coventry Airport', 'Coventry', 'CVT',
    
    // SCOTLAND AIRPORTS
    // Edinburgh
    'Edinburgh Airport', 'Edinburgh', 'EDI',
    // Glasgow
    'Glasgow Airport', 'Glasgow', 'GLA',
    // Glasgow Prestwick
    'Glasgow Prestwick Airport', 'Prestwick Airport', 'Prestwick', 'PIK',
    // Aberdeen
    'Aberdeen Airport', 'Aberdeen', 'ABZ',
    // Inverness
    'Inverness Airport', 'Inverness', 'INV',
    // Dundee
    'Dundee Airport', 'Dundee', 'DND',
    // Sumburgh (Shetland)
    'Sumburgh Airport', 'Sumburgh', 'Shetland Airport', 'LSI',
    // Stornoway
    'Stornoway Airport', 'Stornoway', 'SYY',
    // Kirkwall (Orkney)
    'Kirkwall Airport', 'Kirkwall', 'Orkney Airport', 'KOI',
    // Barra
    'Barra Airport', 'Barra', 'BRR',
    // Benbecula
    'Benbecula Airport', 'Benbecula', 'BEB',
    // Campbeltown
    'Campbeltown Airport', 'Campbeltown', 'CAL',
    // Tiree
    'Tiree Airport', 'Tiree', 'TRE',
    // Islay
    'Islay Airport', 'Islay', 'ILY',
    
    // WALES AIRPORTS
    // Cardiff
    'Cardiff Airport', 'Cardiff', 'CWL',
    
    // NORTHERN IRELAND AIRPORTS
    // Belfast International
    'Belfast International Airport', 'Belfast International', 'BFS',
    // Belfast City (George Best)
    'Belfast City Airport', 'George Best Belfast City Airport', 'Belfast City', 'BHD',
    // City of Derry
    'City of Derry Airport', 'Derry Airport', 'Londonderry Airport', 'Derry', 'LDY',
    
    // CHANNEL ISLANDS
    // Guernsey
    'Guernsey Airport', 'Guernsey', 'GCI',
    // Jersey
    'Jersey Airport', 'Jersey', 'JER',
    // Alderney
    'Alderney Airport', 'Alderney', 'ACI',
    
    // ISLE OF MAN
    'Isle of Man Airport', 'Ronaldsway Airport', 'Isle of Man', 'IOM',
    
    // ISLES OF SCILLY
    'Land\'s End Airport', 'Isles of Scilly', 'ISC'
  ];
  
  console.log('🔍 Searching for airports and cities in text...');
  
  // Check for airports in text (case insensitive)
  for (const airport of airports) {
    const regex = new RegExp(`\\b${airport.replace(/\s/g, '\\s*')}\\b`, 'gi');
    const match = text.match(regex);
    if (match) {
      // Use the original case from the text, capitalize properly
      const foundText = match[0];
      console.log(`   Found airport: "${foundText}" (from pattern: "${airport}")`);
      // Normalize spacing and capitalization
      const normalized = foundText.split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      if (!locations.includes(normalized)) {
        locations.push(normalized);
        console.log(`   ✅ Added to locations: "${normalized}"`);
      }
    }
  }
  
  // Known UK cities and major towns (comprehensive list)
  const knownPlaces = [
    'london', 'birmingham', 'manchester', 'liverpool', 'leeds', 'sheffield', 
    'bristol', 'glasgow', 'edinburgh', 'cardiff', 'belfast', 'nottingham',
    'newcastle', 'southampton', 'brighton', 'oxford', 'cambridge', 'coventry',
    'leicester', 'plymouth', 'reading', 'york', 'ipswich', 'norwich', 'exeter',
    'portsmouth', 'sunderland', 'peterborough', 'milton keynes', 'aberdeen',
    'swansea', 'dundee', 'stoke', 'wolverhampton', 'derby', 'hull',
    'bradford', 'wakefield', 'luton', 'croydon', 'bolton', 'stockport',
    'rochdale', 'salford', 'blackpool', 'middlesbrough', 'doncaster', 'preston',
    'wigan', 'rotherham', 'barnsley', 'warrington', 'huddersfield', 'slough',
    'portsmouth', 'poole', 'gloucester', 'chelmsford', 'basildon', 'worthing',
    'southend', 'colchester', 'crawley', 'gateshead', 'cheltenham', 'maidstone',
    'basingstoke', 'harlow', 'carlisle', 'worcester', 'lincoln', 'canterbury',
    'ilford', 'barking', 'enfield', 'romford', 'edmonton', 'wembley'
  ];
  
  // Check for known places (case insensitive)
  for (const place of knownPlaces) {
    const regex = new RegExp(`\\b${place}\\b`, 'gi');
    const match = text.match(regex);
    if (match) {
      // Capitalize first letter of each word
      const foundText = match[0];
      const capitalized = foundText.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      if (!locations.includes(capitalized)) {
        locations.push(capitalized);
      }
    }
  }
  
  // REMOVED: Generic word extraction pattern
  // Only extract known cities, airports, and postcodes
  // Any other location must be validated by Google Maps
  
  return locations;
}

/**
 * Extracts all potential locations from text (postcodes + location names)
 * Extracts in the order they appear in the text (no priority)
 * CLEANS locations before returning them
 * @param {string} text - The text to search
 * @returns {Array<string>} - Array of all potential locations in order of appearance
 */
function extractAllLocations(text) {
  const locations = [];
  
  console.log('📍 === extractAllLocations called ===');
  console.log('Input text:', text);
  
  // Get all postcodes with their positions
  const postcodePattern = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/gi;
  const postcodeMatches = [...text.matchAll(postcodePattern)];
  
  // Get all location names with their positions
  const locationNames = extractAllLocationNames(text);
  console.log('Location names found:', locationNames);
  
  // Create array of {text, position} objects
  const allMatches = [];
  
  // Add postcodes with positions - CLEAN THEM IMMEDIATELY
  postcodeMatches.forEach(match => {
    let postcode = match[1].trim().toUpperCase();
    postcode = postcode.replace(/\s+/g, ' ');
    
    // Get context to check for temporal words
    const matchIndex = match.index;
    const contextBefore = text.substring(Math.max(0, matchIndex - 20), matchIndex).toUpperCase();
    
    // Skip if there's a temporal word right before this postcode
    const temporalWords = ['TOMORROW', 'TODAY', 'TONIGHT', 'MORNING', 'AFTERNOON', 'EVENING'];
    let hasTemporalBefore = false;
    for (const temporal of temporalWords) {
      if (contextBefore.trim().endsWith(temporal)) {
        console.log(`Skipping postcode "${postcode}" - preceded by temporal word "${temporal}"`);
        hasTemporalBefore = true;
        break;
      }
    }
    
    if (!hasTemporalBefore && postcode.length >= 5) {
      allMatches.push({
        text: postcode,
        position: match.index
      });
    }
  });
  
  // Add location names with their first occurrence positions - CHECK FOR TEMPORAL WORDS
  locationNames.forEach(name => {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    const matchIndex = text.search(regex);
    if (matchIndex !== -1) {
      // Get context before to check for temporal words
      const contextBefore = text.substring(Math.max(0, matchIndex - 20), matchIndex).toUpperCase();
      
      // Skip if there's a temporal word right before this location
      const temporalWords = ['TOMORROW', 'TODAY', 'TONIGHT', 'MORNING', 'AFTERNOON', 'EVENING'];
      let hasTemporalBefore = false;
      for (const temporal of temporalWords) {
        if (contextBefore.trim().endsWith(temporal)) {
          console.log(`Skipping location "${name}" - preceded by temporal word "${temporal}"`);
          hasTemporalBefore = true;
          break;
        }
      }
      
      if (!hasTemporalBefore) {
        allMatches.push({
          text: name,
          position: matchIndex
        });
      }
    }
  });
  
  // Sort by position (order of appearance)
  allMatches.sort((a, b) => a.position - b.position);
  
  // Extract just the text, removing duplicates
  allMatches.forEach(item => {
    if (!locations.includes(item.text)) {
      locations.push(item.text);
    }
  });
  
  return locations;
}

/**
 * Validates a location (postcode, city, airport, address) using Google Maps Geocoding API
 * @param {string} location - The location to validate
 * @returns {Promise<Object>} - Object with {isValid: boolean, address: string, location: {lat, lng}}
 */
async function validateLocationWithGoogleMaps(location) {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
      console.warn('Google Maps API not loaded yet');
      resolve({
        isValid: false,
        reason: 'Google Maps API not loaded',
        location: location
      });
      return;
    }
    
    const geocoder = new google.maps.Geocoder();
    
    // Add ", UK" to ensure we're searching in UK (unless it's already there)
    const searchQuery = location.toLowerCase().includes(', uk') ? location : `${location}, UK`;
    
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        const result = results[0];
        
        // Check if the result is actually in UK
        const isUK = result.address_components.some(component => 
          component.types.includes('country') && 
          (component.short_name === 'GB' || component.short_name === 'UK')
        );
        
        if (isUK) {
          resolve({
            isValid: true,
            location: location,
            formattedAddress: result.formatted_address,
            coordinates: {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            },
            types: result.types // e.g., ['airport', 'point_of_interest'], ['locality', 'political'], etc.
          });
        } else {
          resolve({
            isValid: false,
            reason: 'Location not found in UK',
            location: location
          });
        }
      } else {
        resolve({
          isValid: false,
          reason: status === 'ZERO_RESULTS' ? 'Location not found' : `Geocoding failed: ${status}`,
          location: location
        });
      }
    });
  });
}

/**
 * Cleans a location string by removing temporal words and extra formatting
 * @param {string} location - The location string to clean
 * @returns {string} - Cleaned location string
 */
function cleanLocationString(location) {
  if (!location) return location;
  
  let cleaned = location.trim();
  
  // Remove temporal words from the beginning
  cleaned = cleaned.replace(/^(tomorrow|today|tonight|morning|afternoon|evening)\s+/gi, '');
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(pickup|pick up|pick u|dropoff|drop off|drop of)\s*:?\s*/gi, '');
  
  // Remove special characters from start and end
  cleaned = cleaned.replace(/^[:\-;,\s\*\•⁠]+/, '').replace(/[\*\•\-⁠:;,\s]+$/, '');
  
  return cleaned.trim();
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use validateLocationWithGoogleMaps instead
 */
async function validatePostcodeWithGoogleMaps(postcode) {
  return validateLocationWithGoogleMaps(postcode);
}

/**
 * Finds the first valid pickup location in the message
 * Searches from the beginning of the text
 * @param {string} text - The text to search
 * @returns {Promise<Object|null>} - First valid location object or null
 */
async function findValidPickupLocation(text) {
  const locations = extractAllLocations(text);
  
  console.log(`Found ${locations.length} potential locations for pickup:`, locations);
  
  // Validate each location until we find a valid one
  for (const location of locations) {
    // Clean the location before validating
    const cleanedLocation = cleanLocationString(location);
    
    console.log(`Validating pickup location: ${cleanedLocation} (original: ${location})`);
    const validation = await validateLocationWithGoogleMaps(cleanedLocation);
    
    if (validation.isValid) {
      console.log(`✓ Valid pickup location found: ${cleanedLocation}`);
      return {
        location: cleanedLocation,
        formattedAddress: validation.formattedAddress,
        coordinates: validation.coordinates,
        types: validation.types
      };
    } else {
      console.log(`✗ Invalid pickup location: ${cleanedLocation} (${validation.reason})`);
    }
  }
  
  console.log('No valid pickup location found');
  return null;
}

/**
 * Finds the first valid dropoff location in the message
 * Excludes the pickup location if provided
 * @param {string} text - The text to search
 * @param {string} excludeLocation - Location to exclude (the pickup one)
 * @returns {Promise<Object|null>} - First valid location object or null
 */
async function findValidDropoffLocation(text, excludeLocation = null) {
  const locations = extractAllLocations(text);
  
  console.log(`Found ${locations.length} potential locations for dropoff:`, locations);
  
  // Validate each location until we find a valid one (skip the pickup location)
  for (const location of locations) {
    // Clean the location before validating
    const cleanedLocation = cleanLocationString(location);
    
    // Skip if this is the same as pickup location (compare cleaned versions)
    if (excludeLocation && cleanedLocation === cleanLocationString(excludeLocation)) {
      console.log(`Skipping ${cleanedLocation} (already used as pickup)`);
      continue;
    }
    
    console.log(`Validating dropoff location: ${cleanedLocation} (original: ${location})`);
    const validation = await validateLocationWithGoogleMaps(cleanedLocation);
    
    if (validation.isValid) {
      console.log(`✓ Valid dropoff location found: ${cleanedLocation}`);
      return {
        location: cleanedLocation,
        formattedAddress: validation.formattedAddress,
        coordinates: validation.coordinates,
        types: validation.types
      };
    } else {
      console.log(`✗ Invalid dropoff location: ${cleanedLocation} (${validation.reason})`);
    }
  }
  
  console.log('No valid dropoff location found');
  return null;
}

/**
 * Legacy functions for backwards compatibility
 * @deprecated Use findValidPickupLocation and findValidDropoffLocation instead
 */
async function findValidPickupPostcode(text) {
  return findValidPickupLocation(text);
}

async function findValidDropoffPostcode(text, excludeLocation = null) {
  return findValidDropoffLocation(text, excludeLocation);
}

/**
 * Extracts and validates both pickup and dropoff locations from a message
 * Works with postcodes, city names, airports, and any location Google Maps can recognize
 * STRICT POSTCODE VALIDATION: Postcodes must be validated with Google Maps before use
 * @param {string} text - The text to search
 * @returns {Promise<Object>} - Object with {pickup: Object|null, dropoff: Object|null}
 */
async function extractAndValidateLocations(text) {
  console.log('=== Starting STRICT location extraction and validation ===');
  console.log('Message text:', text);
  
  // PRIORITY: Check for "X TO Y" or "X to Y" pattern first
  // This explicitly defines the order: X = pickup, Y = dropoff
  const toPattern = /\b(.+?)\s+(?:TO|to|To)\s+(.+?)(?:\n|$)/i;
  const toMatch = text.match(toPattern);
  
  if (toMatch && toMatch[1] && toMatch[2]) {
    console.log('📍 Found "X TO Y" pattern');
    const potentialPickup = toMatch[1].trim();
    const potentialDropoff = toMatch[2].trim();
    
    console.log(`   Checking: "${potentialPickup}" → "${potentialDropoff}"`);
    
    // Validate both locations
    const pickupValidation = await validateLocationWithGoogleMaps(potentialPickup);
    const dropoffValidation = await validateLocationWithGoogleMaps(potentialDropoff);
    
    if (pickupValidation.isValid && dropoffValidation.isValid) {
      console.log('✅ Both locations in "TO" pattern are valid!');
      return {
        pickup: {
          location: potentialPickup,
          formattedAddress: pickupValidation.formattedAddress,
          coordinates: pickupValidation.coordinates,
          types: pickupValidation.types
        },
        dropoff: {
          location: potentialDropoff,
          formattedAddress: dropoffValidation.formattedAddress,
          coordinates: dropoffValidation.coordinates,
          types: dropoffValidation.types
        }
      };
    } else {
      console.log('⚠️ "TO" pattern found but locations not valid, continuing with standard extraction');
    }
  }
  
  // STRICT POSTCODE VALIDATION APPROACH:
  // 1. Try to find valid pickup postcode first (validated with Google Maps)
  console.log('🔍 Step 1: Searching for valid pickup postcode...');
  const pickupPostcode = await findValidPostcode(text, null);
  
  if (pickupPostcode) {
    console.log('✅ Valid pickup postcode found:', pickupPostcode.location);
    
    // 2. Try to find valid dropoff postcode (excluding the pickup one)
    console.log('🔍 Step 2: Searching for valid dropoff postcode...');
    const dropoffPostcode = await findValidPostcode(text, pickupPostcode.location);
    
    if (dropoffPostcode) {
      console.log('✅ Valid dropoff postcode found:', dropoffPostcode.location);
      console.log('=== Extraction complete (STRICT POSTCODE MODE) ===');
      return {
        pickup: pickupPostcode,
        dropoff: dropoffPostcode
      };
    } else {
      console.log('⚠️ No valid dropoff postcode found, trying other location types...');
      // Try to find any other valid location as dropoff
      const dropoff = await findValidDropoffLocation(text, pickupPostcode.location);
      if (dropoff) {
        console.log('✅ Valid dropoff location found (non-postcode):', dropoff.location);
        console.log('=== Extraction complete (MIXED MODE) ===');
        return {
          pickup: pickupPostcode,
          dropoff: dropoff
        };
      }
    }
  }
  
  // If no valid postcodes found, fallback to standard location extraction
  console.log('⚠️ No valid postcodes found, using standard location extraction...');
  const pickup = await findValidPickupLocation(text);
  const dropoff = await findValidDropoffLocation(text, pickup ? pickup.location : null);
  
  console.log('=== Extraction complete ===');
  console.log('Pickup:', pickup);
  console.log('Dropoff:', dropoff);
  
  return {
    pickup: pickup,
    dropoff: dropoff
  };
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use extractAndValidateLocations instead
 */
async function extractAndValidatePostcodes(text) {
  return extractAndValidateLocations(text);
}

// Export functions for use in other modules
window.extractAllPostcodes = extractAllPostcodes;
window.extractAllLocationNames = extractAllLocationNames;
window.extractAllLocations = extractAllLocations;
window.cleanLocationString = cleanLocationString;
window.validateLocationWithGoogleMaps = validateLocationWithGoogleMaps;
window.validatePostcodeWithGoogleMaps = validatePostcodeWithGoogleMaps; // legacy
window.findValidPostcode = findValidPostcode;
window.findValidPickupLocation = findValidPickupLocation;
window.findValidDropoffLocation = findValidDropoffLocation;
window.findValidPickupPostcode = findValidPickupPostcode; // legacy
window.findValidDropoffPostcode = findValidDropoffPostcode; // legacy
window.extractAndValidateLocations = extractAndValidateLocations;
window.extractAndValidatePostcodes = extractAndValidatePostcodes; // legacy
