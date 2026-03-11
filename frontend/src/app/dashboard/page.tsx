'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { dashboardFetch } from '@/src/lib/api';
import AnalyticsDashboard, { Analytics } from '@/src/components/AnalyticsDashboard';

interface User { id: string; email: string; role?: string; }

// ─── Multi-Select Dropdown ────────────────────────────────────────────────────

function MultiSelectDropdown({
  label, placeholder, hint, items, selectedValues, loading, disabled,
  onSelect, onRemove, onClear,
}: {
  label: string; placeholder: string; hint: string;
  items: string[]; selectedValues: string[]; loading: boolean; disabled: boolean;
  onSelect: (v: string) => void; onRemove: (v: string) => void; onClear: () => void;
}) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = items.filter(s =>
    !selectedValues.includes(s) && 
    (input ? s.toLowerCase().includes(input.toLowerCase()) : true)
  );

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">{label}</label>
      
      {/* Selected Items as Chips */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedValues.map((item, i) => (
            <div key={i} className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 hover:bg-emerald-200 transition-all">
              <span className="max-w-[150px] truncate">{item}</span>
              <button 
                onClick={() => onRemove(item)}
                className="hover:text-emerald-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {selectedValues.length > 1 && (
            <button 
              onClick={onClear}
              className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 hover:bg-red-100 transition-all"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Loading...' : selectedValues.length > 0 ? `${selectedValues.length} selected - Add more...` : placeholder}
          disabled={disabled || loading}
          className="w-full px-4 py-2.5 pr-9 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-400 text-sm shadow-sm hover:border-gray-400 transition-all"
        />
        {input && !disabled && (
          <button onClick={() => { setInput(''); }}
            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-emerald-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && !loading && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              <div className="sticky top-0 bg-gray-50 px-4 py-2 text-[10px] font-bold text-gray-600 border-b border-gray-200 uppercase tracking-wider">
                {filtered.length} available
              </div>
              {filtered.slice(0, 100).map((item, i) => (
                <button key={i} onClick={() => { onSelect(item); setInput(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 text-sm font-medium text-gray-700 hover:text-emerald-600 border-b border-gray-100 last:border-0 truncate transition-all">
                  {item}
                </button>
              ))}
              {filtered.length > 100 && (
                <div className="px-4 py-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border-t border-emerald-100">
                  Showing 100 of {filtered.length} — type to narrow down
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-3 text-xs text-gray-500 text-center font-medium">
              {selectedValues.length === items.length ? 'All items selected' : 'No results'}
            </div>
          )}
        </div>
      )}
      {hint && <p className="mt-1.5 text-[10px] text-gray-500">{hint}</p>}
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function DateRangePicker({ startDate, endDate, onChange }: {
  startDate: Date | null; endDate: Date | null;
  onChange: (s: Date | null, e: Date | null) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  const isDisabled = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= today;
  };

  const renderMonth = (offset: number) => {
    const mo = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset);
    const first = new Date(mo.getFullYear(), mo.getMonth(), 1).getDay();
    const last  = new Date(mo.getFullYear(), mo.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} className="h-8 w-8" />);
    for (let d = 1; d <= last; d++) {
      const date = new Date(mo.getFullYear(), mo.getMonth(), d);
      const disabled = isDisabled(date);
      const sel  = isSame(date, startDate) || isSame(date, endDate);
      const range = inRange(date) && !sel;
      cells.push(
        <div key={d}
          onMouseDown={disabled ? undefined : () => { setIsDragging(true); setDragStart(date); onChange(date, null); }}
          onMouseEnter={disabled ? undefined : () => {
            if (isDragging && dragStart) {
              const [s, e] = date >= dragStart ? [dragStart, date] : [date, dragStart];
              onChange(s, e);
            }
          }}
          onMouseUp={disabled ? undefined : () => setIsDragging(false)}
          className={`h-8 w-8 flex items-center justify-center text-xs select-none rounded-md transition-all duration-200
            ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
            ${!disabled && sel   ? 'bg-emerald-600 text-white font-bold shadow-md scale-105'   : ''}
            ${!disabled && range ? 'bg-emerald-100 text-emerald-900 font-semibold' : ''}
            ${!disabled && !sel && !range ? 'hover:bg-gray-100 text-gray-700 hover:scale-105 font-medium' : ''}
          `}
        >{d}</div>
      );
    }
    const name = mo.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return (
      <div>
        <div className="text-center font-bold text-emerald-600 mb-3 text-base">{name}</div>
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d =>
            <div key={d} className="h-6 w-8 flex items-center justify-center text-[10px] text-gray-600 font-bold uppercase">{d}</div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">{cells}</div>
      </div>
    );
  };

  return (
    <div onMouseUp={() => setIsDragging(false)}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="px-3 py-1.5 text-xs rounded-md bg-white hover:bg-gray-50 text-gray-700 font-semibold border border-gray-200 transition-all shadow-sm hover:shadow-md">← Prev</button>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="px-3 py-1.5 text-xs rounded-md bg-white hover:bg-gray-50 text-gray-700 font-semibold border border-gray-200 transition-all shadow-sm hover:shadow-md">Next →</button>
      </div>
      <div>
        {renderMonth(0)}
      </div>
      {(startDate || endDate) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {startDate && <span className="px-2 py-1 bg-emerald-600 text-white rounded-md font-semibold shadow-sm">{formatDisplay(startDate)}</span>}
          {endDate && endDate.toDateString() !== startDate?.toDateString() && (
            <><span className="text-gray-400 font-bold">→</span>
            <span className="px-2 py-1 bg-emerald-600 text-white rounded-md font-semibold shadow-sm">{formatDisplay(endDate)}</span></>
          )}
          <button onClick={() => onChange(null, null)} className="ml-2 px-2 py-0.5 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md font-semibold transition-colors">Clear</button>
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
  const [cpids, setCpids]         = useState<Array<{cpid: string, oem: string, capacity: string}>>([]);
  const [cpidDisplayStrings, setCpidDisplayStrings] = useState<string[]>([]); // For dropdown display
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Selected filters (now arrays for multi-select)
  const [stationFilter, setStationFilter] = useState<string[]>([]);
  const [oemFilter, setOemFilter]         = useState<string[]>([]);
  const [cpidFilter, setCpidFilter]       = useState<string[]>([]);
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
  const [sidebarOpen, setSidebarOpen]     = useState(true);

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

  // Clear filter selections when date changes
  useEffect(() => {
    if (startDate) {
      // Clear all filter selections when date changes
      setOemFilter([]);
      setCpidFilter([]);
      setStationFilter([]);
      setAnalytics(null); // Clear previous data
      setDataMessage('');
      setSessionCount(0);
    }
  }, [startDate, endDate]);

  const fetchFilterOptions = async () => {
    setLoadingFilters(true);
    try {
      const res = await dashboardFetch('/filter-options', { method: 'GET' });
      console.log('[DEBUG] Raw filter options response:', res);
      console.log('[DEBUG] CPIDs array:', res?.cpids);
      console.log('[DEBUG] First CPID item:', res?.cpids?.[0]);
      if (res) {
        setStations(res.stations || []);
        setOems(res.oems || []);
        setCpids(res.cpids || []);
        // Format display strings: "CPID - OEM - Capacity"
        const displayStrings = (res.cpids || []).map((item: any) => {
          // Handle both old format (string) and new format (object)
          if (typeof item === 'string') {
            console.log('[DEBUG] String format CPID:', item);
            return item; // Old format - just return the string
          }
          // New format - build display string
          console.log('[DEBUG] Object format CPID:', item);
          const parts = [item.cpid];
          if (item.oem && item.oem !== 'Unknown') parts.push(item.oem);
          if (item.capacity) parts.push(item.capacity);
          const displayStr = parts.join(' - ');
          console.log('[DEBUG] Built display string:', displayStr);
          return displayStr;
        });
        console.log('[DEBUG] CPID display strings (first 5):', displayStrings.slice(0, 5));
        setCpidDisplayStrings(displayStrings);
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
    
    // Handle multiple stations
    if (stationFilter.length > 0) {
      stationFilter.forEach(station => params.append('s_n', station));
    }
    
    // Handle multiple OEMs
    if (oemFilter.length > 0) {
      oemFilter.forEach(oem => params.append('oem', oem));
    }
    
    // Handle multiple CPIDs - extract just the CPID from display strings
    if (cpidFilter.length > 0) {
      cpidFilter.forEach(displayString => {
        const actualCpid = displayString.split(' - ')[0].trim();
        params.append('cp_id', actualCpid);
      });
    }

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
          // Format display strings: "CPID - OEM - Capacity"
          const displayStrings = (res.filterOptions.cpids || []).map((item: any) => {
            // Handle both old format (string) and new format (object)
            if (typeof item === 'string') {
              return item; // Old format - just return the string
            }
            // New format - build display string
            const parts = [item.cpid];
            if (item.oem && item.oem !== 'Unknown') parts.push(item.oem);
            if (item.capacity) parts.push(item.capacity);
            return parts.join(' - ');
          });
          setCpidDisplayStrings(displayStrings);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <div className="text-gray-700 font-semibold">Loading...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar - Filters */}
      <aside className={`w-80 bg-white border-r border-gray-200 shadow-lg fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-80'
      }`}>
        {/* Sidebar Header */}
        <div className="bg-white px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="/logo_red.jpeg" 
              alt="Zeon Logo" 
              width={40}
              height={40}
              className="object-contain rounded-lg shadow-sm"
              priority
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Zeon Analytics</h1>
              <p className="text-xs text-gray-500">Filter & Analyze</p>
            </div>
          </div>
        </div>

        {/* Filters Container */}
        <div className="px-5 py-4 space-y-4">
          
          {/* Date Range Picker */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Date Range
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
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-400 shadow-sm hover:border-emerald-400 transition-all"
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {showCalendar && (
              <div className="absolute top-full mt-2 left-0 z-50 border border-gray-200 rounded-lg p-5 bg-white shadow-xl">
                <DateRangePicker
                  startDate={startDate} endDate={endDate}
                  onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                />
                <div className="flex justify-end mt-4">
                  <button onClick={() => setShowCalendar(false)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg font-semibold shadow-md hover:shadow-lg transition-all">
                    Done
                  </button>
                </div>
              </div>
            )}
            <p className="mt-1.5 text-xs text-gray-500">Select date or date range</p>
          </div>

          {/* OEM Filter */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Filter by OEM</label>
            <MultiSelectDropdown
              label=""
              placeholder={!startDate ? "Select date first" : !analytics ? "Fetch data first" : `${oems.length} available`}
              hint={!startDate ? "Select a date range first" : !analytics ? "Click FETCH DATA first" : `Select multiple OEM manufacturers`}
              items={oems}
              selectedValues={oemFilter}
              loading={loadingFilters}
              disabled={!startDate || !analytics || stationFilter.length > 0 || cpidFilter.length > 0}
              onSelect={(v) => { setOemFilter([...oemFilter, v]); }}
              onRemove={(v) => { setOemFilter(oemFilter.filter(item => item !== v)); }}
              onClear={() => setOemFilter([])}
            />
            {!startDate ? (
              <p className="mt-1.5 text-xs text-orange-600 font-medium">⚠ Select date first</p>
            ) : !analytics ? (
              <p className="mt-1.5 text-xs text-blue-600 font-medium">ℹ️ Fetch data first</p>
            ) : null}
          </div>

          {/* CPID Filter */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Filter by CPID</label>
            <MultiSelectDropdown
              label=""
              placeholder={!startDate ? "Select date first" : !analytics ? "Fetch data first" : cpidDisplayStrings.length > 0 ? `${cpidDisplayStrings.length} available` : "Type a CPID"}
              hint={!startDate ? "Select a date range first" : !analytics ? "Click FETCH DATA first" : cpidDisplayStrings.length > 0 ? `Select multiple CPIDs` : "Enter a specific CPID"}
              items={cpidDisplayStrings}
              selectedValues={cpidFilter}
              loading={loadingFilters}
              disabled={!startDate || !analytics || stationFilter.length > 0 || oemFilter.length > 0}
              onSelect={(displayValue) => { 
                setCpidFilter([...cpidFilter, displayValue]); 
              }}
              onRemove={(displayValue) => { 
                setCpidFilter(cpidFilter.filter(item => item !== displayValue)); 
              }}
              onClear={() => setCpidFilter([])}
            />
            {!startDate ? (
              <p className="mt-1.5 text-xs text-orange-600 font-medium">⚠ Select date first</p>
            ) : !analytics ? (
              <p className="mt-1.5 text-xs text-blue-600 font-medium">ℹ️ Fetch data first</p>
            ) : null}
          </div>

          {/* Station Filter */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Filter by Station</label>
            <MultiSelectDropdown
              label=""
              placeholder={!startDate ? "Select date first" : !analytics ? "Fetch data first" : `${stations.length} available`}
              hint={!startDate ? "Select a date range first" : !analytics ? "Click FETCH DATA first" : `Select multiple stations or type to filter`}
              items={stations}
              selectedValues={stationFilter}
              loading={loadingFilters}
              disabled={!startDate || !analytics || oemFilter.length > 0 || cpidFilter.length > 0}
              onSelect={(v) => { setStationFilter([...stationFilter, v]); }}
              onRemove={(v) => { setStationFilter(stationFilter.filter(item => item !== v)); }}
              onClear={() => setStationFilter([])}
            />
            {!startDate ? (
              <p className="mt-1.5 text-xs text-orange-600 font-medium">⚠ Select date first</p>
            ) : !analytics ? (
              <p className="mt-1.5 text-xs text-blue-600 font-medium">ℹ️ Fetch data first</p>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => fetchData()}
              disabled={!startDate || fetchingData}
              className="w-full px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold uppercase tracking-wide transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none duration-300"
            >
              {fetchingData ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Fetching...
                </span>
              ) : (
                'FETCH DATA'
              )}
            </button>
            
            {analytics && (
              <button
                onClick={() => {
                  setStationFilter([]); setOemFilter([]); setCpidFilter([]);
                  setStartDate(null); setEndDate(null); setDataMessage('');
                  setConnectorType('Combined'); setAnalytics(null);
                }}
                className="w-full px-5 py-3 text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-200 rounded-lg transition-all shadow-sm hover:shadow-md duration-300"
              >
                <span className="inline-block transition-transform duration-300">✕</span> Clear All Filters
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-20 z-50 bg-white hover:bg-gray-100 border border-gray-300 rounded-r-lg p-2 shadow-lg transition-all duration-300 ${
          sidebarOpen ? 'left-80' : 'left-0'
        }`}
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 overflow-x-hidden ${
        sidebarOpen ? 'ml-80' : 'ml-0'
      }`}>
        {/* Top Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Dashboard Analytics</h2>
                <p className="text-xs text-gray-500">Real-time analytics and insights</p>
              </div>
              
              {/* Connector Type Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-300">
                <button
                  onClick={() => handleConnectorTypeChange('AC')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 ${
                    connectorType === 'AC'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-emerald-600'
                  }`}
                >
                  AC
                </button>
                <button
                  onClick={() => handleConnectorTypeChange('Combined')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 ${
                    connectorType === 'Combined'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-emerald-600'
                  }`}
                >
                  Combined
                </button>
                <button
                  onClick={() => handleConnectorTypeChange('DC')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 ${
                    connectorType === 'DC'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-emerald-600'
                  }`}
                >
                  DC
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">{user?.email}</span>
              
              {/* Admin Panel Button - Only for Admin Users */}
              {user?.role === 'admin' && (
                <button 
                  onClick={() => router.push('/admin-panel')}
                  className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </button>
              )}
              
              <button onClick={handleLogout}
                className="px-5 py-2.5 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-lg transition-all shadow-sm hover:shadow-md duration-300">
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Content Container */}
        <div className="p-6">
          {/* Data Message */}
          {dataMessage && (
            <div className="mb-6">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
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
            <AnalyticsDashboard
              analytics={analytics}
              connectorType={connectorType}
              onConnectorTypeChange={handleConnectorTypeChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
