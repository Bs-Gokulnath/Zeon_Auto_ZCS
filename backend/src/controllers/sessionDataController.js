const SessionData = require('../models/SessionData');

// Helper function to format Date to DD/MM/YYYY
const formatToDbDate = (year, month, day) => {
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${dayStr}/${monthStr}/${year}`;
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

    console.log('Searching for dates in DB format:', dateStrings);

    // Query database - check both date formats
    const sessionData = await SessionData.find({
      $or: [
        { end_date: { $in: dateStrings } },
        { start_date: { $in: dateStrings } }
      ]
    }).sort({ end_date: 1 });

    console.log('Found records count:', sessionData.length);
    if (sessionData.length > 0) {
      console.log('Sample record dates:', sessionData[0].end_date, sessionData[0].start_date);
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
