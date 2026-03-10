import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line, Legend
} from 'recharts';
import { Zap, TrendingDown, AlertTriangle, BarChart3, Layers, Activity, Users, Settings, X } from 'lucide-react';

export interface ConnectorMetrics {
  totalSessions: number;
  positiveSessions: number;
  negativeSessions: number;
  prechargingFailures: number;
  networkPerformance: number;
  totalEnergy: number;
  avgSessionDuration: number;
  peakPower: number;
}

export interface Analytics {
  filterOptions: {
    oems: string[];
    stations: string[];
    cpids: string[];
  };
  metrics: {
    combined:   ConnectorMetrics;
    connector0: ConnectorMetrics;
    connector1: ConnectorMetrics;
    connector2: ConnectorMetrics;
    connector3: ConnectorMetrics;
    connector4: ConnectorMetrics;
    connector5: ConnectorMetrics;
    connector6: ConnectorMetrics;
  };
  sessionTrend: Array<{ date: string; peakPower: number; avgPower: number; totalSessions: number }>;
  networkPerformance: {
    byOEM:     Array<{ oem: string; negativeStopPercentage: number; totalSessions: number }>;
    byStation: Array<{ station: string; negativeStopPercentage: number; negativeStops: number; totalSessions: number }>;
  };
  prechargingFailures: {
    byOEM:     Array<{ oem: string; count: number }>;
    byStation: Array<{ station: string; count: number }>;
  };
  errorBreakdown: Array<{ errorCode: string; count: number; percentage: number }>;
  authMethods:    Array<{ method: string; value: number }>;
  chargingShare:  Array<{ oem: string; value: number; percentage: number }>;
  cpidAnalytics?: Array<{ cpid: string; negativeStopPercentage: number; negativeStops: number; totalSessions: number }>;
}

interface Props {
  analytics: Analytics;
  connectorType: string;
  onConnectorTypeChange: (type: string) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">
          Value: <span className="font-bold text-blue-600">{payload[0].value}</span>
          {payload[0].payload.percentage != null && (
            <span className="ml-1">({payload[0].payload.percentage}%)</span>
          )}
        </p>
      </div>
    );
  }
  return null;
};

