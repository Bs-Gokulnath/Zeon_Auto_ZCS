import React from 'react';

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

const ChargerCard: React.FC<{ title: string; stats: ChargerStats }> = ({ title, stats }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col items-center">
    <h3 className="text-sm font-bold text-gray-500 uppercase mb-6 tracking-wide">{title}</h3>
    
    {/* Preparing Box */}
    <div className="bg-blue-500 rounded-2xl px-8 py-4 text-center text-white shadow-lg mb-4">
      <div className="text-xs font-semibold mb-1">Preparing</div>
      <div className="text-3xl font-bold">{stats.preparing}</div>
      <div className="text-xs">({stats.preparingPerc}%)</div>
    </div>

    {/* Arrow Down */}
    <div className="flex flex-col items-center mb-3">
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>

    {/* Charging and Pre-Charging Row */}
    <div className="flex gap-4 mb-3">
      <div className="bg-green-500 rounded-2xl px-6 py-3 text-center text-white shadow-lg">
        <div className="text-xs font-semibold mb-1">Charging</div>
        <div className="text-2xl font-bold">{stats.charging}</div>
        <div className="text-xs">({stats.chargingPerc}%)</div>
      </div>
      <div className="bg-purple-500 rounded-2xl px-6 py-3 text-center text-white shadow-lg">
        <div className="text-xs font-semibold mb-1">Pre Charging</div>
        <div className="text-2xl font-bold">{stats.preCharging}</div>
        <div className="text-xs">({stats.preChargingPerc}%)</div>
      </div>
    </div>

    {/* Arrows Down (split) */}
    <div className="flex gap-20 mb-3">
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>

    {/* Negative and Positive Stops Row */}
    <div className="flex gap-4 mb-4">
      <div className="bg-red-500 rounded-2xl px-6 py-3 text-center text-white shadow-lg">
        <div className="text-xs font-semibold mb-1">NegativeStops</div>
        <div className="text-2xl font-bold">{stats.negativeStops}</div>
        <div className="text-xs">({stats.negativeStopsPerc}%)</div>
      </div>
      <div className="bg-teal-500 rounded-2xl px-6 py-3 text-center text-white shadow-lg">
        <div className="text-xs font-semibold mb-1">Positives</div>
        <div className="text-2xl font-bold">{stats.positiveStops}</div>
        <div className="text-xs">({stats.positiveStopsPerc}%)</div>
      </div>
    </div>

    {/* Success Rate */}
    <div className="text-center mt-2">
      <div className="text-sm font-bold text-red-600">
        Success Rate: {stats.successRateText}
      </div>
    </div>
  </div>
);

const DonutChart: React.FC<{ 
  data: Array<{ label: string; value: number; color: string }>;
  showPercentages?: boolean;
}> = ({ data, showPercentages = true }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate angles for each segment
  let currentAngle = -90; // Start from top
  const segments = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const segment = {
      ...item,
      percentage: Math.round(percentage),
      startAngle: currentAngle,
      endAngle: currentAngle + angle
    };
    currentAngle += angle;
    return segment;
  });

  // Create SVG path for donut segment
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(100, 100, 80, endAngle);
    const end = polarToCartesian(100, 100, 80, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    const innerStart = polarToCartesian(100, 100, 50, endAngle);
    const innerEnd = polarToCartesian(100, 100, 50, startAngle);
    
    return [
      'M', start.x, start.y,
      'A', 80, 80, 0, largeArcFlag, 0, end.x, end.y,
      'L', innerEnd.x, innerEnd.y,
      'A', 50, 50, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: '200px', height: '200px' }}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {segments.map((segment, index) => (
            <g key={index}>
              <path
                d={createArc(segment.startAngle, segment.endAngle)}
                fill={segment.color}
                stroke="white"
                strokeWidth="2"
              />
              {showPercentages && (
                <text
                  x={polarToCartesian(100, 100, 65, (segment.startAngle + segment.endAngle) / 2).x}
                  y={polarToCartesian(100, 100, 65, (segment.startAngle + segment.endAngle) / 2).y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm font-bold fill-white"
                >
                  {segment.percentage}%
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Top Row: Charger Usage & Charging Shares */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charger Usage & Readiness - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border-2 border-blue-300">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900">Charger Usage & Readiness</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChargerCard title="COMBINED CHARGER" stats={analytics.chargerUsage.combined} />
            <ChargerCard title="CONNECTOR 1" stats={analytics.chargerUsage.connector1} />
            <ChargerCard title="CONNECTOR 2" stats={analytics.chargerUsage.connector2} />
          </div>
        </div>

        {/* Charging Shares - Takes 1 column */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-300">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Charging Shares</h2>
          </div>
          <div className="flex justify-center items-center h-full">
            <DonutChart
              data={[
                { label: 'Negative Stops', value: analytics.chargingShares.negativeStops, color: '#f59e0b' },
                { label: 'Positive Stops', value: analytics.chargingShares.positiveStops, color: '#10b981' },
                { label: 'Pre-Charging Failure', value: analytics.chargingShares.preChargingFailure, color: '#ef4444' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Negative Stops by OEM & Error Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Negative Stops by OEM - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">1. Negative Stops by OEM (Neg Stop%)</h2>
          </div>
          <div className="space-y-6">
            {analytics.oemAnalytics.map((oem, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-bold text-gray-900">{oem.oem}</span>
                  <span className="text-base font-bold text-gray-900">{oem.negativeStopPercentage}%</span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-lg h-16 shadow-inner">
                  <div
                    className="absolute top-0 left-0 h-full rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md transition-all duration-500"
                    style={{ 
                      width: `${oem.negativeStopPercentage}%`,
                      background: 'linear-gradient(90deg, #c2410c 0%, #ea580c 100%)'
                    }}
                  >
                    {oem.negativeStopPercentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Summary - Takes 1 column */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-300">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900">Error Summary</h2>
          </div>
          {analytics.errorSummary.length > 0 ? (
            <div className="flex justify-center items-center h-full">
              <DonutChart
                data={analytics.errorSummary.slice(0, 5).map((err, idx) => ({
                  label: err.error,
                  value: err.percentage,
                  color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][idx % 5]
                }))}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-center text-gray-400 text-lg">
              No errors found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
