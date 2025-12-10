const text = `Pickup time: Dec 10, 2025 | 10:50

Pick up    SE1 7HR`;

console.log("Testing patterns:");
console.log(text);
console.log("\n");

const pattern1 = /\bPickup\s*:\s*([^\n\r]+)/i;
const pattern2 = /\bPick\s+up\s*:\s*([^\n\r]+)/i;

console.log("Pattern 1 (/\\bPickup\\s*:\\s*/):", pattern1.test(text) ? "MATCHES" : "NO MATCH");
if (pattern1.test(text)) {
  const match = text.match(pattern1);
  console.log("  Captured:", match[0]);
  console.log("  Group 1:", match[1]);
}

console.log("\nPattern 2 (/\\bPick\\s+up\\s*:\\s*/):", pattern2.test(text) ? "MATCHES" : "NO MATCH");
if (pattern2.test(text)) {
  const match = text.match(pattern2);
  console.log("  Captured:", match[0]);
  console.log("  Group 1:", match[1]);
}

