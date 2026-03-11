import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line, Legend
} from 'recharts';
import { Zap, TrendingDown, AlertTriangle, BarChart3, Layers, Activity, Users, Settings, X } from 'lucide-react';

export interface ConnectorMetrics {
  totalSessions: number;
  chargingSessions?: number; // Optional for backward compatibility
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
      <div className="bg-white px-4 py-3 rounded-lg shadow-xl border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-700 mt-1">
          Value: <span className="font-bold text-emerald-600">{payload[0].value}</span>
          {payload[0].payload.percentage != null && (
            <span className="ml-1 text-gray-500">({payload[0].payload.percentage}%)</span>
          )}
        </p>
      </div>
    );
  }
  return null;
};

const TreeSection: React.FC<{ data: ConnectorMetrics }> = ({ data }) => {
  // Use chargingSessions from backend if available, otherwise calculate (backward compatibility)
  const chargingSessions = data.chargingSessions !== undefined 
    ? data.chargingSessions 
    : data.totalSessions - data.prechargingFailures;
  
  const rate = chargingSessions > 0
    ? Math.round((data.positiveSessions / chargingSessions) * 100)
    : 0;
  const isGood = rate >= 70;

  const chargingPct    = data.totalSessions > 0 ? Math.round((chargingSessions / data.totalSessions) * 100) : 0;
  const prePct         = data.totalSessions > 0 ? Math.round((data.prechargingFailures / data.totalSessions) * 100) : 0;
  const negativePct    = chargingSessions > 0 ? Math.round((data.negativeSessions / chargingSessions) * 100) : 0;
  const positivePct    = chargingSessions > 0 ? Math.round((data.positiveSessions / chargingSessions) * 100) : 0;

  return (
    <div className="flex flex-col h-full justify-evenly py-2">
      <div className="flex justify-center mb-2">
        <div className="relative group bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 text-center shadow-md min-w-[110px] hover:shadow-lg hover:border-emerald-300 transition-all duration-300">
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-wider">Total Sessions</div>
            <div className="text-lg font-bold mt-0.5">{data.totalSessions}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-1.5">
        <svg width="120" height="20" className="overflow-visible">
          <line x1="60" y1="0" x2="30" y2="20" stroke="#94a3b8" strokeWidth="1.5"/>
          <line x1="60" y1="0" x2="90" y2="20" stroke="#94a3b8" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="flex justify-center gap-3 mb-2">
        <div className="group bg-green-50 border-2 border-green-200 text-green-700 rounded-lg px-3 py-1.5 text-center shadow-md min-w-[85px] hover:shadow-lg hover:border-green-300 transition-all duration-300">
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-wide">Charging</div>
            <div className="text-base font-bold mt-0.5">{chargingSessions}</div>
          </div>
        </div>
        <div className="group bg-purple-50 border-2 border-purple-200 text-purple-700 rounded-lg px-3 py-1.5 text-center shadow-md min-w-[85px] hover:shadow-lg hover:border-purple-300 transition-all duration-300">
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-wide">Pre Charging</div>
            <div className="text-base font-bold mt-0.5">{data.prechargingFailures}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-start ml-[20%] mb-1.5">
        <svg width="70" height="16" className="overflow-visible">
          <line x1="35" y1="0" x2="12" y2="16" stroke="#94a3b8" strokeWidth="1.5"/>
          <line x1="35" y1="0" x2="58" y2="16" stroke="#94a3b8" strokeWidth="1.5"/>
        </svg>
      </div>

      <div className="flex justify-start ml-[8%] gap-2.5 mb-2">
        <div className="group bg-red-50 border-2 border-red-200 text-red-700 rounded-lg px-2.5 py-1.5 text-center shadow-md min-w-[75px] hover:shadow-lg hover:border-red-300 transition-all duration-300">
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-wide">Negative Stops</div>
            <div className="text-sm font-bold mt-0.5">{data.negativeSessions}</div>
          </div>
        </div>
        <div className="group bg-green-50 border-2 border-green-200 text-green-700 rounded-lg px-2.5 py-1.5 text-center shadow-md min-w-[75px] hover:shadow-lg hover:border-green-300 transition-all duration-300">
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-wide">Positives</div>
            <div className="text-sm font-bold mt-0.5">{data.positiveSessions}</div>
          </div>
        </div>
      </div>

      <div className={`text-xs font-bold text-center mt-2 px-3 py-1.5 rounded-lg ${isGood ? 'bg-green-50 text-green-700 border-2 border-green-200' : 'bg-red-50 text-red-700 border-2 border-red-200'}`}>
        Success Rate: {rate}% ({data.positiveSessions} / {chargingSessions})
      </div>
    </div>
  );
};

