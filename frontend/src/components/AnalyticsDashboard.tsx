import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { Zap, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';

interface ChargerStats {
  preparing: number;
  preparingPerc: number;
  charging: number;
  chargingPerc: number;
  preCharging: number;
  preChargingPerc: number;
  negativeStops: number;
  negativeStopsPerc: number;
  positiveStops: number;
  positiveStopsPerc: number;
  successRate: number;
  successRateText: string;
}

interface Analytics {
  chargerUsage: {
    combined: ChargerStats;
    connector1: ChargerStats;
    connector2: ChargerStats;
  };
  chargingShares: {
    negativeStops: number;
    positiveStops: number;
    preChargingFailure: number;
  };
  oemAnalytics: Array<{ oem: string; negativeStopPercentage: number }>;
  errorSummary: Array<{ error: string; count: number; percentage: number }>;
}

interface AnalyticsDashboardProps {
  analytics: Analytics;
}

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">
          Value: <span className="font-bold text-blue-600">{payload[0].value}</span>
          {payload[0].payload.percentage && (
            <span className="ml-1">({payload[0].payload.percentage}%)</span>
          )}
        </p>
      </div>
    );
  }
  return null;
};

// Tree Section Component (Flow Chart)
const TreeSection: React.FC<{ preparing: number; charging: number; negative: number; successful: number }> = ({ 
  preparing, 
  charging, 
  negative, 
  successful 
}) => {
  const totalForRate = charging;
  const rate = totalForRate > 0 ? Math.round((successful / totalForRate) * 100) : 0;
  const isGood = rate >= 70;
  
  const preCharging = preparing - charging;
  
  const preparingPercent = 100;
  const chargingPercent = preparing > 0 ? Math.round((charging / preparing) * 100) : 0;
  const preChargingPercent = preparing > 0 ? Math.round((Math.max(preCharging, 0) / preparing) * 100) : 0;
  const negativePercent = charging > 0 ? Math.round((negative / charging) * 100) : 0;
  const positivePercent = charging > 0 ? Math.round((successful / charging) * 100) : 0;

  return (
    <div className="flex flex-col h-full justify-evenly py-1">
      {/* Level 1: Preparing */}
      <div className="flex justify-center mb-1">
        <div className="bg-blue-500 text-white rounded-xl px-4 py-1.5 text-center shadow-md min-w-[100px]">
          <div className="text-[10px] font-semibold">Preparing</div>
          <div className="text-base font-bold">{preparing}</div>
          <div className="text-xs font-medium">({preparingPercent}%)</div>
        </div>
      </div>

      {/* Lines connecting */}
      <div className="flex justify-center mb-0.5">
        <svg width="140" height="18" className="overflow-visible">
          <line x1="70" y1="0" x2="35" y2="18" stroke="#9CA3AF" strokeWidth="1.5"/>
          <line x1="70" y1="0" x2="105" y2="18" stroke="#9CA3AF" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Level 2: Charging & Pre-Charging */}
      <div className="flex justify-center gap-4 mb-1">
        <div className="bg-green-500 text-white rounded-lg px-3 py-1 text-center shadow-sm min-w-[85px]">
          <div className="text-[9px] font-semibold">Charging</div>
          <div className="text-sm font-bold">{charging}</div>
          <div className="text-[10px] font-medium">({chargingPercent}%)</div>
        </div>
        <div className="bg-purple-500 text-white rounded-lg px-3 py-1 text-center shadow-sm min-w-[85px]">
          <div className="text-[9px] font-semibold">Pre Charging</div>
          <div className="text-sm font-bold">{preCharging >= 0 ? preCharging : 0}</div>
          <div className="text-[10px] font-medium">({preChargingPercent}%)</div>
        </div>
      </div>

      {/* Lines connecting from Charging */}
      <div className="flex justify-start ml-[20%] mb-0.5">
        <svg width="80" height="15" className="overflow-visible">
          <line x1="40" y1="0" x2="15" y2="15" stroke="#9CA3AF" strokeWidth="1.5"/>
          <line x1="40" y1="0" x2="65" y2="15" stroke="#9CA3AF" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Level 3: Negative Stops & Positives */}
      <div className="flex justify-start ml-[8%] gap-3 mb-1">
        <div className="bg-red-500 text-white rounded-md px-3 py-1 text-center shadow-sm min-w-[75px]">
          <div className="text-[8px] font-semibold">NegativeStops</div>
          <div className="text-xs font-bold">{negative}</div>
          <div className="text-[9px] font-medium">({negativePercent}%)</div>
        </div>
        <div className="bg-teal-500 text-white rounded-md px-3 py-1 text-center shadow-sm min-w-[75px]">
          <div className="text-[8px] font-semibold">Positives</div>
          <div className="text-xs font-bold">{successful}</div>
          <div className="text-[9px] font-medium">({positivePercent}%)</div>
        </div>
      </div>

      {/* Success Rate */}
      <div className={`text-[10px] font-bold text-center mt-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        Success Rate: {rate}% ({successful} / {totalForRate})
      </div>
    </div>
  );
};

// Dashboard Card Component
const DashboardCard: React.FC<{ 
  title: string; 
  icon?: any; 
  borderColorClass?: string; 
  children: React.ReactNode 
}> = ({ title, icon: Icon, borderColorClass = "border-blue-500", children }) => (
  <div className={`bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border-t-4 ${borderColorClass} hover:shadow-xl transition-all duration-300 h-full`}>
    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white flex-none">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
        <h3 className="text-sm font-bold text-gray-800 truncate">{title}</h3>
      </div>
    </div>
    <div className="p-2 flex-1 min-h-0 relative">
      {children}
    </div>
  </div>
);

export default function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  // Prepare data for charts
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];
  const ERROR_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];

  // Charging Shares Pie Data
  const chargingSharesData = [
    { name: 'Negative Stops', value: analytics.chargingShares.negativeStops, percentage: 0 },
    { name: 'Positive Stops', value: analytics.chargingShares.positiveStops, percentage: 0 },
    { name: 'Pre-Charging Failure', value: analytics.chargingShares.preChargingFailure, percentage: 0 }
  ];
  const chargingTotal = chargingSharesData.reduce((acc, curr) => acc + curr.value, 0);
  chargingSharesData.forEach(d => {
    d.percentage = chargingTotal > 0 ? Math.round((d.value / chargingTotal) * 100) : 0;
  });

  // Error Summary Pie Data
  const errorSummaryData = analytics.errorSummary.map((err, idx) => ({
    name: err.error,
    value: err.count,
    percentage: err.percentage
  }));

  // OEM Bar Chart Data
  const oemBarData = analytics.oemAnalytics.map(oem => ({
    name: oem.oem,
    value: oem.negativeStopPercentage
  }));

  // Custom label for percentage display on bars
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 5} 
        fill="#1F2937" 
        textAnchor="middle" 
        fontSize="12" 
        fontWeight="bold"
      >
        {value}%
      </text>
    );
  };

  // Custom label for pie chart percentage
  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 ml-8">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              AC
            </button>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Combined
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
              DC
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white">
            <option>All Files</option>
          </select>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6 bg-gray-50">
        {/* Top Row: Charger Usage & Charging Shares */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charger Usage & Readiness - Takes 2 columns */}
          <div className="lg:col-span-2">
            <DashboardCard title="Charger Usage & Readiness" icon={Zap} borderColorClass="border-blue-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                {/* Combined Charger */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 text-center tracking-wide">Combined Charger</h4>
                  <TreeSection
                    preparing={analytics.chargerUsage.combined.preparing}
                    charging={analytics.chargerUsage.combined.charging}
                    negative={analytics.chargerUsage.combined.negativeStops}
                    successful={analytics.chargerUsage.combined.positiveStops}
                  />
                </div>
                {/* Connector 1 */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 text-center tracking-wide">Connector 1</h4>
                  <TreeSection
                    preparing={analytics.chargerUsage.connector1.preparing}
                    charging={analytics.chargerUsage.connector1.charging}
                    negative={analytics.chargerUsage.connector1.negativeStops}
                    successful={analytics.chargerUsage.connector1.positiveStops}
                  />
                </div>
                {/* Connector 2 */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 text-center tracking-wide">Connector 2</h4>
                  <TreeSection
                    preparing={analytics.chargerUsage.connector2.preparing}
                    charging={analytics.chargerUsage.connector2.charging}
                    negative={analytics.chargerUsage.connector2.negativeStops}
                    successful={analytics.chargerUsage.connector2.positiveStops}
                  />
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Charging Shares - Takes 1 column */}
          <div>
            <DashboardCard title="Charging Shares" icon={TrendingDown} borderColorClass="border-red-500">
              <div className="h-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chargingSharesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={renderPieLabel}
                    >
                      {chargingSharesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {chargingSharesData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                      <span className="text-xs font-medium text-gray-700">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Bottom Row: Negative Stops by OEM & Error Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Negative Stops by OEM - Takes 2 columns */}
          <div className="lg:col-span-2">
            <DashboardCard title="Negative Stops by OEM (Neg Stop%)" icon={BarChart3} borderColorClass="border-orange-600">
              <div className="h-full">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={oemBarData}
                    margin={{ top: 30, right: 20, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      interval={0}
                      style={{ fontSize: '10px' }}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#C2410C">
                      <LabelList content={renderCustomLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>

          {/* Error Summary - Takes 1 column */}
          <div>
            <DashboardCard title="Error Summary" icon={AlertTriangle} borderColorClass="border-orange-500">
              {errorSummaryData.length > 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={errorSummaryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={renderPieLabel}
                      >
                        {errorSummaryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ERROR_COLORS[index % ERROR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-2 mt-2 px-2">
                    {errorSummaryData.map((item, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: ERROR_COLORS[index % ERROR_COLORS.length] }}></div>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-center text-gray-400 text-lg">
                  No errors found
                </div>
              )}
            </DashboardCard>
          </div>
        </div>
      </div>
    </div>
  );
}
