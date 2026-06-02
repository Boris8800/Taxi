// Test the parser with the provided message
(async () => {
  const message = `Today 08:00 am

Any car  (1 Person)

E3 5SA To Heathrow 

Total :£55 Net

Same day payment`;
  const result = await parseFreeStyleText(message);
  console.log('Parsed Result:', result);
})();
