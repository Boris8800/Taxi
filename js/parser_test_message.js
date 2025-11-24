// Test the parser with the provided message
(async () => {
  const message = '25/11/2025/ 5:30 HEATHROW AIRPORT▶️CB4 2PS SALOON FARE:£80NET';
  const result = await parseFreeStyleText(message);
  console.log('Parsed Result:', result);
})();
