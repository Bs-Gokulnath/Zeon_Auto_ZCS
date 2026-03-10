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
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); if (!e.target.value) onClear(); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading...' : placeholder}
          disabled={disabled || loading}
          className="w-full px-3 py-1.5 pr-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 text-xs"
        />
        {input && !disabled && (
          <button onClick={() => { setInput(''); setOpen(false); onClear(); }}
            className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && !loading && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              <div className="sticky top-0 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-800 border-b border-blue-200">
                {filtered.length} results
              </div>
              {filtered.slice(0, 100).map((item, i) => (
                <button key={i} onClick={() => { onSelect(item); setInput(item); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs border-b border-gray-100 last:border-0 truncate">
                  {item}
                </button>
              ))}
              {filtered.length > 100 && (
                <div className="px-3 py-1.5 text-[10px] text-amber-700 bg-amber-50 border-t border-amber-200">
                  Showing 100 of {filtered.length} — type to narrow down
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">No results</div>
          )}
        </div>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-gray-500">{hint}</p>}
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
      <div>
        {renderMonth(0)}
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
  const [cpids, setCpids]         = useState<string[]>([]);
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

    // Load filter options on mount
    fetchFilterOptions();
  }, [router]);

  const fetchFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const res = await dashboardFetch('/filter-options', { method: 'GET' });
      if (res) {
        setStations(res.stations || []);
        setOems(res.oems || []);
        setCpids(res.cpids || []);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

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
          setCpids(res.filterOptions.cpids || []);
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
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Top Row - Title and User Info */}
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold text-gray-900">Zeon Analytics</h1>
            <div className="flex items-center gap-3">
              {analytics && (
                <button
                  onClick={() => {
                    setStationFilter(''); setOemFilter(''); setCpidFilter('');
                    setStartDate(null); setEndDate(null); setDataMessage('');
                    setConnectorType('Combined');
                  }}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Clear All Filters
                </button>
              )}
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button onClick={handleLogout}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Logout
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-7 gap-3 items-start">
            {/* Date Range Picker - First */}
            <div className="relative col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Select Date or Date Range</label>
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
                  className="w-full px-3 py-1.5 pr-8 text-xs border border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <Calendar className="absolute right-2 top-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
              {showCalendar && (
                <div className="absolute top-full mt-1 left-0 z-50 border border-gray-200 rounded-xl p-4 bg-white shadow-2xl">
                  <DateRangePicker
                    startDate={startDate} endDate={endDate}
                    onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                  />
                  <div className="flex justify-end mt-3">
                    <button onClick={() => setShowCalendar(false)}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 font-medium">
                      Done
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-0.5 text-[10px] text-gray-500">Select date range</p>
            </div>

            {/* OEM Filter - Second */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">OR Filter by OEM (Optional)</label>
              <SearchableDropdown
                label=""
                placeholder={`${oems.length} available`}
                hint={`Click to view all ${oems.length} OEM manufacturers`}
                items={oems}
                value={oemFilter}
                loading={loadingFilters}
                disabled={!!stationFilter || !!cpidFilter}
                onSelect={(v) => { setOemFilter(v); setStationFilter(''); setCpidFilter(''); }}
                onClear={() => setOemFilter('')}
              />
            </div>

            {/* CPID Filter - Third */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">OR Filter by CPID (Optional)</label>
              <SearchableDropdown
                label=""
                placeholder={cpids.length > 0 ? `${cpids.length} available` : "Type a CPID"}
                hint={cpids.length > 0 ? `Select from ${cpids.length} CPIDs` : "Enter a specific CPID"}
                items={cpids}
                value={cpidFilter}
                loading={loadingFilters}
                disabled={!!stationFilter || !!oemFilter}
                onSelect={(v) => { setCpidFilter(v); setStationFilter(''); setOemFilter(''); }}
                onClear={() => setCpidFilter('')}
              />
            </div>

            {/* Station Filter - Fourth */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Station (Optional)</label>
              <SearchableDropdown
                label=""
                placeholder={`${stations.length} available`}
                hint={`Click to view all ${stations.length} stations or type to filter`}
                items={stations}
                value={stationFilter}
                loading={loadingFilters}
                disabled={!!oemFilter || !!cpidFilter}
                onSelect={(v) => { setStationFilter(v); setOemFilter(''); setCpidFilter(''); }}
                onClear={() => setStationFilter('')}
              />
            </div>

            {/* Connector Type - Combined on top, AC/DC below */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Connector</label>
              <div className="flex flex-col gap-1">
                {/* Combined button - full width */}
                <button onClick={() => setConnectorType('Combined')}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors
                    ${connectorType === 'Combined'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Combined
                </button>
                {/* AC and DC buttons - side by side */}
                <div className="flex gap-1">
                  {['AC', 'DC'].map(t => (
                    <button key={t} onClick={() => setConnectorType(t)}
                      className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors
                        ${connectorType === t
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fetch Data Button */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">&nbsp;</label>
              <button
                onClick={() => fetchData()}
                disabled={!startDate || fetchingData}
                className="w-full px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {fetchingData ? 'Fetching…' : 'Fetch Data'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Data Message */}
      {dataMessage && (
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            {dataMessage}
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
