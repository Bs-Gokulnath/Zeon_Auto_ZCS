# Zeon Auto Server - Project Summary

## 📋 Project Overview

**Project Name:** Zeon Auto Server  
**Type:** EV Charging Station Analytics Dashboard  
**Purpose:** Web application for managing and visualizing EV charging station session data with comprehensive analytics

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express.js 5.2.1
- MongoDB with Mongoose 9.2.3
- JWT authentication
- Nodemailer for OTP-based email verification
- bcryptjs for password hashing
- CORS enabled for frontend communication

**Frontend:**
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- Recharts 3.7.0 for data visualization
- Framer Motion 12.35.0 for animations
- Lucide React 0.577.0 for icons

### Port Configuration
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000

## 📁 Project Structure

```
Zeon_Auto_Server/
├── backend/
│   ├── src/
│   │   ├── server.js              # Entry point
│   │   ├── app.js                 # Express app configuration
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── models/
│   │   │   ├── User.js            # User schema (email, password, isVerified)
│   │   │   └── SessionData.js     # Flexible schema for charging sessions
│   │   ├── controllers/
│   │   │   ├── authController.js  # Signup, login, OTP verification
│   │   │   └── analyticsController.js  # Dashboard analytics calculations
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.js     # /api/auth/* routes
│   │   │   ├── ocpp.routes.js     # OCPP related routes
│   │   │   └── analytics.routes.js # /api/analytics/dashboard
│   │   ├── services/
│   │   │   └── emailService.js    # Nodemailer configuration
│   │   └── utils/
│   │       └── otpStore.js        # In-memory OTP storage
│   ├── package.json
│   └── .env                       # MongoDB URI, JWT secret, email credentials
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── globals.css        # Global styles
│   │   │   ├── login/
│   │   │   │   └── page.tsx       # Login with OTP
│   │   │   ├── signup/
│   │   │   │   └── page.tsx       # Signup with OTP verification
│   │   │   └── dashboard/
│   │   │       └── page.tsx       # Main dashboard with date picker
│   │   ├── components/
│   │   │   └── AnalyticsDashboard.tsx  # Complete analytics visualization
│   │   └── lib/
│   │       └── api.ts             # apiFetch utility function
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── tailwind.config.ts
│
├── JWT_SECURITY.md                # JWT implementation documentation
├── SETUP.md                       # Setup instructions
└── PROJECT_SUMMARY.md             # This file
```

## 🔐 Authentication System

### Flow
1. **Signup:** User enters email → Receives OTP → Verifies OTP → Account created
2. **Login:** User enters email → Receives OTP → Verifies OTP → JWT token + daily session created
3. **Daily Session:** Auto-logout implemented - users must log in each new day
4. **Protection:** All dashboard routes require valid JWT token

### Daily Auto-Logout Feature
- When user logs in, `loginDate` is stored in localStorage as `new Date().toDateString()`
- On every page load, current date is compared with stored `loginDate`
- If dates don't match, session is cleared and user is redirected to login
- Implemented across: login page, signup page, dashboard page, home page

### JWT Security
- Token stored in localStorage as `token`
- User object stored as `user`
- Backend verifies JWT on protected routes using auth middleware
- Token includes: `userId`, `email`, `isVerified`

## 🗄️ Database Structure

### MongoDB Collections

**users:**
```javascript
{
  email: String (unique, required),
  password: String (bcrypt hashed),
  isVerified: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

**session_data:** (Flexible schema - strict: false)
```javascript
{
  // Session identifiers
  charge_point_id: String,
  station_name: String,
  connector_id: String ('1' or '2'),
  
  // OEM/Make information
  oem: String,
  OEM: String,
  Make: String,
  
  // Session timing
  session_start_time: String (format: "YYYY-MM-DD HH:MM:SS"),
  session_end_time: String (format: "YYYY-MM-DD HH:MM:SS"),
  session_duration: Number (minutes),
  
  // Session states
  is_Preparing: Number (0 or 1),
  is_Charging: Number (0 or 1),
  
  // Stop information
  Stop_Type: String ('meterStop', etc.),
  reason: String,
  errorCode: String,
  vendorErrorCode: String,
  
  // Power data
  peak_power: Number,
  Peak_Power: Number,
  avg_power: Number,
  Average_Power: Number,
  energy_delivered: Number,
  
  // Any other fields from OCPP data...
}
```

### Database Queries
- Date range queries use regex: `{ session_start_time: { $regex: '^2026-03-03' } }`
- Supports flexible field names with fallback logic (e.g., oem || OEM || Make)

## 🚀 API Endpoints

### Authentication Endpoints
```
POST /api/auth/signup              # Register new user
POST /api/auth/send-otp            # Send OTP to email
POST /api/auth/verify-otp          # Verify OTP and create account
POST /api/auth/login               # Login and receive JWT
```

### Analytics Endpoints
```
GET /api/analytics/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Authentication:** Required (JWT in Authorization header)

