const SessionData = require('../models/SessionData');

// Helper function to format Date to YYYY-MM-DD for session_start_time/session_end_time matching
const formatToDbDate = (year, month, day) => {
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

exports.getSessionDataByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    console.log('=== Session Data Query ===');
    console.log('Received startDate:', startDate);
    console.log('Received endDate:', endDate);

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required'
      });
    }

    // Parse dates from YYYY-MM-DD format
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    
    let endYear, endMonth, endDay;
    if (endDate) {
      [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    } else {
      // If no end date, use start date
      endYear = startYear;
      endMonth = startMonth;
      endDay = startDay;
    }

    // Generate all dates in the range in DD/MM/YYYY format
    const dateStrings = [];
    
    // Create dates for comparison
    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const endDateObj = new Date(endYear, endMonth - 1, endDay);
    
    const currentDate = new Date(startDateObj);
    while (currentDate <= endDateObj) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      dateStrings.push(formatToDbDate(year, month, day));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Searching for dates in DB format (YYYY-MM-DD):', dateStrings);

    // Build query with regex patterns for each date
    const orConditions = [];
    dateStrings.forEach(dateStr => {
      orConditions.push({ session_end_time: { $regex: `^${dateStr}` } });
      orConditions.push({ session_start_time: { $regex: `^${dateStr}` } });
    });

    // Query database - check session_start_time and session_end_time fields
    const sessionData = await SessionData.find({
      $or: orConditions
    }).sort({ session_end_time: 1 });

    console.log('Found records count:', sessionData.length);
    if (sessionData.length > 0) {
      console.log('Sample record dates:', sessionData[0].session_start_time, sessionData[0].session_end_time);
    }
    console.log('=== End Query ===\n');

    if (sessionData.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No data available for the selected date range',
        data: [],
        count: 0,
        searchedDates: dateStrings
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data retrieved successfully',
      data: sessionData,
      count: sessionData.length,
      dateRange: {
        start: startDate,
        end: endDate || startDate
      }
    });

  } catch (error) {
    console.error('Error fetching session data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching session data',
      error: error.message
    });
  }
};
