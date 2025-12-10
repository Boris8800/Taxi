const text = `10-Dec-2025 08:50 (9 seater car needed)

20.57 Miles

Pickup : MATLOCK CRESCENT SM3

Dropoff : LONDON HEATHROW AIRPORT TERMINAL 5 TW6

Seven Passenger

£80 Net cash`;

// Clean the text
let cleaned = text
  .replace(/\b\d{1,2}\-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\-\d{4}\b/gi, '')
  .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, '')
  .replace(/\b\d+\.\d+\s*Miles?\b/gi, '')
  .replace(/\(\d+\s*seater\s*car\s*needed\)/gi, '');

console.log("Original text:");
console.log(text);
console.log("\n=== Cleaned text ===");
console.log(cleaned);
console.log("\n=== Testing patterns on cleaned text ===");

const pickupPattern = /pickup\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi;
const dropoffPattern = /dropoff\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi;

const pickupMatch = pickupPattern.exec(cleaned);
const dropoffMatch = dropoffPattern.exec(cleaned);

console.log("Pickup match:", pickupMatch ? pickupMatch[1] : "NO MATCH");
console.log("Dropoff match:", dropoffMatch ? dropoffMatch[1] : "NO MATCH");

