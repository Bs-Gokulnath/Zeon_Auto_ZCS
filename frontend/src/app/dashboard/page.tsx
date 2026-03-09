'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import { dashboardFetch } from '@/src/lib/api';
import AnalyticsDashboard, { Analytics } from '@/src/components/AnalyticsDashboard';

interface User { id: string; email: string; }

// ─── Searchable Dropdown ──────────────────────────────────────────────────────

function SearchableDropdown({
  label, placeholder, hint, items, value, loading, disabled,
  onSelect, onClear,
}: {
  label: string; placeholder: string; hint: string;
  items: string[]; value: string; loading: boolean; disabled: boolean;
  onSelect: (v: string) => void; onClear: () => void;
}) {
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = items.filter(s =>
    input ? s.toLowerCase().includes(input.toLowerCase()) : true
  );

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); if (!e.target.value) onClear(); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading...' : placeholder}
          disabled={disabled || loading}
          className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 text-sm"
        />
        {input && !disabled && (
          <button onClick={() => { setInput(''); setOpen(false); onClear(); }}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && !loading && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              <div className="sticky top-0 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 border-b border-blue-200">
                {filtered.length} results
              </div>
              {filtered.slice(0, 100).map((item, i) => (
                <button key={i} onClick={() => { onSelect(item); setInput(item); setOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0 truncate">
                  {item}
                </button>
              ))}
              {filtered.length > 100 && (
                <div className="px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border-t border-amber-200">
                  Showing 100 of {filtered.length} — type to narrow down
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">No results</div>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">
        {value ? `✓ Selected: ${value}` : hint}
      </p>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function DateRangePicker({ startDate, endDate, onChange }: {
  startDate: Date | null; endDate: Date | null;
  onChange: (s: Date | null, e: Date | null) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);

  const formatDisplay = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSame = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.toDateString() === b.toDateString();

  const inRange = (d: Date) =>
    !!startDate && !!endDate && d >= startDate && d <= endDate;

  const renderMonth = (offset: number) => {
    const mo = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset);
    const first = new Date(mo.getFullYear(), mo.getMonth(), 1).getDay();
    const last  = new Date(mo.getFullYear(), mo.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} className="h-9 w-9" />);
    for (let d = 1; d <= last; d++) {
      const date = new Date(mo.getFullYear(), mo.getMonth(), d);
      const sel  = isSame(date, startDate) || isSame(date, endDate);
      const range = inRange(date) && !sel;
      cells.push(
        <div key={d}
          onMouseDown={() => { setIsDragging(true); setDragStart(date); onChange(date, null); }}
          onMouseEnter={() => {
            if (isDragging && dragStart) {
              const [s, e] = date >= dragStart ? [dragStart, date] : [date, dragStart];
              onChange(s, e);
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          className={`h-9 w-9 flex items-center justify-center text-sm cursor-pointer select-none rounded-lg
            ${sel   ? 'bg-blue-600 text-white font-semibold shadow-md'   : ''}
            ${range ? 'bg-blue-100 text-blue-900 font-medium' : ''}
            ${!sel && !range ? 'hover:bg-gray-100 text-gray-700' : ''}
          `}
        >{d}</div>
      );
    }
    const name = mo.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return (
      <div>
        <div className="text-center font-semibold text-gray-800 mb-3">{name}</div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d =>
            <div key={d} className="h-8 w-9 flex items-center justify-center text-xs text-gray-500 font-medium">{d}</div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1">{cells}</div>
      </div>
    );
  };

  return (
    <div onMouseUp={() => setIsDragging(false)}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 text-gray-700 font-medium">← Prev</button>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 text-gray-700 font-medium">Next →</button>
      </div>
      <div className="grid grid-cols-2 gap-8">
        {renderMonth(0)}
        {renderMonth(1)}
      </div>
      {(startDate || endDate) && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {startDate && <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium">{formatDisplay(startDate)}</span>}
          {endDate && endDate.toDateString() !== startDate?.toDateString() && (
            <><span className="text-gray-400">→</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-medium">{formatDisplay(endDate)}</span></>
          )}
          <button onClick={() => onChange(null, null)} className="ml-2 text-xs text-red-500 hover:text-red-700">Clear</button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter options from backend
  const [stations, setStations]   = useState<string[]>([]);
  const [oems, setOems]           = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Selected filters
  const [stationFilter, setStationFilter] = useState('');
  const [oemFilter, setOemFilter]         = useState('');
  const [cpidFilter, setCpidFilter]       = useState('');
  const [connectorType, setConnectorType] = useState('Combined');
  const [startDate, setStartDate]         = useState<Date | null>(null);
  const [endDate, setEndDate]             = useState<Date | null>(null);
  const [showCalendar, setShowCalendar]   = useState(false);

  // Results
  const [analytics, setAnalytics]         = useState<Analytics | null>(null);
  const [fetchingData, setFetchingData]   = useState(false);
  const [dataMessage, setDataMessage]     = useState('');
  const [sessionCount, setSessionCount]   = useState(0);
  const [showFilters, setShowFilters]     = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem('token');
    const userStr  = localStorage.getItem('user');
    const loginDate = localStorage.getItem('loginDate');
    if (!token || !userStr) { router.push('/login'); return; }
    const today = new Date().toDateString();
    if (loginDate && loginDate !== today) {
      ['token','user','loginDate'].forEach(k => localStorage.removeItem(k));
      router.push('/login'); return;
    }
    setUser(JSON.parse(userStr));
    setLoading(false);

    // Filter options will be loaded with first dashboard data fetch
    // No separate API call needed as Python backend returns filterOptions with dashboard data
  }, [router]);

  const handleLogout = () => {
    ['token','user','loginDate'].forEach(k => localStorage.removeItem(k));
    router.push('/login');
  };

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const formatDisplay = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const fetchData = async (typeOverride?: string) => {
    if (!startDate) return;
    setFetchingData(true);
    setDataMessage('');
    setAnalytics(null);

    const s = formatDate(startDate);
    const e = formatDate(endDate || startDate);
    const ct = typeOverride ?? connectorType;

    const params = new URLSearchParams({ start_date: s, end_date: e });
    if (ct !== 'Combined')  params.append('connector_type', ct);
    if (stationFilter)      params.append('s_n', stationFilter);
    if (oemFilter)          params.append('oem', oemFilter);
    if (cpidFilter.trim())  params.append('cp_id', cpidFilter.trim());

    try {
      // Call Python FastAPI backend
      const res = await dashboardFetch(`/dashboard?${params}`, { method: 'GET' });
      
      // Python backend returns data directly (no success wrapper)
      if (res && res.metrics) {
        // Update filter options from response
        if (res.filterOptions) {
          setStations(res.filterOptions.stations || []);
          setOems(res.filterOptions.oems || []);
          setLoadingFilters(false);
        }
        
        // Calculate session count from metrics
        const count = res.metrics?.combined?.totalSessions || 0;
        
        if (count > 0) {
          setAnalytics(res as Analytics);
          setSessionCount(count);
          setShowFilters(false);
        } else {
          setDataMessage(`No sessions found for the selected filters and date range.`);
        }
      } else {
        setDataMessage('No data available for the selected filters.');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setDataMessage('Error fetching data. Please try again.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleConnectorTypeChange = (type: string) => {
    setConnectorType(type);
    if (analytics) fetchData(type);
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <h1 className="text-xl font-bold text-gray-900">Zeon Analytics</h1>
            <div className="flex items-center gap-3">
              {analytics && (
                <button onClick={() => setShowFilters(v => !v)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                  {showFilters ? 'Hide Filters' : 'Change Filters'}
                </button>
              )}
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button onClick={handleLogout}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Filter Panel */}
      {showFilters && (
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {analytics ? 'Update Filters' : 'Select Filters & Date Range'}
            </h2>

            {/* Connector Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Connector Type</label>
              <div className="flex gap-2">
                {['AC', 'Combined', 'DC'].map(t => (
                  <button key={t} onClick={() => setConnectorType(t)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                      ${connectorType === t
                        ? 'bg-emerald-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Station */}
            <SearchableDropdown
              label="Filter by Station Name (Optional)"
              placeholder={`Click to see all stations or type to search… (${stations.length} available)`}
              hint={`Click to view all ${stations.length} stations or type to filter`}
              items={stations}
              value={stationFilter}
              loading={loadingFilters}
              disabled={!!oemFilter || !!cpidFilter}
              onSelect={v => { setStationFilter(v); setOemFilter(''); setCpidFilter(''); }}
              onClear={() => setStationFilter('')}
            />

            {/* OEM */}
            <SearchableDropdown
              label="OR Filter by OEM Manufacturer (Optional)"
              placeholder={`Click to see all OEMs or type to search… (${oems.length} available)`}
              hint={`Click to view all ${oems.length} OEM manufacturers${stationFilter ? ' (disabled when station is selected)' : ''}`}
              items={oems}
              value={oemFilter}
              loading={loadingFilters}
              disabled={!!stationFilter || !!cpidFilter}
              onSelect={v => { setOemFilter(v); setStationFilter(''); setCpidFilter(''); }}
              onClear={() => setOemFilter('')}
            />

            {/* CPID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OR Filter by Charge Point ID (Optional)
              </label>
              <input
                type="text"
                value={cpidFilter}
                onChange={e => { setCpidFilter(e.target.value); if (e.target.value) { setStationFilter(''); setOemFilter(''); } }}
                placeholder="e.g., 100028 or ocpp_100028"
                disabled={!!stationFilter || !!oemFilter}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a specific CPID (disabled when station or OEM is selected)
              </p>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date or Date Range (Custom)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    startDate && endDate && endDate.toDateString() !== startDate.toDateString()
                      ? `${formatDisplay(startDate)} – ${formatDisplay(endDate)}`
                      : startDate ? formatDisplay(startDate) : ''
                  }
                  placeholder="Click to select date"
                  onClick={() => setShowCalendar(v => !v)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg cursor-pointer focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />
                <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {showCalendar && (
                <div className="mt-2 border border-gray-200 rounded-xl p-4 bg-white shadow-lg">
                  <DateRangePicker
                    startDate={startDate} endDate={endDate}
                    onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                  />
                  <div className="flex justify-end mt-3">
                    <button onClick={() => setShowCalendar(false)}
                      className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error / no-data message */}
            {dataMessage && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                {dataMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => fetchData()}
                disabled={!startDate || fetchingData}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                {fetchingData ? 'Fetching…' : 'Fetch Data'}
              </button>
              <button
                onClick={() => {
                  setStationFilter(''); setOemFilter(''); setCpidFilter('');
                  setStartDate(null); setEndDate(null); setDataMessage('');
                  setConnectorType('Combined');
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                Clear All
              </button>
              {analytics && (
                <button onClick={() => setShowFilters(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 ml-auto">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {fetchingData && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            <p className="text-gray-600">Fetching analytics…</p>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {!fetchingData && analytics && (
        <>
          <AnalyticsDashboard
            analytics={analytics}
            connectorType={connectorType}
            onConnectorTypeChange={handleConnectorTypeChange}
          />
        </>
      )}
    </div>
  );
}
