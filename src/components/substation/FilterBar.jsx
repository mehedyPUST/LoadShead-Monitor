'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, CalendarDays, Radio } from 'lucide-react';

export default function FilterBar({ activeFilter, onFilterChange, filterLabel = '' }) {
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [showCustomMonth, setShowCustomMonth] = useState(false);
    const [startDisplay, setStartDisplay] = useState('');
    const [endDisplay, setEndDisplay] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const datePickerRef = useRef(null);
    const monthPickerRef = useRef(null);

    const filters = [
        { id: 'live', label: 'LIVE', icon: Radio },
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'last7days', label: 'Last 7 Days' },
        { id: 'last15days', label: 'Last 15 Days' },
        { id: 'thisMonth', label: 'This Month' },
    ];

    const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

    const toDisplay = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    const formatDateInput = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    };

    const parseDisplay = (str) => {
        if (!str) return null;
        const cleaned = str.trim().replace(/[.\-]/g, '/');
        const parts = cleaned.split('/');
        if (parts.length !== 3) return null;
        let [day, month, year] = parts.map(p => p.padStart(2, '0'));
        if (year.length === 2) year = '20' + year;
        const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10);
        if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
        const test = new Date(y, m - 1, d);
        if (test.getFullYear() !== y || test.getMonth() !== m - 1 || test.getDate() !== d) return null;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };

    const handleFilterClick = (filterId) => {
        setShowCustomDate(false);
        setShowCustomMonth(false);
        onFilterChange({ type: filterId });
    };

    const handleStartChange = (value) => {
        const formatted = formatDateInput(value);
        setStartDisplay(formatted);
        const iso = parseDisplay(formatted);
        setStartDate(iso || '');
    };

    const handleEndChange = (value) => {
        const formatted = formatDateInput(value);
        setEndDisplay(formatted);
        const iso = parseDisplay(formatted);
        setEndDate(iso || '');
    };

    const handleCustomDateApply = () => {
        if (startDate && endDate) {
            setShowCustomDate(false);
            onFilterChange({ type: 'customDate', startDate, endDate });
        }
    };

    const handleCustomMonthApply = () => {
        if (selectedMonth && selectedYear) {
            setShowCustomMonth(false);
            onFilterChange({ type: 'customMonth', month: selectedMonth, year: selectedYear });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) setShowCustomDate(false);
            if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) setShowCustomMonth(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {filters.map((filter) => {
                    const isActive = activeFilter === filter.id && !showCustomDate && !showCustomMonth;
                    const isLive = filter.id === 'live';
                    const Icon = filter.icon;

                    return (
                        <button
                            key={filter.id}
                            onClick={() => handleFilterClick(filter.id)}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${isActive
                                ? isLive
                                    ? 'bg-red-600 text-white shadow-md animate-pulse'
                                    : 'bg-emerald-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            {filter.label}
                        </button>
                    );
                })}

                {/* Custom Date */}
                <div className="relative" ref={datePickerRef}>
                    <button
                        onClick={() => { setShowCustomDate(!showCustomDate); setShowCustomMonth(false); }}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${activeFilter === 'customDate'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Custom Range
                    </button>
                    {showCustomDate && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl p-4 z-20 w-72 border border-gray-200">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Start (DD/MM/YYYY)</label>
                                    <input
                                        type="text"
                                        value={startDisplay}
                                        onChange={(e) => handleStartChange(e.target.value)}
                                        placeholder="01082026"
                                        maxLength={10}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">End (DD/MM/YYYY)</label>
                                    <input
                                        type="text"
                                        value={endDisplay}
                                        onChange={(e) => handleEndChange(e.target.value)}
                                        placeholder="15082026"
                                        maxLength={10}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                    />
                                </div>
                                <button
                                    onClick={handleCustomDateApply}
                                    disabled={!startDate || !endDate}
                                    className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    Apply Range
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Custom Month */}
                <div className="relative" ref={monthPickerRef}>
                    <button
                        onClick={() => { setShowCustomMonth(!showCustomMonth); setShowCustomDate(false); }}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${activeFilter === 'customMonth'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Select Month
                    </button>
                    {showCustomMonth && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl p-4 z-20 w-56 border border-gray-200">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="">Select</option>
                                        {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="">Select</option>
                                        {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={handleCustomMonthApply}
                                    disabled={!selectedMonth || !selectedYear}
                                    className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    Apply Month
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {filterLabel && (
                <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 inline-block border border-gray-200">
                    {filterLabel}
                </div>
            )}
        </div>
    );
}