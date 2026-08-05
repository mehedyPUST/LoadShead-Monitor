'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import { api, apiCall } from '@/utils/api'; // ✅ Import apiCall directly
import { useAuth } from '@/context/AuthContext';

// Helper to format date and time
const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month} ${time}`;
};

// Helper to format duration
const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Color palette for event segments
const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#F472B6', '#34D399', '#60A5FA', '#A78BFA', '#FBBF24',
];

export default function AllFeedersPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [feeders, setFeeders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('today');
    const [dateRange, setDateRange] = useState(null);
    const [customMonthLabel, setCustomMonthLabel] = useState('');

    // Redirect if not logged in
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    // Fetch data
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

            // ✅ Use apiCall directly (not api.apiCall)
            const response = await apiCall(url);

            if (response.success) {
                setFeeders(response.data);
            } else {
                setError(response.error || 'Failed to load data');
            }
        } catch (err) {
            console.error('Error fetching feeders:', err);
            setError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle filter change
    const handleFilterChange = (filterData) => {
        const { type, startDate, endDate, month, year } = filterData;
        setFilter(type);

        if (type === 'customDate' && startDate && endDate) {
            setDateRange({ startDate, endDate });
            setCustomMonthLabel('');
            fetchData('customDate', { startDate, endDate });
        } else if (type === 'customMonth' && month && year) {
            const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
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

    // Compute filter label
    const getFilterLabel = () => {
        const today = new Date();
        const formatDate = (date) => {
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        };
        const formatDaysAgo = (days) => {
            const d = new Date();
            d.setDate(d.getDate() - days);
            return formatDate(d);
        };

        switch (filter) {
            case 'today': return `Today (${formatDate(today)})`;
            case 'yesterday': return `Yesterday (${formatDaysAgo(1)})`;
            case 'last7days': return `Last 7 Days (${formatDaysAgo(6)} – ${formatDate(today)})`;
            case 'last15days': return `Last 15 Days (${formatDaysAgo(14)} – ${formatDate(today)})`;
            case 'thisMonth': return `This Month (${today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`;
            case 'customDate': {
                if (dateRange) {
                    const start = new Date(dateRange.startDate);
                    const end = new Date(dateRange.endDate);
                    return `Custom Date: ${formatDate(start)} – ${formatDate(end)}`;
                }
                return 'Custom Date';
            }
            case 'customMonth': return customMonthLabel ? `Custom Month: ${customMonthLabel}` : 'Custom Month';
            default: return 'All Feeders';
        }
    };

    if (loading || !user) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </Layout>
        );
    }

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">Loading feeders...</div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-red-500">Error: {error}</div>
                </div>
            </Layout>
        );
    }

    // Calculate total stats
    const totalDuration = feeders.reduce((sum, f) => sum + f.totalDuration, 0);
    const totalEvents = feeders.reduce((sum, f) => sum + f.eventCount, 0);
    const activeFeeders = feeders.filter(f => f.eventCount > 0).length;

    // Find the maximum total duration among all feeders (to scale bars)
    const maxDuration = Math.max(1, ...feeders.map(f => f.totalDuration));

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">⚡ All Feeders</h1>
                <p className="text-sm text-gray-500">Loadshed events across all substations</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500">Total Feeders</p>
                    <p className="text-2xl font-bold">{feeders.length}</p>
                </div>
                <div className="card p-4 border-l-4 border-red-500">
                    <p className="text-sm text-gray-500">Active Feeders</p>
                    <p className="text-2xl font-bold text-red-600">{activeFeeders}</p>
                </div>
                <div className="card p-4 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">Total Events</p>
                    <p className="text-2xl font-bold text-yellow-600">{totalEvents}</p>
                </div>
                <div className="card p-4 border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500">Total Duration</p>
                    <p className="text-2xl font-bold text-purple-600">{formatDuration(totalDuration)}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <FilterBar
                activeFilter={filter}
                onFilterChange={handleFilterChange}
                filterLabel={`All Feeders – ${getFilterLabel()}`}
            />

            {feeders.length === 0 && (
                <div className="card p-12 text-center">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-gray-700">No feeders found</h3>
                </div>
            )}

            {/* Feeder List with Horizontal Bars scaled to maxDuration */}
            <div className="space-y-4">
                {feeders.map((feeder) => {
                    // Scale bar relative to maxDuration (not 100% per feeder)
                    const barWidth = (feeder.totalDuration / maxDuration) * 100;
                    // But we don't want empty bars to be zero width, so we set a minimum of 2%
                    const displayWidth = Math.max(barWidth, 0.1);

                    return (
                        <div key={feeder.feederId} className="card p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-gray-800">
                                        {feeder.feederName}
                                        <span className="text-sm font-normal text-gray-500 ml-2">
                                            ({feeder.substationName})
                                        </span>
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                        {feeder.eventCount} events · {formatDuration(feeder.totalDuration)} total
                                    </p>
                                </div>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                    {feeder.eventCount} events
                                </span>
                            </div>

                            {/* Horizontal Bar with Segments – scaled to maxDuration */}
                            {feeder.totalDuration > 0 ? (
                                <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                                    {feeder.events.map((event, idx) => {
                                        // Each segment width is (event.duration / maxDuration) * 100
                                        const segmentWidth = (event.duration / maxDuration) * 100;
                                        // Accumulate left offset from previous segments (relative to maxDuration)
                                        const leftOffset = feeder.events
                                            .slice(0, idx)
                                            .reduce((sum, e) => sum + (e.duration / maxDuration) * 100, 0);
                                        const color = colors[idx % colors.length];
                                        return (
                                            <div
                                                key={event.id}
                                                className="absolute top-0 h-full transition-all hover:opacity-80"
                                                style={{
                                                    left: `${leftOffset}%`,
                                                    width: `${Math.max(segmentWidth, 0.5)}%`,
                                                    backgroundColor: color,
                                                    minWidth: '2px', // minimal visible segment
                                                }}
                                                title={`${formatDateTime(event.start)} → ${formatDateTime(event.end)} (${event.duration}m)`}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="w-full h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-400">
                                    No loadshed events
                                </div>
                            )}

                            {/* Event list (first 3) */}
                            {feeder.events.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {feeder.events.slice(0, 3).map((event, idx) => (
                                        <span
                                            key={event.id}
                                            className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600"
                                            style={{ borderLeft: `3px solid ${colors[idx % colors.length]}` }}
                                        >
                                            {formatDateTime(event.start)} – {event.duration}m
                                        </span>
                                    ))}
                                    {feeder.events.length > 3 && (
                                        <span className="text-[10px] text-gray-400">
                                            +{feeder.events.length - 3} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Layout>
    );
}