**Query Parameters:**
- `startDate` (required): Format YYYY-MM-DD
- `endDate` (optional): Format YYYY-MM-DD (defaults to startDate)

**Response Structure:**
```json
{
  "success": true,
  "message": "Analytics retrieved successfully",
  "analytics": {
    "chargerUsage": {
      "combined": { /* stats */ },
      "connector1": { /* stats */ },
      "connector2": { /* stats */ }
    },
    "chargingShares": {
      "negativeStops": 35,
      "positiveStops": 50,
      "preChargingFailure": 15
    },
    "oemAnalytics": [
      { "oem": "Tesla", "negativeStopPercentage": 12 }
    ],
    "stationAnalytics": [
      { "station": "Station A", "negativeStopPercentage": 25, "negativeStops": 10, "totalSessions": 40 }
    ],
    "cpidAnalytics": [
      { "cpid": "Station A - CPID-123", "negativeStopPercentage": 30, "negativeStops": 5, "totalSessions": 15 }
    ],
    "prechargingByOEM": [
      { "oem": "Tesla", "count": 8 }
    ],
    "prechargingByStation": [
      { "station": "Station A", "count": 12 }
    ],
    "prechargingByCPID": [
      { "cpid": "Station A - CPID-123", "count": 5 }
    ],
    "powerQuality": [
      { "date": "2026-03-03", "peakPower": 150.5, "avgPower": 85.2 }
    ],
    "errorSummary": [
      { "error": "EVDisconnect", "count": 25, "percentage": 45 }
    ]
  },
  "count": 150,
  "dateRange": {
    "start": "2026-03-03",
    "end": "2026-03-03"
  }
}
```

## 📊 Analytics Dashboard Features

### Charts Implemented (11 Sections Total)

1. **Charger Usage & Readiness**
   - TreeSection component with 3-level flow visualization
   - Shows: Preparing → Charging/Pre-Charging → Negative Stops/Positives
   - Displays for: Combined Charger, Connector 1, Connector 2
   - Success Rate calculation

2. **Charging Shares**
   - Donut chart (PieChart with innerRadius)
   - Pre-Charging Failure vs Negative Stops vs Positive Stops

3. **Error Summary**
   - Donut chart showing top 5 errors
   - Percentage labels inside segments

4. **Negative Stops by OEM (Neg Stop%)**
   - Bar chart with percentage labels
   - Sorted by highest percentage
   - Angled X-axis labels

5. **Negative Stops by Station (Neg Stop%)**
   - Bar chart with horizontal scrolling for many stations
   - Red color scheme

6. **Negative Stops by CPID (Neg Stop%)**
   - Bar chart showing "Station Name - CPID" format
   - Purple color scheme
   - Horizontal scrolling

7. **Precharging Failure by OEM**
   - Bar chart with count (not percentage)
   - Only shows OEMs with failures > 0
   - Orange/Amber color

8. **Precharging Failure by Station**
   - Bar chart with failure counts
   - Purple color scheme

9. **Precharging Failure by CPID**
   - Bar chart with horizontal scrolling
   - Amber color scheme

10. **Power Quality**
    - Dual Y-axis LineChart
    - Left axis: Peak Power (Orange line)
    - Right axis: Avg Power (Green line)
    - Shows trend over dates

11. **Top Navigation Bar**
    - AC/Combined/DC toggle buttons
    - File selector dropdown
    - Refresh, Download, Close icons

### Analytics Calculations Logic

**Negative Stops:**
- Counted when: `Stop_Type === 'meterStop'` OR `reason === 'Other'` OR `vendorErrorCode` exists
- Percentage: `(negativeStops / totalChargingSessions) * 100`

**Precharging Failures:**
- Identified when: `vendorErrorCode` contains "precharging" AND `is_Charging === 0`
- Tracked separately by OEM, Station, and CPID

**Power Quality:**
- Peak Power: Maximum value per day from `peak_power` or `Peak_Power` fields
- Avg Power: Calculated from `avg_power` field or `energy_delivered / (session_duration / 60)`

