const text = `🚨🚨 Gatwick Airport 🚨🚨

Pickup time: Dec 10, 2025 | 10:50

Pick up    SE1 7HR

Drop off   Gatwick Airport

Car   MPV 8 

£85 Net`;

// Test the exact patterns used in parser
const pattern1 = /\bPickup\s*:\s*([^\n\r]+)/i;
const pattern2 = /\bPick\s+up\s*:\s*([^\n\r]+)/i;

console.log("Pattern 1 test:");
const match1 = text.match(pattern1);
if (match1) {
  console.log("MATCHED!");
  console.log("Full match:", match1[0]);
  console.log("Captured group:", match1[1]);
  console.log("Has 'pickup time'?", /pickup\s+(time|date)/i.test(match1[0]));
} else {
  console.log("NO MATCH");
}

console.log("\nPattern 2 test:");
const match2 = text.match(pattern2);
if (match2) {
  console.log("MATCHED!");
  console.log("Full match:", match2[0]);
  console.log("Captured group:", match2[1]);
  console.log("Has 'pickup time'?", /pickup\s+(time|date)/i.test(match2[0]));
} else {
  console.log("NO MATCH");
}

