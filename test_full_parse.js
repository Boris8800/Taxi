const text = `10-Dec-2025 08:50 (9 seater car needed)

20.57 Miles

Pickup : MATLOCK CRESCENT SM3

Dropoff : LONDON HEATHROW AIRPORT TERMINAL 5 TW6

Seven Passenger

£80 Net cash`;

console.log("Full test text:");
console.log(text);
console.log("\n--- Testing patterns ---\n");

// Test date pattern
const datePattern = /(\d{1,2}\-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\-\d{4})/i;
const dateMatch = text.match(datePattern);
console.log("Date match:", dateMatch ? dateMatch[1] : "NO MATCH");

// Test time pattern
const timePattern = /\b(\d{1,2}:\d{2})\s*(?:AM|PM)?\b/i;
const timeMatch = text.match(timePattern);
console.log("Time match:", timeMatch ? timeMatch[1] : "NO MATCH");

// Test pickup pattern
const pickupPattern = /pickup\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi;
const pickupMatch = pickupPattern.exec(text);
console.log("Pickup match:", pickupMatch ? pickupMatch[1] : "NO MATCH");

// Test dropoff pattern
const dropoffPattern = /dropoff\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi;
const dropoffMatch = dropoffPattern.exec(text);
console.log("Dropoff match:", dropoffMatch ? dropoffMatch[1] : "NO MATCH");

// Test passenger pattern (word form)
const passengerWordPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+passenger/i;
const passengerMatch = text.match(passengerWordPattern);
console.log("Passenger match:", passengerMatch ? passengerMatch[1] : "NO MATCH");

// Test price pattern
const pricePattern = /£\s*(\d+(?:\.\d{2})?)\s+(?:net\s+)?cash/i;
const priceMatch = text.match(pricePattern);
console.log("Price match:", priceMatch ? priceMatch[0] : "NO MATCH");
console.log("Price value:", priceMatch ? priceMatch[1] : "NO MATCH");

// Test if "cash" is detected
const hasCash = /\bcash\b/i.test(text);
console.log("\nContains 'cash':", hasCash);

