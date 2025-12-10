const text = `Pickup : MATLOCK CRESCENT SM3
Dropoff : LONDON HEATHROW AIRPORT TERMINAL 5 TW6`;

console.log("Test text:");
console.log(text);
console.log("\n--- Testing patterns ---");

const pickupPatterns = [
  /pickup\s+:\s*([^\n\r]+?)(?=\n|$)/gi,
  /pickup\s*:\s*([^\n\r]+?)(?=\n|$)/gi
];

const dropoffPatterns = [
  /dropoff\s+:\s*([^\n\r]+?)(?=\n|$)/gi,
  /dropoff\s*:\s*([^\n\r]+?)(?=\n|$)/gi
];

pickupPatterns.forEach((pattern, i) => {
  pattern.lastIndex = 0;
  const match = pattern.exec(text);
  console.log(`Pickup pattern ${i}:`, match ? match[1] : 'NO MATCH');
});

dropoffPatterns.forEach((pattern, i) => {
  pattern.lastIndex = 0;
  const match = pattern.exec(text);
  console.log(`Dropoff pattern ${i}:`, match ? match[1] : 'NO MATCH');
});