**Success Rate:**
- Formula: `(positiveStops / chargingSessions) * 100`
- Displayed with visual indicator (green if ≥70%, red if <70%)

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Blue (#3B82F6), Green (#10B981), Orange (#F59E0B), Red (#EF4444), Purple (#8B5CF6)
- **Charts**: Recharts library with custom tooltips and labels
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React (Zap, TrendingDown, AlertTriangle, BarChart3, Layers, Activity)
- **Styling**: Tailwind CSS with custom gradients and shadows

### Dashboard Layout
- Responsive grid system (1 column mobile, 3-4 columns desktop)
- Card-based design with border-top color coding
- Horizontal scrolling for charts with many data points
- Fixed header with date range selector
- Conditional rendering (charts only show if data exists)

### Date Picker
- Custom calendar component with drag-to-select range
- Dual calendar view (2 months side-by-side)
- Visual feedback: hover states, selected dates, range highlighting
- Month navigation with arrow buttons
- Displays selected range in input field

## 🔧 Key Implementation Details

### Frontend State Management
- React hooks: useState, useEffect, useMemo
- Local storage for: token, user, loginDate
- Session validation on page load
- Date range selection with drag support

### Backend Processing
```javascript
// Date query building
const orConditions = [];
dateStrings.forEach(dateStr => {
  orConditions.push({ session_end_time: { $regex: `^${dateStr}` } });
  orConditions.push({ session_start_time: { $regex: `^${dateStr}` } });
});

// MongoDB query
const sessionData = await SessionData.find({ $or: orConditions });
```

### Analytics Aggregation
- All calculations done in-memory after fetching data
- Grouping by: OEM, Station Name, CPID
- Sorting by: highest percentage/count first
- Top 5 filtering for error summary

### Chart Rendering
```typescript
// Custom label renderer for percentage
const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props;
  // Calculate position and render text
  return <text>{`${percentage}%`}</text>;
};

// Bar chart with scrolling
<div style={{ minWidth: data.length > 10 ? `${data.length * 120}px` : '100%' }}>
  <ResponsiveContainer>
    <BarChart data={data}>
      {/* Chart config */}
    </BarChart>
  </ResponsiveContainer>
</div>
```

## 🐛 Issues Resolved

1. **Date Field Mismatch**: Backend was querying `start_date`/`end_date` but MongoDB had `session_start_time`/`session_end_time`
   - **Solution**: Updated queries to use correct field names with regex patterns

2. **TypeScript Compilation Errors**: PieChart label props type mismatch
   - **Solution**: Created custom `renderPieLabel` function with proper type handling

3. **Daily Session Tracking**: Users staying logged in across days
   - **Solution**: Implemented loginDate comparison on all pages

4. **Optional Fields**: Backend returning data that frontend expected as required
   - **Solution**: Made new analytics fields optional with `?:` operator

## 🚦 Current State

### Completed Features
✅ User authentication with OTP verification  
✅ Daily auto-logout functionality  
✅ MongoDB integration with flexible schema  
✅ Complete analytics API endpoint  
✅ 11 distinct chart visualizations  
✅ Responsive dashboard layout  
✅ Date range picker with drag selection  
✅ Power Quality line chart with dual Y-axes  
✅ Horizontal scrolling for large datasets  
✅ TypeScript type safety  
✅ Error handling and loading states  

### Testing Data
- Sample data exists for **March 3, 2026** in MongoDB
- Collection: `session_data`
- Multiple sessions with various OEMs, stations, and CPIDs

### How to Run

**Backend:**
```bash
cd backend
npm install
npm run dev  # Runs on port 5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on port 3000
```

### Test Flow
1. Navigate to http://localhost:3000
2. Click "Sign Up" → Enter email → Verify OTP → Create account
3. Login with email → Verify OTP
4. Click "Select Date Range"
5. Choose "March 3, 2026" (or any date with data)
6. Click "Fetch Data"
7. View complete analytics dashboard with all 11 chart sections

## 📝 Important Notes

### Data Field Variations
The backend handles multiple field name variations:
- OEM: `oem`, `OEM`, `Make`, `Manufacturer`
- Station: `station_name`, `Station_Name`, `Station Identity`
- CPID: `charge_point_id`, `chargePointId`, `CPID`, `Charge Point Id`
- Power: `peak_power`, `Peak_Power`, `avg_power`, `Average_Power`

### Date Format
- Frontend sends: `YYYY-MM-DD`
- MongoDB stores: `YYYY-MM-DD HH:MM:SS`
- Queries use: Regex `^YYYY-MM-DD` to match date portion

### Authentication Header
```typescript
// Frontend API utility
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
}
```

### Environment Variables (.env)
```
MONGO_URI=mongodb://...
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
PORT=5000
```

## 🔮 Potential Enhancements

- Add framer-motion animations to chart transitions
- Implement CPID ranking modal (from reference code)
- Add SearchableSelect component for advanced filtering
- Export analytics to Excel functionality
- Real-time data updates with WebSocket
- User profile settings
- Multi-language support
- Dark mode toggle
- Custom date range presets (Last 7 days, Last 30 days, etc.)

---

**Last Updated:** March 9, 2026  
**Status:** Fully functional with all 11 analytics charts operational
