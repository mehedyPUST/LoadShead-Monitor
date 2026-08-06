'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import Spinner from '@/components/common/Spinner';
import { apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#F472B6', '#34D399', '#60A5FA', '#A78BFA', '#FBBF24'];

const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month} ${time}`;
};

const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} mins`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m (${minutes} mins)` : `${h}h (${minutes} mins)`;
};

export default function AllFeedersPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [feeders, setFeeders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('today');
    const [dateRange, setDateRange] = useState(null);
    const [customMonthLabel, setCustomMonthLabel] = useState('');

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [loading, user, router]);

    const fetchData = async (filterType = filter, range = null) => {
        try {
            setIsLoading(true);
            setError(null);
            let url = '/feeders/all-stats';
            const params = new URLSearchParams();
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) {
                params.append('startDate', range.startDate);
                params.append('endDate', range.endDate);
            } else {
                params.append('view', filterType);
            }
            const query = params.toString();
            if (query) url += '?' + query;
            const response = await apiCall(url);
            if (response.success) setFeeders(response.data);
            else setError(response.error || 'Failed to load data');
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFilterChange = (filterData) => {
        const { type, startDate, endDate, month, year } = filterData;
        setFilter(type);
        if (type === 'customDate' && startDate && endDate) {
            setDateRange({ startDate, endDate });
            setCustomMonthLabel('');
            fetchData('customDate', { startDate, endDate });
        } else if (type === 'customMonth' && month && year) {
            const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
            const start = new Date(year, monthIndex, 1);
            const end = new Date(year, monthIndex + 1, 0);
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            setDateRange({ startDate: startStr, endDate: endStr });
            setCustomMonthLabel(`${month} ${year}`);
            fetchData('customMonth', { startDate: startStr, endDate: endStr });
        } else {
            setDateRange(null);
            setCustomMonthLabel('');
            fetchData(type);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const getFilterLabel = () => {
        return 'All Feeders';
    };

    // 🔥 MEMOIZED: Calculate stats
    const totalDuration = useMemo(() =>
        feeders.reduce((sum, f) => sum + f.totalDuration, 0),
        [feeders]);

    const totalEvents = useMemo(() =>
        feeders.reduce((sum, f) => sum + f.eventCount, 0),
        [feeders]);

    const activeFeeders = useMemo(() =>
        feeders.filter(f => f.eventCount > 0).length,
        [feeders]);

    const maxDuration = useMemo(() =>
        Math.max(1, ...feeders.map(f => f.totalDuration)),
        [feeders]);

    // 🔥 GROUP FEEDERS BY SUBSTATION
    const groupedFeeders = useMemo(() => {
        const groups = {};
        feeders.forEach(f => {
            const key = f.substationName || 'Unknown';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(f);
        });
        return groups;
    }, [feeders]);

    if (loading || !user || isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner size={48} />
                </div>
            </Layout>
        );
    }

    if (error) return (
        <Layout>
            <div className="text-red-500">
                <p>Error: {error}</p>
                <button onClick={() => fetchData()} className="text-emerald-600 underline mt-2">
                    Retry
                </button>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">⚡ All Feeders</h1>
                <p className="text-sm text-gray-500">Loadshed events across all substations</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 border-l-4 border-blue-500"><p className="text-sm text-gray-500">Total Feeders</p><p className="text-2xl font-bold">{feeders.length}</p></div>
                <div className="card p-4 border-l-4 border-red-500"><p className="text-sm text-gray-500">Active Feeders</p><p className="text-2xl font-bold text-red-600">{activeFeeders}</p></div>
                <div className="card p-4 border-l-4 border-yellow-500"><p className="text-sm text-gray-500">Total Events</p><p className="text-2xl font-bold text-yellow-600">{totalEvents}</p></div>
                <div className="card p-4 border-l-4 border-purple-500"><p className="text-sm text-gray-500">Total Duration</p><p className="text-2xl font-bold text-purple-600">{formatDuration(totalDuration)}</p></div>
            </div>
            <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} filterLabel={`All Feeders – ${getFilterLabel()}`} />
            {feeders.length === 0 && <div className="card p-12 text-center">No feeders found</div>}

            {/* 🔥 GROUPED BY SUBSTATION */}
            <div className="space-y-6">
                {Object.entries(groupedFeeders).map(([substationName, subFeeders]) => (
                    <div key={substationName}>
                        <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <span>🏭</span> {substationName}
                            <span className="text-sm font-normal text-gray-400">({subFeeders.length} feeders)</span>
                        </h2>
                        <div className="space-y-4">
                            {subFeeders.map((feeder) => (
                                <div key={feeder.feederId} className="card p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{feeder.feederName}</h3>
                                            <p className="text-xs text-gray-400">{feeder.eventCount} events · {formatDuration(feeder.totalDuration)} total</p>
                                        </div>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{feeder.eventCount} events</span>
                                    </div>
                                    {feeder.totalDuration > 0 ? (
                                        <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                                            {feeder.events.map((event, idx) => {
                                                const segWidth = (event.duration / maxDuration) * 100;
                                                const left = feeder.events.slice(0, idx).reduce((sum, e) => sum + (e.duration / maxDuration) * 100, 0);
                                                return (
                                                    <div key={event.id} className="absolute top-0 h-full transition-all hover:opacity-80" style={{ left: `${left}%`, width: `${Math.max(segWidth, 0.5)}%`, backgroundColor: colors[idx % colors.length], minWidth: '2px' }} title={`${formatDateTime(event.start)} → ${formatDateTime(event.end)} (${event.duration} mins)`} />
                                                );
                                            })}
                                        </div>
                                    ) : <div className="w-full h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">No loadshed events</div>}
                                    {feeder.events.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {feeder.events.slice(0, 3).map((event, idx) => (
                                                <span key={event.id} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600" style={{ borderLeft: `3px solid ${colors[idx % colors.length]}` }}>{formatDateTime(event.start)} – {event.duration} mins</span>
                                            ))}
                                            {feeder.events.length > 3 && <span className="text-[10px] text-gray-400">+{feeder.events.length - 3} more</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Layout>
    );
}