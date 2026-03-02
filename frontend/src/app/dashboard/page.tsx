'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/src/lib/api';
import AnalyticsDashboard from '@/src/components/AnalyticsDashboard';

interface User {
  id: string;
  email: string;
}

interface SessionData {
  _id: string;
  date: string;
  [key: string]: any;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1)); // Feb 2026
  
  // Analytics states
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [dataMessage, setDataMessage] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userStr));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (date < startDate) {
      setEndDate(startDate);
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const handleMouseDown = (date: Date) => {
    setIsDragging(true);
    setStartDate(date);
    setEndDate(null);
  };

  const handleMouseEnter = (date: Date) => {
    setHoverDate(date);
    if (isDragging) {
      if (date < startDate!) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isDateInRange = (date: Date) => {
    if (!startDate) return false;
    if (!endDate && !hoverDate) return date.getTime() === startDate.getTime();
    
    const end = endDate || (isDragging ? hoverDate : null);
    if (!end) return date.getTime() === startDate.getTime();
    
    return date >= startDate && date <= end;
  };

  const isDateSelected = (date: Date) => {
    if (!startDate) return false;
    if (startDate && !endDate) return date.getTime() === startDate.getTime();
    if (startDate && endDate) {
      return date.getTime() === startDate.getTime() || date.getTime() === endDate.getTime();
    }
    return false;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const renderCalendar = (monthOffset: number) => {
    const displayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset);
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(displayDate);
    const monthName = displayDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Previous month's days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isInRange = isDateInRange(date);
      const isSelected = isDateSelected(date);
      const isToday = date.toDateString() === new Date(2026, 2, 2).toDateString();

      days.push(
        <div
          key={day}
          onMouseDown={() => handleMouseDown(date)}
          onMouseEnter={() => handleMouseEnter(date)}
          onMouseUp={handleMouseUp}
          className={`h-8 w-8 flex items-center justify-center text-sm cursor-pointer select-none rounded
            ${isSelected ? 'bg-gray-800 text-white font-semibold' : ''}
            ${isInRange && !isSelected ? 'bg-gray-100' : ''}
            ${!isInRange && !isSelected ? 'hover:bg-gray-50' : ''}
            ${isToday && !isSelected ? 'border border-gray-800' : ''}
          `}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="flex-1">
        <div className="text-center font-semibold mb-4">{monthName}</div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const fetchSessionData = async (start: Date, end?: Date) => {
    setFetchingData(true);
    setDataMessage('');
    setAnalytics(null);
    
    try {
      const startStr = formatDate(start);
      const endStr = end ? formatDate(end) : formatDate(start);
      
      const response = await apiFetch(
        `/analytics/dashboard?startDate=${startStr}${end ? `&endDate=${endStr}` : ''}`,
        { method: 'GET' }
      );
      
      if (response.success) {
        setAnalytics(response.analytics);
        setSelectedDateRange({ start: startStr, end: endStr });
        
        if (!response.analytics) {
          const dateText = startStr === endStr ? `date ${startStr}` : `date range ${startStr} to ${endStr}`;
          setDataMessage(`No data available for the selected ${dateText}`);
        } else {
          const dateText = startStr === endStr ? `date ${startStr}` : `date range ${startStr} to ${endStr}`;
          setDataMessage(`Analytics for ${dateText} (${response.count} sessions)`);
        }
      } else {
        setDataMessage(response.message || 'Error fetching data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setDataMessage('Error fetching data. Please try again.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleExportExcel = async () => {
    if (startDate) {
      setShowModal(false);
      await fetchSessionData(startDate, endDate || undefined);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Zeon <span className="text-emerald-600"></span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-md"
          >
            Select Date Range
          </button>
        </div>

        {/* Data Display Section */}
        {fetchingData && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              <p className="mt-4 text-gray-600">Fetching data...</p>
            </div>
          </div>
        )}

        {!fetchingData && dataMessage && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <div className={`p-4 rounded-lg ${!analytics ? 'bg-yellow-50 border border-yellow-200' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`${!analytics ? 'text-yellow-800' : 'text-emerald-800'} font-medium`}>
                {dataMessage}
              </p>
              {selectedDateRange && (
                <p className="text-sm text-gray-600 mt-1">
                  Date Range: {selectedDateRange.start} to {selectedDateRange.end}
                </p>
              )}
            </div>
          </div>
        )}

        {!fetchingData && analytics && (
          <AnalyticsDashboard analytics={analytics} />
        )}
      </main>

      {/* Date Range Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4" onMouseUp={handleMouseUp}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Please choose a date or date range to view data</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Date Input */}
            <div className="mb-6 relative">
              <input
                type="text"
                value={`${formatDate(startDate)} ${endDate && endDate.getTime() !== startDate?.getTime() ? '→ ' + formatDate(endDate) : ''}`}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-600"
                placeholder="Select date or date range"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* Calendar Navigation */}
            <div className="flex justify-center items-center mb-4 space-x-4">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendars */}
            <div className="flex gap-8 mb-6">
              {renderCalendar(0)}
              {renderCalendar(1)}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setShowModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportExcel}
                disabled={!startDate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Fetch Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
