const text = `🚨🚨 Gatwick Airport 🚨🚨

Pickup time: Dec 10, 2025 | 10:50

Pick up    SE1 7HR

Drop off   Gatwick Airport

Car   MPV 8 

£85 Net`;

// Clean the text first
let cleaned = text
  .replace(/\b\d{1,2}\-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\-\d{4}\b/gi, '')
  .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, '')
  .replace(/\b\d+\.\d+\s*Miles?\b/gi, '')
  .replace(/\(\d+\s*seater\s*car\s*needed\)/gi, '');

console.log("Cleaned text:");
console.log(cleaned);
console.log("\n=== Testing pickup patterns ===\n");

const pickupPatterns = [
  { pattern: /pickup\s+:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, name: "pickup : (space before colon)" },
  { pattern: /pickup\s*:\s*([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, name: "pickup: (no space)" },
  { pattern: /pick\s+up\s+([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi, name: "pick up   (multiple spaces)" }
];

pickupPatterns.forEach(p => {
  p.pattern.lastIndex = 0;
  const match = p.pattern.exec(cleaned);
  console.log(`${p.name}:`, match ? `"${match[1]}"` : "NO MATCH");
});

