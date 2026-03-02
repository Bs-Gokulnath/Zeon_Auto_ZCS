# Session Data Date Range Filter Feature

## Overview
This feature allows users to select a date range and retrieve session data from the database for that specific period. If no data exists for the selected range, it displays an appropriate message.

## Backend Implementation

### 1. Database Model
**File:** `backend/src/models/SessionData.js`
- Created a flexible schema for session_data collection
- Includes date field with indexing for fast queries
- Supports additional fields through flexible schema

### 2. Controller
**File:** `backend/src/controllers/sessionDataController.js`
- `getSessionDataByDateRange`: Fetches data based on start and end dates
- Returns appropriate messages when no data is found
- Includes validation for date formats

### 3. Routes
**File:** `backend/src/routes/sessionData.routes.js`
- Protected route: `GET /api/session-data/range`
- Query parameters: `startDate` and `endDate` (format: YYYY-MM-DD)

### 4. API Integration
**File:** `backend/src/app.js`
- Added session data routes to the application

## Frontend Implementation

### 1. Dashboard Component
**File:** `frontend/src/app/dashboard/page.tsx`
- Interactive date range picker with drag-to-select functionality
- Fetches data from backend API
- Displays data in a formatted table
- Shows loading states and error messages
- "No data available" message when data doesn't exist
- Download JSON functionality for exported data

### Features:
- ✅ Drag to select multiple dates
- ✅ Click to select start/end dates
- ✅ Month navigation
- ✅ Visual feedback for selected dates
- ✅ Loading indicator while fetching
- ✅ Data table with expandable details
- ✅ Download data as JSON
- ✅ "No data available" message

## Testing the Feature

### Step 1: Add Sample Data
Run the sample data script to populate the database:

```bash
cd backend
node scripts/addSampleSessionData.js
```

This will add sample session data for:
- February 23-27, 2026
- March 1-5, 2026

### Step 2: Start the Backend Server
```bash
cd backend
npm start
```

### Step 3: Start the Frontend
```bash
cd frontend
npm run dev
```

### Step 4: Test the Feature
1. Login to the dashboard
2. Click "Select Date Range" button
3. Select a date range (e.g., Feb 23 - Feb 27, 2026)
4. Click "Fetch Data"
5. View the retrieved data in the table

### Step 5: Test "No Data" Scenario
1. Click "Select Date Range" again
2. Select a date range with no data (e.g., Feb 1 - Feb 10, 2026)
3. Click "Fetch Data"
4. See the "No data available for the selected date range" message

## API Usage

### Request
```
GET /api/session-data/range?startDate=2026-02-23&endDate=2026-02-27
Headers: 
  Authorization: Bearer <token>
```

### Response (Success with data)
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [
    {
      "_id": "...",
      "date": "2026-02-23T08:00:00.000Z",
      "data": {
        "sessionId": "session_23_0",
        "chargePointId": "CP0023",
        "energyConsumed": 45,
        "duration": 90,
        "cost": "75.50",
        "userId": "user_42",
        "status": "completed"
      }
    }
  ],
  "count": 15,
  "dateRange": {
    "start": "2026-02-23",
    "end": "2026-02-27"
  }
}
```

### Response (No data)
```json
{
  "success": true,
  "message": "No data available for the selected date range",
  "data": [],
  "count": 0
}
```

## Database Schema

The `session_data` collection uses a flexible schema that can store any data structure. The required field is:

- `date` (Date): The timestamp of the session

All other fields can be stored in the `data` object or as top-level fields.

## Customization

### To modify the data structure:
1. Update `backend/src/models/SessionData.js` to add specific fields
2. Update the table display in `frontend/src/app/dashboard/page.tsx`

### To add Excel export:
- Install a library like `xlsx` or `exceljs`
- Update the download button handler to generate Excel instead of JSON

## Environment Variables

Make sure your `.env` file has:
```
MONGO_URI=mongodb://localhost:27017/your_database_name
```

## Notes
- The date range picker starts at February 2026
- Dates are stored in UTC
- The table shows expandable details for each record
- Authentication is required to access the API
