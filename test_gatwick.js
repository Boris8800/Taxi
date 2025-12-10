const text = `🚨🚨 Gatwick Airport 🚨🚨

Pickup time: Dec 10, 2025 | 10:50

Pick up    SE1 7HR

Drop off   Gatwick Airport

Car   MPV 8 

£85 Net`;

console.log("Testing Gatwick format:");
console.log(text);
console.log("\n=== Pattern Tests ===\n");

// Test date pattern
const datePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i;
const dateMatch = text.match(datePattern);
console.log("Date match:", dateMatch ? dateMatch[1] : "NO MATCH");

// Test time pattern
const timePattern = /(\d{1,2}:\d{2})/;
const timeMatch = text.match(timePattern);
console.log("Time match:", timeMatch ? timeMatch[1] : "NO MATCH");

// Test pickup (with multiple spaces)
const pickupPattern = /pick\s*up\s+([^\n\r]+?)(?=\n|$)/i;
const pickupMatch = text.match(pickupPattern);
console.log("Pickup match:", pickupMatch ? pickupMatch[1].trim() : "NO MATCH");

// Test dropoff (with multiple spaces)
const dropoffPattern = /drop\s*off\s+([^\n\r]+?)(?=\n|$)/i;
const dropoffMatch = text.match(dropoffPattern);
console.log("Dropoff match:", dropoffMatch ? dropoffMatch[1].trim() : "NO MATCH");

// Test price
const pricePattern = /£\s*(\d+(?:\.\d{2})?)\s*net/i;
const priceMatch = text.match(pricePattern);
console.log("Price match:", priceMatch ? `£${priceMatch[1]} Net` : "NO MATCH");

// Test vehicle
const vehiclePattern = /Car\s+([^\n]+)/i;
const vehicleMatch = text.match(vehiclePattern);
console.log("Vehicle match:", vehicleMatch ? vehicleMatch[1].trim() : "NO MATCH");