const TreeSection: React.FC<{ data: ConnectorMetrics }> = ({ data }) => {
  const chargingSessions = data.totalSessions - data.prechargingFailures;
  const rate = chargingSessions > 0
    ? Math.round((data.positiveSessions / chargingSessions) * 100)
    : 0;
  const isGood = rate >= 70;

  const chargingPct    = data.totalSessions > 0 ? Math.round((chargingSessions / data.totalSessions) * 100) : 0;
  const prePct         = data.totalSessions > 0 ? Math.round((data.prechargingFailures / data.totalSessions) * 100) : 0;
  const negativePct    = chargingSessions > 0 ? Math.round((data.negativeSessions / chargingSessions) * 100) : 0;
  const positivePct    = chargingSessions > 0 ? Math.round((data.positiveSessions / chargingSessions) * 100) : 0;

  return (
    <div className="flex flex-col h-full justify-evenly py-4">
      <div className="flex justify-center mb-3">
        <div className="bg-blue-500 text-white rounded-xl px-4 py-2 text-center shadow-md min-w-[110px]">
          <div className="text-xs font-semibold">Total Sessions</div>
          <div className="text-lg font-bold">{data.totalSessions}</div>
          <div className="text-xs font-medium">(100%)</div>
        </div>
      </div>

      <div className="flex justify-center mb-2">
        <svg width="140" height="24" className="overflow-visible">
          <line x1="70" y1="0" x2="35" y2="24" stroke="#9CA3AF" strokeWidth="1.5"/>
          <line x1="70" y1="0" x2="105" y2="24" stroke="#9CA3AF" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="flex justify-center gap-4 mb-3">
        <div className="bg-green-500 text-white rounded-lg px-3 py-2 text-center shadow-sm min-w-[95px]">
          <div className="text-xs font-semibold">Charging</div>
          <div className="text-base font-bold">{chargingSessions}</div>
          <div className="text-xs font-medium">({chargingPct}%)</div>
        </div>
        <div className="bg-purple-500 text-white rounded-lg px-3 py-2 text-center shadow-sm min-w-[95px]">
          <div className="text-xs font-semibold">Pre Charging</div>
          <div className="text-base font-bold">{data.prechargingFailures}</div>
          <div className="text-xs font-medium">({prePct}%)</div>
        </div>
      </div>

      <div className="flex justify-start ml-[20%] mb-2">
        <svg width="80" height="20" className="overflow-visible">
          <line x1="40" y1="0" x2="15" y2="20" stroke="#9CA3AF" strokeWidth="1.5"/>
          <line x1="40" y1="0" x2="65" y2="20" stroke="#9CA3AF" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="flex justify-start ml-[8%] gap-3 mb-3">
        <div className="bg-red-500 text-white rounded-md px-3 py-2 text-center shadow-sm min-w-[80px]">
          <div className="text-xs font-semibold">Negative Stops</div>
          <div className="text-sm font-bold">{data.negativeSessions}</div>
          <div className="text-xs font-medium">({negativePct}%)</div>
        </div>
        <div className="bg-teal-500 text-white rounded-md px-3 py-2 text-center shadow-sm min-w-[80px]">
          <div className="text-xs font-semibold">Positives</div>
          <div className="text-sm font-bold">{data.positiveSessions}</div>
          <div className="text-xs font-medium">({positivePct}%)</div>
        </div>
      </div>

      <div className={`text-xs font-bold text-center mt-2 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        Success Rate: {rate}% ({data.positiveSessions} / {chargingSessions})
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{
  title: string;
  icon?: any;
  borderColorClass?: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, borderColorClass = 'border-blue-500', children }) => (
  <div className={`bg-white rounded-xl shadow-md flex flex-col overflow-hidden border-t-4 ${borderColorClass} hover:shadow-lg transition-all duration-300 h-full`}>
    <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white flex-none">
      {Icon && <Icon className="w-4 h-4 text-gray-600" />}
      <h3 className="text-sm font-bold text-gray-800 truncate">{title}</h3>
    </div>
    <div className="p-3 flex-1 min-h-0 relative">{children}</div>
  </div>
);


const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props;
  
  // Don't show label if percentage is too small
  if (percentage < 2) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return (
    <g>
      {/* White background for better contrast */}
      <text 
        x={x} 
        y={y} 
        textAnchor="middle"
        dominantBaseline="central" 
        fontSize="13" 
        fontWeight="700"
        stroke="white"
        strokeWidth="3"
        fill="white"
      >
        {`${percentage}%`}
      </text>
      {/* Black text on top */}
      <text 
        x={x} 
        y={y} 
        fill="#000000"
        textAnchor="middle"
        dominantBaseline="central" 
        fontSize="13" 
        fontWeight="700"
      >
        {`${percentage}%`}
      </text>
    </g>
  );
};

// ─── Scrollable Bar Chart wrapper ─────────────────────────────────────────────

// Custom Tick Component for better label display
const CustomXAxisTick: React.FC<any> = ({ x, y, payload }) => {
  const maxLength = 15; // Maximum characters before truncation
  const fullText = payload.value || '';
  const displayText = fullText.length > maxLength 
    ? `${fullText.substring(0, maxLength)}...` 
    : fullText;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#374151"
        fontSize={10}
        fontWeight="600"
        transform="rotate(-45)"
      >
        {displayText}
      </text>
    </g>
  );
};

const ScrollableBar: React.FC<{
  data: any[];
  fill: string;
  labelType?: 'percent' | 'count';
  cursorFill?: string;
}> = ({ data, fill, labelType = 'percent', cursorFill = '#FEE2E2' }) => {
  const minWidth = data.length > 10 ? `${data.length * 90}px` : '100%';
  return (
    <div className={data.length > 10 ? 'overflow-x-auto h-full' : 'h-full'}>
      <div style={{ minWidth, height: '100%' }}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 30, right: 20, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              tick={<CustomXAxisTick />}
              axisLine={false} 
              tickLine={false} 
              interval={0}
              height={90}
            />
            <YAxis hide />
            <Tooltip cursor={{ fill: cursorFill, stroke: 'none' }} content={<CustomTooltip />} />
            <Bar dataKey="value" fill={fill} radius={[6, 6, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                fill="#000"
                fontSize={11}
                fontWeight="bold"
                formatter={labelType === 'percent' ? (v: any) => `${v}%` : undefined}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ analytics, connectorType, onConnectorTypeChange }: Props) {
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  const [selectedConnectors, setSelectedConnectors] = useState<number[]>([0, 1, 2, 3]);
  
  const PIE_COLORS   = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  const ERROR_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];
  const COLORS = { blue: '#3B82F6', green: '#10B981', orange: '#F59E0B', red: '#EF4444', purple: '#8B5CF6' };

  const { metrics, networkPerformance, prechargingFailures, errorBreakdown,
          authMethods, chargingShare, sessionTrend, cpidAnalytics } = analytics;

  // Metrics summary cards
  const combined = metrics.combined;

  // Toggle connector selection
  const toggleConnector = (num: number) => {
    setSelectedConnectors(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort()
    );
  };

  // Charts data
  const errorData    = errorBreakdown.map(e => ({ name: e.errorCode, value: e.count, percentage: e.percentage }));
  const oemNetData   = networkPerformance.byOEM.map(d => ({ name: d.oem,     value: d.negativeStopPercentage }));
  const stationData  = networkPerformance.byStation.map(d => ({ name: d.station, value: d.negativeStopPercentage }));
  const cpidData     = (cpidAnalytics || []).map(d => ({ name: d.cpid,    value: d.negativeStopPercentage }));
  const preOEMData   = prechargingFailures.byOEM.map(d => ({ name: d.oem,     value: d.count }));
  const preStatData  = prechargingFailures.byStation.map(d => ({ name: d.station, value: d.count }));
  const authData     = authMethods.map(d => ({ name: d.method, value: d.value }));
  const trendData    = sessionTrend.map(d => ({ label: d.date, peak: d.peakPower, avg: d.avgPower, sessions: d.totalSessions }));

  // Charging share pie (by OEM)
  const shareTotal = chargingShare.reduce((s, d) => s + d.value, 0);
  const sharePie   = chargingShare.slice(0, 6).map(d => ({
    name: d.oem,
    value: d.value,
    percentage: shareTotal > 0 ? Math.round((d.value / shareTotal) * 100) : 0
  }));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="space-y-4 p-4 max-w-[1600px] mx-auto">

        {/* Charger Usage, Charging Share & Error Breakdown - Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Charger Usage (2 columns) */}
          <div className="lg:col-span-2">
            <DashboardCard title="Charger Usage & Readiness" icon={Zap} borderColorClass="border-blue-500">
              <div className="h-full min-h-[380px] flex flex-col">
                {/* Combined View with Customize Button */}
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Combined View</h4>
                  <button
                    onClick={() => setShowConnectorModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    View Connectors
                  </button>
                </div>
                
                {/* Combined Connector Display */}
                <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center justify-center">
                  <div className="w-full max-w-2xl">
                    <TreeSection data={metrics.combined} />
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Charging Share by OEM (1 column) */}
          <div>
            <DashboardCard title="Charging Share by OEM" icon={TrendingDown} borderColorClass="border-red-500">
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie 
                      data={sharePie} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={85}
                      paddingAngle={3} 
                      dataKey="value" 
                      label={renderPieLabel}
                      labelLine={false}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {sharePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2 px-2">
                  {sharePie.map((item, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-[90px]" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Error Breakdown (1 column) */}
          <div>
            <DashboardCard title="Error Breakdown" icon={AlertTriangle} borderColorClass="border-orange-500">
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center">
                {errorData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie 
                          data={errorData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={50} 
                          outerRadius={85}
                          paddingAngle={3} 
                          dataKey="value" 
                          label={renderPieLabel}
                          labelLine={false}
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {errorData.map((_, i) => <Cell key={i} fill={ERROR_COLORS[i % ERROR_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-2 mt-2 px-2">
                      {errorData.map((item, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: ERROR_COLORS[i % ERROR_COLORS.length] }} />
                          <span className="text-xs font-semibold text-gray-700 truncate max-w-[100px]" title={item.name}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">No errors found</div>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Network Performance by OEM - Full Width */}
        <DashboardCard title="1. Network Performance by OEM (Neg Stop%)" icon={BarChart3} borderColorClass="border-orange-600">
          <ScrollableBar data={oemNetData} fill="#C2410C" cursorFill="#FEF3C7" />
        </DashboardCard>

        {/* Network Performance by Station */}
        {stationData.length > 0 && (
          <DashboardCard title="2. Network Performance by Station (Neg Stop%)" icon={Layers} borderColorClass="border-red-600">
            <ScrollableBar data={stationData} fill="#DC2626" cursorFill="#FEE2E2" />
          </DashboardCard>
        )}

        {/* Network Performance by CPID */}
        {cpidData.length > 0 && (
          <DashboardCard title="3. Network Performance by CPID (Neg Stop%)" icon={Layers} borderColorClass="border-purple-600">
            <ScrollableBar data={cpidData} fill="#7C3AED" cursorFill="#F3E8FF" />
          </DashboardCard>
        )}

        {/* Precharging Failures by OEM */}
        {preOEMData.length > 0 && (
          <DashboardCard title="4. Precharging Failure by OEM" icon={Layers} borderColorClass="border-orange-500">
            <ScrollableBar data={preOEMData} fill="#F59E0B" labelType="count" cursorFill="#FEF3C7" />
          </DashboardCard>
        )}

        {/* Precharging Failures by Station */}
        {preStatData.length > 0 && (
          <DashboardCard title="5. Precharging Failure by Station" icon={Layers} borderColorClass="border-purple-500">
            <ScrollableBar data={preStatData} fill="#8B5CF6" labelType="count" cursorFill="#EDE9FE" />
          </DashboardCard>
        )}

        {/* Auth Methods & Session Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DashboardCard title="6. Session Trend (Power Quality)" icon={Activity} borderColorClass="border-green-500">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={trendData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 10 }} dy={10} minTickGap={30} />
                    <YAxis yAxisId="left"  axisLine={false} tickLine={false} tick={{ fill: '#F59E0B', fontSize: 9 }} width={40} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                      tick={{ fill: '#10B981', fontSize: 9 }} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="right" height={30} iconSize={8}
                      wrapperStyle={{ fontSize: '10px' }}
                      content={(props: any) => (
                        <div className="flex gap-4 justify-end text-xs">
                          {props.payload?.map((e: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className="w-3 h-0.5" style={{ backgroundColor: e.color }} />
                              <span style={{ color: e.color, fontWeight: 'bold' }}>
                                {e.value === 'Peak Power' ? 'Peak (L)' : 'Avg (R)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <Line yAxisId="left"  type="monotone" dataKey="peak" name="Peak Power"
                      stroke={COLORS.orange} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="avg"  name="Avg Power"
                      stroke={COLORS.green} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">No trend data available</div>
              )}
            </DashboardCard>
          </div>

          {authData.length > 0 && (
            <DashboardCard title="Auth Methods" icon={Users} borderColorClass="border-blue-400">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={authData} margin={{ top: 30, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="value" position="top" fill="#000" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>
          )}
        </div>
      </div>

      {/* Connector Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Connector Details</h2>
              </div>
              <button
                onClick={() => setShowConnectorModal(false)}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Connector Selection */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-700">Select Connectors:</span>
                <div className="flex gap-3">
                  {[0, 1, 2, 3, 4, 5, 6].map(num => (
                    <label key={num} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedConnectors.includes(num)}
                        onChange={() => toggleConnector(num)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Connector {num}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedConnectors.length > 0 ? (
                <div className={`grid gap-6 ${
                  selectedConnectors.length === 1 ? 'grid-cols-1' :
                  selectedConnectors.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {selectedConnectors.map(num => {
                    const key = `connector${num}` as keyof typeof metrics;
                    return (
                      <div key={num} className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
                        <h4 className="text-sm font-bold text-blue-600 uppercase mb-4 text-center tracking-wide border-b-2 border-blue-200 pb-2">
                          Connector {num}
                        </h4>
                        <TreeSection data={metrics[key]} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Settings className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No connectors selected</p>
                  <p className="text-sm mt-2">Select at least one connector to view details</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowConnectorModal(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