const DashboardCard: React.FC<{
  title: string;
  icon?: any;
  borderColorClass?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon: Icon, borderColorClass = 'border-emerald-500', headerAction, children }) => (
  <div className="group bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-200 transition-all duration-300 h-full">
    {/* Modern header */}
    <div className={`px-5 py-4 flex items-center gap-3 bg-gray-50 border-b border-gray-200`}>
      {Icon && (
        <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-200 group-hover:bg-emerald-200 transition-colors duration-300">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
      )}
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      
      {/* Decorative line */}
      <div className="flex-1 h-px bg-gradient-to-r from-gray-300 via-transparent to-transparent ml-4" />
      
      {/* Header action (button, etc.) */}
      {headerAction && (
        <div className="ml-3">{headerAction}</div>
      )}
    </div>
    
    <div className="p-6 flex-1 min-h-0">{children}</div>
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
        fill="#4b5563"
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
  labelType?: 'percent' | 'count' | 'percentWithCount';
  cursorFill?: string;
}> = ({ data, fill, labelType = 'percent', cursorFill = '#f3f4f6' }) => {
  const minWidth = data.length > 10 ? `${data.length * 90}px` : '100%';
  return (
    <div className={data.length > 10 ? 'overflow-x-auto h-full' : 'h-full'}>
      <div style={{ minWidth, height: '100%' }}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 30, right: 20, left: 20, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
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
                fill="#374151"
                fontSize={11}
                fontWeight="bold"
                content={(props: any) => {
                  const { x, y, width, value, index } = props;
                  const entry = data[index];
                  let displayText = value;
                  
                  if (labelType === 'percentWithCount' && entry?.count) {
                    displayText = `${value}% (${entry.count})`;
                  } else if (labelType === 'percent') {
                    displayText = `${value}%`;
                  }
                  
                  return (
                    <text 
                      x={x + width / 2} 
                      y={y - 5} 
                      fill="#374151" 
                      textAnchor="middle" 
                      fontSize={11} 
                      fontWeight="bold"
                    >
                      {displayText}
                    </text>
                  );
                }}
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
  const oemNetData   = networkPerformance.byOEM.map(d => ({ name: d.oem,     value: d.negativeStopPercentage, count: d.totalSessions }));
  const stationData  = networkPerformance.byStation.map(d => ({ name: d.station, value: d.negativeStopPercentage, count: d.totalSessions }));
  const cpidData     = (cpidAnalytics || []).map(d => ({ name: d.cpid,    value: d.negativeStopPercentage }));
  const preOEMData   = prechargingFailures.byOEM.map(d => ({ name: d.oem,     value: d.count }));
  const preStatData  = prechargingFailures.byStation.map(d => ({ name: d.station, value: d.count }));
  
  // Auth methods with percentage
  const authTotal = authMethods.reduce((s, d) => s + d.value, 0);
  const authData = authMethods.map(d => ({
    name: d.method,
    value: d.value,
    percentage: authTotal > 0 ? Math.round((d.value / authTotal) * 100) : 0
  }));
  
  const trendData    = sessionTrend.map(d => ({ label: d.date, peak: d.peakPower, avg: d.avgPower, sessions: d.totalSessions }));

  // Charging share pie (by OEM)
  const shareTotal = chargingShare.reduce((s, d) => s + d.value, 0);
  const sharePie   = chargingShare.slice(0, 6).map(d => ({
    name: d.oem,
    value: d.value,
    percentage: shareTotal > 0 ? Math.round((d.value / shareTotal) * 100) : 0
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative z-10 space-y-4 p-4 max-w-full mx-auto overflow-x-hidden">

        {/* Charger Usage & Charging Share - Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Charger Usage */}
          <div>
            <DashboardCard 
              title="Charger Usage & Readiness" 
              icon={Zap} 
              borderColorClass="border-emerald-500"
              headerAction={
                <button
                  onClick={() => setShowConnectorModal(true)}
                  className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg duration-300"
                >
                  <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  View Connectors
                </button>
              }
            >
              <div className="h-full min-h-[320px] flex flex-col">
                {/* Combined View */}
                <div className="mb-2">
                  <h4 className="text-xs font-semibold text-gray-600">Combined View</h4>
                </div>
                
                {/* Combined Connector Display */}
                <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center justify-center">
                  <div className="w-full max-w-xl">
                    <TreeSection data={metrics.combined} />
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Charging Share by OEM */}
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
                      stroke="#ffffff"
                    >
                      {sharePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-3 px-2">
                  {sharePie.map((item, i) => (
                    <div key={i} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300">
                      <div className="w-3.5 h-3.5 rounded-full shadow-sm ring-2 ring-white group-hover:scale-110 transition-transform" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[90px]" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Network Performance by OEM - Full Width */}
        <DashboardCard title="1. Network Performance by OEM (Neg Stop%)" icon={BarChart3} borderColorClass="border-orange-600">
          <ScrollableBar data={oemNetData} fill="#F59E0B" labelType="percentWithCount" />
        </DashboardCard>

        {/* Network Performance by Station */}
        {stationData.length > 0 && (
          <DashboardCard title="2. Network Performance by Station (Neg Stop%)" icon={Layers} borderColorClass="border-red-600">
            <ScrollableBar data={stationData} fill="#EF4444" labelType="percentWithCount" />
          </DashboardCard>
        )}

        {/* Network Performance by CPID */}
        {cpidData.length > 0 && (
          <DashboardCard title="3. Network Performance by CPID (Neg Stop%)" icon={Layers} borderColorClass="border-purple-600">
            <ScrollableBar data={cpidData} fill="#A855F7" />
          </DashboardCard>
        )}

        {/* Precharging Failures by OEM */}
        {preOEMData.length > 0 && (
          <DashboardCard title="4. Precharging Failure by OEM" icon={Layers} borderColorClass="border-orange-500">
            <ScrollableBar data={preOEMData} fill="#F59E0B" labelType="count" />
          </DashboardCard>
        )}

        {/* Precharging Failures by Station */}
        {preStatData.length > 0 && (
          <DashboardCard title="5. Precharging Failure by Station" icon={Layers} borderColorClass="border-purple-500">
            <ScrollableBar data={preStatData} fill="#A855F7" labelType="count" />
          </DashboardCard>
        )}

        {/* Auth Methods & Session Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DashboardCard title="6. Session Trend (Power Quality)" icon={Activity} borderColorClass="border-green-500">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={trendData} margin={{ top: 10, right: 60, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 10 }} dy={10} minTickGap={30} />
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
                <div className="flex items-center justify-center h-64 text-gray-500">No trend data available</div>
              )}
            </DashboardCard>
          </div>

          {authData.length > 0 && (
            <DashboardCard title="Auth Methods" icon={Users} borderColorClass="border-emerald-400">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={authData} margin={{ top: 30, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      fill="#374151" 
                      fontSize={11} 
                      fontWeight="bold"
                      content={(props: any) => {
                        const { x, y, width, value, index } = props;
                        const percentage = authData[index]?.percentage || 0;
                        return (
                          <text 
                            x={x + width / 2} 
                            y={y - 5} 
                            fill="#374151" 
                            fontSize={11} 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {`${value} (${percentage}%)`}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </DashboardCard>
          )}
        </div>

        {/* Error Breakdown */}
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
                      stroke="#ffffff"
                    >
                      {errorData.map((_, i) => <Cell key={i} fill={ERROR_COLORS[i % ERROR_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-3 px-2">
                  {errorData.map((item, i) => (
                    <div key={i} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300">
                      <div className="w-3.5 h-3.5 rounded-full shadow-sm ring-2 ring-white group-hover:scale-110 transition-transform" style={{ backgroundColor: ERROR_COLORS[i % ERROR_COLORS.length] }} />
                      <span className="text-xs font-bold text-gray-700 truncate max-w-[100px]" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No errors found</p>
                </div>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Connector Modal */}
      {showConnectorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 animate-in zoom-in-95 duration-300">
            {/* Modern Modal Header */}
            <div className="bg-gray-50 px-8 py-5 flex items-center justify-between relative overflow-hidden border-b border-gray-200">
              
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-700 tracking-tight">Connector Details</h2>
              </div>
              <button
                onClick={() => setShowConnectorModal(false)}
                className="relative p-2.5 hover:bg-gray-200 rounded-lg transition-all duration-300 group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 group-hover:rotate-90 transition-all duration-300" />
              </button>
            </div>

            {/* Connector Selection */}
            <div className="px-8 py-5 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Select Connectors:</span>
                <div className="flex gap-4">
                  {[0, 1, 2, 3, 4, 5, 6].map(num => (
                    <label key={num} className="group flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedConnectors.includes(num)}
                        onChange={() => toggleConnector(num)}
                        className="w-5 h-5 text-emerald-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white transition-all"
                      />
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-emerald-600 transition-colors">Connector {num}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              {selectedConnectors.length > 0 ? (
                <div className={`grid gap-4 ${
                  selectedConnectors.length === 1 ? 'grid-cols-1' :
                  selectedConnectors.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {selectedConnectors.map(num => {
                    const key = `connector${num}` as keyof typeof metrics;
                    return (
                      <div key={num} className="group bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 p-4 relative overflow-hidden">
                        
                        <div className="relative">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-200" />
                            <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                              Connector {num}
                            </h4>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-200" />
                          </div>
                          <TreeSection data={metrics[key]} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="p-6 rounded-full bg-gray-100 mb-4">
                    <Settings className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-700">No connectors selected</p>
                  <p className="text-sm mt-2 text-gray-500">Select at least one connector to view details</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 bg-white border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowConnectorModal(false)}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg duration-300"
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
