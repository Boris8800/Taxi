# Location Database

This file (`locations.js`) contains all the postcodes, airports, cities, and locations that the SMART TRIP application recognizes.

## How to Add New Locations

Simply add new entries to the `locationDatabase` object in the following format:

```javascript
'shortcode': 'Full Location Name',
```

### Examples:

#### Adding a Postcode:
```javascript
'e5': 'London E5',
'e5 0qq': 'London E5 0QQ',
'ex33': 'EX33',
'ex33 1ht': 'EX33 1HT',
```

#### Adding an Airport:
```javascript
'lhr t2': 'London Heathrow Airport Terminal 2',
'heathrow terminal 2': 'London Heathrow Airport Terminal 2',
```

#### Adding a City or Town:
```javascript
'coventry': 'Coventry',
'milton keynes': 'Milton Keynes',
```

#### Adding a Station:
```javascript
'kings cross': "King's Cross Station, London",
'kings cross station': "King's Cross Station, London",
```

## Important Notes:

1. **All keys (shortcuts) must be in lowercase**
2. **Each entry must end with a comma** (except the very last one)
3. **Use single quotes** for keys and values
4. **Add your custom entries at the bottom** of the file in the designated section

## Reloading Changes:

After adding new locations, simply **refresh your browser** - no need to restart anything!
