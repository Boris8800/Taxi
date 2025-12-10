const text = `🚨🚨 Gatwick Airport 🚨🚨

Pickup time: Dec 10, 2025 | 10:50

Pick up    SE1 7HR

Drop off   Gatwick Airport

Car   MPV 8 

£85 Net`;

console.log("Original text:");
console.log(text);
console.log("\n=== Issue Analysis ===");

// The problem: "Pick up" is on a different line than "SE1 7HR"
// Current pattern: /pick\s+up\s+([^\n\r]+?)/
// This will match "Pick up    SE1 7HR" only if they're on the same line

const lines = text.split('\n');
lines.forEach((line, i) => {
  console.log(`Line ${i}: "${line}"`);
});

console.log("\n=== Pattern Test ===");
const pickupPattern = /pick\s+up\s+([^\n\r]+?)(?:\s*\.\s*)?(?=\n|$)/gi;
const match = text.match(pickupPattern);
console.log("Pattern match:", match);

