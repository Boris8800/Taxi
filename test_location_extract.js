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

console.log("=== Cleaned text ===");
console.log(cleaned);
console.log("\n=== Extracting locations ===");

// Simulate extractLocations
const pickupPatterns = [
  /pickup\s+:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
  /pickup\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi
];

const dropoffPatterns = [
  /dropoff\s+:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi,
  /dropoff\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi
];

let pickup = null;
let dropoff = null;

for (const pattern of pickupPatterns) {
  pattern.lastIndex = 0;
  const match = pattern.exec(cleaned);
  if (match && match[1]) {
    pickup = match[1].trim();
    console.log(`Pickup found with pattern: ${pattern}`);
    console.log(`Pickup value: "${pickup}"`);
    break;
  }
}

for (const pattern of dropoffPatterns) {
  pattern.lastIndex = 0;
  const match = pattern.exec(cleaned);
  if (match && match[1]) {
    dropoff = match[1].trim();
    console.log(`Dropoff found with pattern: ${pattern}`);
    console.log(`Dropoff value: "${dropoff}"`);
    break;
  }
}

console.log("\n=== Final Results ===");
console.log("Pickup:", pickup);
console.log("Dropoff:", dropoff);

