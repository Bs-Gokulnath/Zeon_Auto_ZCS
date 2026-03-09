const SessionData = require('../models/SessionData');
const CPDetails = require('../models/CPDetails');

exports.getFilterOptions = async (req, res) => {
  try {
    // Fetch all CP details to get OEM, Station, and CPID information
    const cpDetails = await CPDetails.find({});

    const stations = new Set();
    const oems = new Set();
    const cpids = new Set();

    cpDetails.forEach(cp => {
      const station = cp.station_name || cp.Station_Name || cp['Station Identity'] || cp.station;
      const oem = cp.oem || cp.OEM || cp.Make || cp.manufacturer;
      const cpid = cp.cp_id || cp.charge_point_id || cp.chargePointId || cp.CPID;

      if (station) stations.add(station);
      if (oem) oems.add(oem);
      if (cpid) cpids.add(cpid);
    });

    res.json({ 
      success: true, 
      stations: [...stations].sort(), 
      oems: [...oems].sort(), 
      cpids: [...cpids].sort() 
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ success: false, message: 'Error fetching filter options', error: error.message });
  }
};

const formatToDbDate = (year, month, day) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const buildDateConditions = (startDate, endDate) => {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = (endDate || startDate).split('-').map(Number);

  const dateStrings = [];
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  while (cur <= end) {
    dateStrings.push(formatToDbDate(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }

  const orConditions = [];
  dateStrings.forEach(d => {
    orConditions.push({ session_start_time: { $regex: `^${d}` } });
    orConditions.push({ session_end_time: { $regex: `^${d}` } });
  });

  return { orConditions, dateStrings };
};

const buildQuery = (orConditions, { cpId, stationName, oemFilter, connectorType }) => {
  const query = { $or: orConditions };

  if (cpId) {
    query.$and = query.$and || [];
    query.$and.push({ $or: [{ cp_id: cpId }, { charge_point_id: cpId }, { chargePointId: cpId }, { CPID: cpId }] });
  }
  if (stationName) {
    query.$and = query.$and || [];
    query.$and.push({ $or: [{ station_name: stationName }, { Station_Name: stationName }, { 'Station Identity': stationName }] });
  }
  if (oemFilter) {
    query.$and = query.$and || [];
    query.$and.push({ $or: [{ oem: oemFilter }, { OEM: oemFilter }, { Make: oemFilter }] });
  }
  if (connectorType && connectorType !== 'Combined') {
    query.$and = query.$and || [];
    query.$and.push({ $or: [{ connector_type: connectorType }, { ac_dc: connectorType }] });
  }

  return query;
};

exports.getDashboard = async (req, res) => {
  try {
    const startDate = req.query.start_date || req.query.startDate;
    const endDate   = req.query.end_date   || req.query.endDate;
    const cpId          = req.query.cp_id;
    const stationName   = req.query.s_n;
    const oemFilter     = req.query.oem;
    const connectorType = req.query.connector_type;

    if (!startDate) {
      return res.status(400).json({ success: false, message: 'start_date is required' });
    }

    const { orConditions } = buildDateConditions(startDate, endDate);
    const query = buildQuery(orConditions, { cpId, stationName, oemFilter, connectorType });
    
    // Fetch both session data and CP details
    const [sessionData, cpDetails] = await Promise.all([
      SessionData.find(query),
      CPDetails.find({})
    ]);

    console.log(`[DEBUG getDashboard] Found ${sessionData.length} sessions, ${cpDetails.length} CP details`);
    
    // Log sample session cpid
    if (sessionData.length > 0) {
      const sampleSession = sessionData[0];
      const sampleCpid = sampleSession.cp_id || sampleSession.charge_point_id || sampleSession.chargePointId || sampleSession.CPID;
      console.log(`[DEBUG getDashboard] Sample session cpid: "${sampleCpid}" (type: ${typeof sampleCpid})`);
    }
    
    // Log sample cp detail
    if (cpDetails.length > 0) {
      const sampleCp = cpDetails[0];
      console.log(`[DEBUG getDashboard] Sample CP detail keys:`, Object.keys(sampleCp.toObject ? sampleCp.toObject() : sampleCp));
      const sampleCpid = sampleCp.cp_id || sampleCp.charge_point_id || sampleCp.chargePointId || sampleCp.CPID;
      console.log(`[DEBUG getDashboard] Sample CP cpid: "${sampleCpid}" (type: ${typeof sampleCpid})`);
    }

    // Create lookup map: cp_id -> {oem, station_name}
    const cpDetailsMap = new Map();
    cpDetails.forEach(cp => {
      const cpid = cp.cp_id || cp.charge_point_id || cp.chargePointId || cp.CPID;
      if (cpid) {
        const oemValue = cp.oem || cp.OEM || cp.Make || cp.manufacturer || 'Unknown';
        const stationValue = cp.station_name || cp.Station_Name || cp['Station Identity'] || cp.station || 'Unknown';
        
        cpDetailsMap.set(cpid, {
          oem: oemValue,
          station: stationValue,
          cpid: cpid
        });
        
        // Log first entry for debugging
        if (cpDetailsMap.size === 1) {
          console.log(`[DEBUG getDashboard] First map entry: cpid="${cpid}" -> OEM="${oemValue}", Station="${stationValue}"`);
        }
      }
    });
    
    console.log(`[DEBUG getDashboard] Created map with ${cpDetailsMap.size} entries`);

    if (sessionData.length === 0) {
      return res.status(200).json({
        success: true,
        filterOptions: { oems: [], stations: [], cpids: [] },
        metrics: buildEmptyMetrics(),
        sessionTrend: [],
        networkPerformance: { byOEM: [], byStation: [] },
        prechargingFailures: { byOEM: [], byStation: [] },
        errorBreakdown: [],
        authMethods: [],
        chargingShare: [],
        cpidAnalytics: [],
        count: 0,
        dateRange: { start: startDate, end: endDate || startDate }
      });
    }

    const result = calculateDashboard(sessionData, cpDetailsMap);

    return res.status(200).json({
      success: true,
      ...result,
      count: sessionData.length,
      dateRange: { start: startDate, end: endDate || startDate }
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard', error: error.message });
  }
};

exports.getCpidRankings = async (req, res) => {
  try {
    const startDate     = req.query.start_date || req.query.startDate;
    const endDate       = req.query.end_date   || req.query.endDate;
    const oemFilter     = req.query.oem;
    const stationFilter = req.query.station;
    const connectorType = req.query.connector_type;

    if (!startDate) {
      return res.status(400).json({ success: false, message: 'start_date is required' });
    }

    const { orConditions } = buildDateConditions(startDate, endDate);
    const query = buildQuery(orConditions, { stationName: stationFilter, oemFilter, connectorType });
    
    // Fetch both session data and CP details
    const [sessionData, cpDetails] = await Promise.all([
      SessionData.find(query),
      CPDetails.find({})
    ]);

    // Create lookup map: cp_id -> {oem, station_name}
    const cpDetailsMap = new Map();
    cpDetails.forEach(cp => {
      const cpid = cp.cp_id || cp.charge_point_id || cp.chargePointId || cp.CPID;
      if (cpid) {
        cpDetailsMap.set(cpid, {
          oem: cp.oem || cp.OEM || cp.Make || cp.manufacturer || 'Unknown',
          station: cp.station_name || cp.Station_Name || cp['Station Identity'] || cp.station || 'Unknown',
          cpid: cpid
        });
      }
    });

    const cpidMap = {};
    sessionData.forEach(record => {
      const cpid = record.cp_id || record.charge_point_id || record.chargePointId || record.CPID || 'Unknown';
      const cpInfo = cpDetailsMap.get(cpid) || { oem: 'Unknown', station: 'Unknown', cpid: cpid };
      const station = cpInfo.station;
      const key = `${station} - ${cpid}`;

      if (!cpidMap[key]) cpidMap[key] = { chargingSessions: 0, negativeStops: 0 };

      const stopVal = String(record.stop || '').toLowerCase();
      const isPre   = record.is_Charging === 0;
      const isPos   = !isPre && stopVal === 'successful';
      const isNeg   = !isPre && !isPos;

      if (!isPre) cpidMap[key].chargingSessions++;
      if (isNeg)  cpidMap[key].negativeStops++;
    });

    const rankings = Object.entries(cpidMap)
      .map(([cpid, d]) => ({
        cpid,
        chargingSessions: d.chargingSessions,
        negativeStops: d.negativeStops,
        negativeStopPercentage: d.chargingSessions > 0
          ? parseFloat(((d.negativeStops / d.chargingSessions) * 100).toFixed(1))
          : 0
      }))
      .sort((a, b) => b.negativeStopPercentage - a.negativeStopPercentage);

    res.status(200).json(rankings);

  } catch (error) {
    console.error('Error fetching CPID rankings:', error);
    res.status(500).json({ success: false, message: 'Error fetching CPID rankings', error: error.message });
  }
};

// Backward-compatible alias
exports.getAnalyticsByDateRange = exports.getDashboard;

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildEmptyMetrics() {
  const empty = {
    totalSessions: 0, positiveSessions: 0, negativeSessions: 0,
    prechargingFailures: 0, networkPerformance: 0,
    totalEnergy: 0, avgSessionDuration: 0, peakPower: 0
  };
  return {
    combined:   { ...empty },
    connector1: { ...empty }, connector2: { ...empty },
    connector3: { ...empty }, connector4: { ...empty },
    connector5: { ...empty }, connector6: { ...empty }
  };
}

function calculateDashboard(sessionData, cpDetailsMap) {
  const oemsSet     = new Set();
  const stationsSet = new Set();
  const cpidsSet    = new Set();

  const connectorKeys = ['combined', 'connector1', 'connector2', 'connector3', 'connector4', 'connector5', 'connector6'];
  const raw = {};
  connectorKeys.forEach(k => {
    raw[k] = { totalSessions: 0, positiveSessions: 0, negativeSessions: 0, prechargingFailures: 0, totalEnergy: 0, totalDuration: 0, peakPower: 0 };
  });

  const oemNetPerf       = {};
  const stationNetPerf   = {};
  const oemPrecharging   = {};
  const stationPrecharging = {};
  const errorCounts      = {};
  const authMethodCounts = {};
  const oemSessions      = {};
  const sessionTrendMap  = {};
  const cpidNegStops     = {};

  sessionData.forEach(record => {
    // Extract cp_id from session record
    const cpid = record.cp_id || record.charge_point_id || record.chargePointId || record.CPID || 'Unknown';
    
    // Look up OEM and Station from cp_details
    const cpInfo = cpDetailsMap.get(cpid) || { oem: 'Unknown', station: 'Unknown', cpid: cpid };
    const oem = cpInfo.oem;
    const station = cpInfo.station;
    
    // Debug logging for first 2 lookups
    if (sessionData.indexOf(record) < 2) {
      const found = cpDetailsMap.has(cpid);
      console.log(`[DEBUG calculateDashboard] Lookup #${sessionData.indexOf(record) + 1}: cpid="${cpid}" found=${found} -> OEM="${oem}", Station="${station}"`);
    }
    
    const cpidDisplay = `${station} - ${cpid}`;
    const connectorId  = record.connector_id;
    const connectorKey = connectorId ? `connector${connectorId}` : null;

    oemsSet.add(oem);
    stationsSet.add(station);
    cpidsSet.add(cpid);

    const energy   = parseFloat(record.session_energy_delivered_kwh || record.energy_delivered || 0);
    const duration = parseFloat(record.session_duration_minutes   || record.session_duration  || 0);
    const peakPwr  = parseFloat(record.session_peak_power_kw      || record.peak_power        || record.Peak_Power || 0);
    const avgPwr   = parseFloat(
      record.avg_power || record.Average_Power ||
      (duration > 0 ? (energy / (duration / 60)) : 0)
    );

    // P/C/N classification — source of truth is the `stop` field
    // Pre-charging: session never entered charging state
    // Positive: reached charging AND stop === 'Successful'
    // Negative: reached charging but stop was not successful
    const stopVal = String(record.stop || '').toLowerCase();
    const isPre   = record.is_Charging === 0;
    const isPos   = !isPre && stopVal === 'successful';
    const isNeg   = !isPre && !isPos;

    const updateMetrics = (key) => {
      raw[key].totalSessions++;
      raw[key].totalEnergy   += energy;
      raw[key].totalDuration += duration;
      if (peakPwr > raw[key].peakPower) raw[key].peakPower = peakPwr;
      if (isPre)      raw[key].prechargingFailures++;
      else if (isNeg) raw[key].negativeSessions++;
      else            raw[key].positiveSessions++;
    };

    updateMetrics('combined');
    if (connectorKey && raw[connectorKey]) updateMetrics(connectorKey);

    // Network performance by OEM / Station
    if (!oemNetPerf[oem]) oemNetPerf[oem] = { positive: 0, total: 0 };
    oemNetPerf[oem].total++;
    if (isPos) oemNetPerf[oem].positive++;

    if (!stationNetPerf[station]) stationNetPerf[station] = { positive: 0, negative: 0, total: 0 };
    stationNetPerf[station].total++;
    if (isPos) stationNetPerf[station].positive++;
    else       stationNetPerf[station].negative++;

    // Precharging failures
    if (isPre) {
      oemPrecharging[oem]      = (oemPrecharging[oem]      || 0) + 1;
      stationPrecharging[station] = (stationPrecharging[station] || 0) + 1;
    }

    // Error breakdown — only count errors on negative/precharging sessions
    if (isNeg || isPre) {
      if (record.errorCode && record.errorCode !== 'NoError') {
        errorCounts[record.errorCode] = (errorCounts[record.errorCode] || 0) + 1;
      }
      if (record.vendorErrorCode) {
        errorCounts[record.vendorErrorCode] = (errorCounts[record.vendorErrorCode] || 0) + 1;
      }
      // Also check all_errors array if present
      if (Array.isArray(record.all_errors)) {
        record.all_errors.forEach((e) => {
          if (e.errorCode && e.errorCode !== 'NoError') {
            errorCounts[e.errorCode] = (errorCounts[e.errorCode] || 0) + 1;
          }
          if (e.vendorErrorCode) {
            errorCounts[e.vendorErrorCode] = (errorCounts[e.vendorErrorCode] || 0) + 1;
          }
        });
      }
    }

    // Auth methods — use the actual boolean flags present in the documents
    const method = record.is_RFID_Start   ? 'RFID'
                 : record.is_REMOTE_Start ? 'Remote'
                 : record.is_Auto_Start   ? 'Auto'
                 : record.auth_method     || record.authMethod || 'Unknown';
    authMethodCounts[method] = (authMethodCounts[method] || 0) + 1;

    // Charging share by OEM
    oemSessions[oem] = (oemSessions[oem] || 0) + 1;

    // Session trend
    const dateKey = (record.session_start_time || '').substring(0, 10);
    if (dateKey) {
      if (!sessionTrendMap[dateKey]) sessionTrendMap[dateKey] = { peaks: [], avgs: [], total: 0 };
      sessionTrendMap[dateKey].peaks.push(peakPwr);
      sessionTrendMap[dateKey].avgs.push(avgPwr);
      sessionTrendMap[dateKey].total++;
    }

    // CPID analytics
    if (!cpidNegStops[cpidDisplay]) cpidNegStops[cpidDisplay] = { total: 0, negative: 0 };
    cpidNegStops[cpidDisplay].total++;
    if (!isPos) cpidNegStops[cpidDisplay].negative++;
  });

  // Finalise metrics
  const metrics = {};
  connectorKeys.forEach(k => {
    const m = raw[k];
    metrics[k] = {
      totalSessions:      m.totalSessions,
      positiveSessions:   m.positiveSessions,
      negativeSessions:   m.negativeSessions,
      prechargingFailures: m.prechargingFailures,
      networkPerformance: m.totalSessions > 0
        ? parseFloat(((m.positiveSessions / m.totalSessions) * 100).toFixed(1))
        : 0,
      totalEnergy:       parseFloat(m.totalEnergy.toFixed(2)),
      avgSessionDuration: m.totalSessions > 0
        ? parseFloat((m.totalDuration / m.totalSessions).toFixed(1))
        : 0,
      peakPower: parseFloat(m.peakPower.toFixed(2))
    };
  });

  const networkPerformance = {
    byOEM: Object.entries(oemNetPerf)
      .map(([oem, d]) => ({
        oem,
        negativeStopPercentage: parseFloat(((1 - d.positive / d.total) * 100).toFixed(1)),
        totalSessions: d.total
      }))
      .sort((a, b) => b.negativeStopPercentage - a.negativeStopPercentage),
    byStation: Object.entries(stationNetPerf)
      .map(([station, d]) => ({
        station,
        negativeStopPercentage: parseFloat((d.negative / d.total * 100).toFixed(1)),
        negativeStops: d.negative,
        totalSessions: d.total
      }))
      .sort((a, b) => b.negativeStopPercentage - a.negativeStopPercentage)
  };

  const prechargingFailures = {
    byOEM:     Object.entries(oemPrecharging).map(([oem, count]) => ({ oem, count })).sort((a, b) => b.count - a.count),
    byStation: Object.entries(stationPrecharging).map(([station, count]) => ({ station, count })).sort((a, b) => b.count - a.count)
  };

  const totalErrors = Object.values(errorCounts).reduce((s, c) => s + c, 0);
  const errorBreakdown = Object.entries(errorCounts)
    .map(([errorCode, count]) => ({
      errorCode,
      count,
      percentage: totalErrors > 0 ? parseFloat((count / totalErrors * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const authMethods = Object.entries(authMethodCounts)
    .map(([method, value]) => ({ method, value }));

  const total = sessionData.length;
  const chargingShare = Object.entries(oemSessions)
    .map(([oem, value]) => ({
      oem,
      value,
      percentage: parseFloat((value / total * 100).toFixed(1))
    }))
    .sort((a, b) => b.value - a.value);

  const sessionTrend = Object.entries(sessionTrendMap)
    .map(([date, d]) => ({
      date,
      peakPower:     parseFloat(Math.max(...d.peaks).toFixed(2)),
      avgPower:      parseFloat((d.avgs.reduce((s, v) => s + v, 0) / d.avgs.length).toFixed(2)),
      totalSessions: d.total
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cpidAnalytics = Object.entries(cpidNegStops)
    .map(([cpid, d]) => ({
      cpid,
      negativeStopPercentage: d.total > 0 ? parseFloat((d.negative / d.total * 100).toFixed(1)) : 0,
      negativeStops: d.negative,
      totalSessions: d.total
    }))
    .sort((a, b) => b.negativeStopPercentage - a.negativeStopPercentage);

  return {
    filterOptions: {
      oems:     [...oemsSet].sort(),
      stations: [...stationsSet].sort(),
      cpids:    [...cpidsSet].sort()
    },
    metrics,
    sessionTrend,
    networkPerformance,
    prechargingFailures,
    errorBreakdown,
    authMethods,
    chargingShare,
    cpidAnalytics
  };
}
