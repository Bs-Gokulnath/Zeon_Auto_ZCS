const SessionData = require('../models/SessionData');

// Helper function to format Date to YYYY-MM-DD for session_start_time/session_end_time matching
const formatToDbDate = (year, month, day) => {
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

exports.getAnalyticsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

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
      endYear = startYear;
      endMonth = startMonth;
      endDay = startDay;
    }

    // Generate all dates in the range
    const dateStrings = [];
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

    // Build query with regex patterns for each date
    const orConditions = [];
    dateStrings.forEach(dateStr => {
      orConditions.push({ session_end_time: { $regex: `^${dateStr}` } });
      orConditions.push({ session_start_time: { $regex: `^${dateStr}` } });
    });

    // Fetch session data
    const sessionData = await SessionData.find({
      $or: orConditions
    });

    if (sessionData.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No data available for the selected date range',
        analytics: null,
        count: 0
      });
    }

    // Calculate analytics
    const analytics = calculateAnalytics(sessionData);

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      analytics,
      count: sessionData.length,
      dateRange: {
        start: startDate,
        end: endDate || startDate
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

function calculateAnalytics(sessionData) {
  // Initialize counters
  const stats = {
    combined: { preparing: 0, charging: 0, preCharging: 0, negativeStops: 0, positiveStops: 0 },
    connector1: { preparing: 0, charging: 0, preCharging: 0, negativeStops: 0, positiveStops: 0 },
    connector2: { preparing: 0, charging: 0, preCharging: 0, negativeStops: 0, positiveStops: 0 }
  };

  const errorCounts = {};
  const oemStops = {};

  sessionData.forEach(record => {
    const connector = record.connector_id === '1' ? 'connector1' : 
                     record.connector_id === '2' ? 'connector2' : null;

    // Count preparing
    if (record.is_Preparing === 1) {
      stats.combined.preparing++;
      if (connector) stats[connector].preparing++;
    }

    // Count charging
    if (record.is_Charging === 1) {
      stats.combined.charging++;
      if (connector) stats[connector].charging++;
    }

    // Pre-charging failures (Stop_Type = meterStop and specific conditions)
    if (record.Stop_Type === 'meterStop' && record.vendorErrorCode) {
      stats.combined.preCharging++;
      if (connector) stats[connector].preCharging++;
    }

    // Negative vs Positive stops
    const isNegativeStop = record.Stop_Type === 'meterStop' || 
                          record.reason === 'Other' || 
                          record.vendorErrorCode;
    
    if (isNegativeStop) {
      stats.combined.negativeStops++;
      if (connector) stats[connector].negativeStops++;
    } else {
      stats.combined.positiveStops++;
      if (connector) stats[connector].positiveStops++;
    }

    // Error tracking
    if (record.errorCode && record.errorCode !== 'NoError') {
      errorCounts[record.errorCode] = (errorCounts[record.errorCode] || 0) + 1;
    }
    if (record.vendorErrorCode) {
      errorCounts[record.vendorErrorCode] = (errorCounts[record.vendorErrorCode] || 0) + 1;
    }

    // OEM tracking (you might need to add OEM field in your data)
    const oem = record.oem || 'OVERALL';
    if (!oemStops[oem]) {
      oemStops[oem] = { negative: 0, total: 0 };
    }
    oemStops[oem].total++;
    if (isNegativeStop) {
      oemStops[oem].negative++;
    }
  });

  // Calculate percentages and success rates
  const calculateStats = (data) => {
    const totalCharging = data.charging;
    const successRate = totalCharging > 0 
      ? ((data.positiveStops / totalCharging) * 100).toFixed(0) 
      : 0;
    
    return {
      preparing: data.preparing,
      preparingPerc: 100,
      charging: data.charging,
      chargingPerc: data.preparing > 0 ? ((data.charging / data.preparing) * 100).toFixed(0) : 0,
      preCharging: data.preCharging,
      preChargingPerc: data.preparing > 0 ? ((data.preCharging / data.preparing) * 100).toFixed(0) : 0,
      negativeStops: data.negativeStops,
      negativeStopsPerc: totalCharging > 0 ? ((data.negativeStops / totalCharging) * 100).toFixed(0) : 0,
      positiveStops: data.positiveStops,
      positiveStopsPerc: totalCharging > 0 ? ((data.positiveStops / totalCharging) * 100).toFixed(0) : 0,
      successRate: successRate,
      successRateText: `${successRate}% (${data.positiveStops} / ${totalCharging})`
    };
  };

  // Calculate charging shares
  const totalStops = stats.combined.negativeStops + stats.combined.positiveStops + stats.combined.preCharging;
  const chargingShares = {
    negativeStops: totalStops > 0 ? ((stats.combined.negativeStops / totalStops) * 100).toFixed(0) : 0,
    positiveStops: totalStops > 0 ? ((stats.combined.positiveStops / totalStops) * 100).toFixed(0) : 0,
    preChargingFailure: totalStops > 0 ? ((stats.combined.preCharging / totalStops) * 100).toFixed(0) : 0
  };

  // Calculate OEM percentages
  const oemAnalytics = Object.entries(oemStops).map(([oem, data]) => ({
    oem,
    negativeStopPercentage: data.total > 0 ? ((data.negative / data.total) * 100).toFixed(0) : 0
  }));

  // Calculate error summary
  const totalErrors = Object.values(errorCounts).reduce((sum, count) => sum + count, 0);
  const errorSummary = Object.entries(errorCounts).map(([error, count]) => ({
    error,
    count,
    percentage: totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(0) : 0
  }));

  return {
    chargerUsage: {
      combined: calculateStats(stats.combined),
      connector1: calculateStats(stats.connector1),
      connector2: calculateStats(stats.connector2)
    },
    chargingShares,
    oemAnalytics,
    errorSummary
  };
}
