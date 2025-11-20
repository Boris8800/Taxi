# SMART TRIP v1 🚗

A professional taxi trip calculator and analyzer for calculating route distances, times, fuel costs, and profit margins.

**Live Demo:** [https://boris8800.github.io/Taxi/](https://boris8800.github.io/Taxi/)

## ✨ Features

- 📍 **Smart Route Calculation** - Google Maps integration for accurate distances and times
- 💰 **Financial Analysis** - Profit calculations including fuel costs and congestion charges
- 🤖 **AI Text Parsing** - Automatically parse WhatsApp messages and trip details
- 🌙 **Dark/Light Theme** - Toggle between themes for comfortable viewing
- 📱 **Mobile Responsive** - Works perfectly on all device sizes
- 📤 **Trip Sharing** - Copy formatted trip summaries to clipboard
- 🗺️ **Navigation Integration** - Direct links to Google Maps for navigation

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Boris8800/Taxi.git
   cd Taxi
   ```

2. **Start local server:**
   ```bash
   python3 -m http.server 8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

## 📁 Project Structure

The project uses a clean, organized file structure for better maintainability:

```
├── index.html              # Main application
├── css/styles.css         # All styling and themes
├── js/
│   ├── main.js            # Core initialization
│   ├── calculations.js    # Trip calculations
│   ├── parser.js          # Text parsing logic
│   ├── locations.js       # Location utilities
│   └── utils.js           # Helper functions
└── assets/                # Future assets
```

For detailed project structure documentation, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 🎯 How to Use

### Standard Input
1. Enter base location (default: Birmingham)
2. Add pickup and dropoff locations
3. Set date, time, and price
4. Click "Calculate Trip" for analysis

### Free-Style Input
1. Paste WhatsApp messages or trip details
2. Click "Paste & Parse" for automatic extraction
3. Review parsed information
4. Calculate for complete analysis

### Example Input Formats
```
LHR TO W1J PRICE 50 NET
Heathrow T2 to NW1 8YN £45

Saloon Car (1 Persons) 🔴🔴
*TONIGHT @ 21:25 pm*
Pick Up: Heathrow Airport, Terminal 5
Drop Off: BN11 4NS
*PAYMENT- £75 SAME DAY*

Wednesday 19th 2025, 06:30 am
Pick Up: CB3 9HY
Drop Off: LHR 2
Estate Car (3 Persons) 🔴🔴🔴
£80 Same day
```

## 🧮 Calculations

- **Route Analysis:** Base→Pickup→Dropoff→Base
- **Financial Breakdown:** 
  - Fuel costs (customizable per 100 miles)
  - London congestion charges (£15/day)
  - Net profit calculations
  - Profit per hour analysis
- **Efficiency Metrics:** Route optimization scoring

## 🛠 Technology

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **APIs:** Google Maps, Google Places
- **Design:** Responsive, Mobile-first
- **Architecture:** Modular, Maintainable

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙋‍♂️ Support

For questions, issues, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review the project structure guide

---

**SMART TRIP v1** - Professional taxi trip analysis made simple.
