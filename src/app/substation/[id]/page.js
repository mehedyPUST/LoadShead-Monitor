'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import FeederCard from '@/components/substation/FeederCard';
import VerticalBarChart from '@/components/substation/VerticalBarChart';
import Spinner from '@/components/common/Spinner';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

// Helper functions
const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatReadableDate = (dateStr) => {
    if (!dateStr) return '';
    let year, month, day;
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
        [year, month, day] = dateStr.split('-');
    } else {
        const parts = dateStr.replace(/[.\-]/g, '/').split('/');
        if (parts.length === 3) { day = parts[0]; month = parts[1]; year = parts[2]; }
        else return dateStr;
    }
    const d = parseInt(day, 10), m = parseInt(month, 10), y = parseInt(year, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return dateStr;
    const date = new Date(y, m - 1, d);
    const monthName = date.toLocaleString('en-GB', { month: 'long' });
    return `${getOrdinal(d)} ${monthName} ${y}`;
};

export default function SubstationPage() {
    const params = useParams();
    const id = params.id;
    const { user } = useAuth();

    const [filter, setFilter] = useState('today');
    const [substation, setSubstation] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(null);
    const [customMonthLabel, setCustomMonthLabel] = useState('');
    const [noData, setNoData] = useState(false);
    const [error, setError] = useState(null);

    const refreshTimerRef = useRef(null);
    const retryCountRef = useRef(0);
    const isVisibleRef = useRef(true);

    const hasLiveRecords = useMemo(() =>
        records.some(r => r.isLive === true),
        [records]);

    const fetchData = useCallback(async (filterType = filter, range = null) => {
        try {
            setLoading(true);
            setNoData(false);
            setError(null);

            const substationPromise = api.getSubstation(id);

            let recordsPromise;
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) {
                recordsPromise = api.getRecordsBySubstationWithDates(id, range.startDate, range.endDate);
            } else {
                recordsPromise = api.getRecordsBySubstation(id, filterType);
            }

            const [substationRes, recordsRes] = await Promise.all([substationPromise, recordsPromise]);

            if (substationRes.success) setSubstation(substationRes.data);

            if (recordsRes.success) {
                setRecords(recordsRes.data);
                setNoData(recordsRes.data.length === 0);
                retryCountRef.current = 0;
            }
        } catch (error) {
            console.error(error);
            setError(error.message);
            setNoData(true);

            if (retryCountRef.current < 1) {
                retryCountRef.current += 1;
                setTimeout(() => {
                    fetchData(filterType, range);
                }, 3000);
            }
        } finally {
            setLoading(false);
        }
    }, [id, filter]);

    const handleFilterChange = useCallback((filterData) => {
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
    }, [fetchData]);

    const handleRecordAdded = useCallback(async () => {
        await fetchData(filter, dateRange);
    }, [filter, dateRange, fetchData]);

    // Initial fetch
    useEffect(() => {
        fetchData('today');
    }, []);

    // Auto-refresh with visibility check + 60 second timer
    useEffect(() => {
        if (hasLiveRecords || filter === 'live') {
            refreshTimerRef.current = setInterval(() => {
                if (isVisibleRef.current) {
                    const silentFetch = async () => {
                        try {
                            let recordsRes;
                            if (dateRange && (filter === 'customDate' || filter === 'customMonth')) {
                                recordsRes = await api.getRecordsBySubstationWithDates(id, dateRange.startDate, dateRange.endDate);
                            } else {
                                recordsRes = await api.getRecordsBySubstation(id, filter);
                            }
                            if (recordsRes.success) {
                                setRecords(recordsRes.data);
                                setNoData(recordsRes.data.length === 0);
                            }
                        } catch (error) {
                            console.error('Auto-refresh error:', error);
                        }
                    };
                    silentFetch();
                }
            }, 60000); // 60 seconds
        }

        // Refresh when tab becomes visible
        const handleVisibility = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (document.visibilityState === 'visible' && (hasLiveRecords || filter === 'live')) {
                // Immediate refresh when user returns to tab
                const silentFetch = async () => {
                    try {
                        let recordsRes;
                        if (dateRange && (filter === 'customDate' || filter === 'customMonth')) {
                            recordsRes = await api.getRecordsBySubstationWithDates(id, dateRange.startDate, dateRange.endDate);
                        } else {
                            recordsRes = await api.getRecordsBySubstation(id, filter);
                        }
                        if (recordsRes.success) {
                            setRecords(recordsRes.data);
                            setNoData(recordsRes.data.length === 0);
                        }
                    } catch (error) {
                        console.error('Visibility refresh error:', error);
                    }
                };
                silentFetch();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [hasLiveRecords, filter, id, dateRange]);

    const totalDuration = useMemo(() =>
        records.reduce((sum, r) => sum + (r.duration || 0), 0),
        [records]);

    const feeders = useMemo(() =>
        substation?.feeders || [],
        [substation]);

    const maxDuration = useMemo(() =>
        Math.max(1, ...feeders.map(feeder => {
            const feederRecords = records.filter(r => r.feederId === feeder.id);
            return feederRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
        })),
        [feeders, records]);

    const canAddRecord = useMemo(() => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') return user.substationId === id;
        return false;
    }, [user, id]);

    const getFilterLabel = () => {
        const getTodayReadable = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return formatReadableDate(`${year}-${month}-${day}`);
        };
        const getDateDaysAgo = (days) => {
            const date = new Date();
            date.setDate(date.getDate() - days);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return formatReadableDate(`${year}-${month}-${day}`);
        };
        switch (filter) {
            case 'today': return `Today (${getTodayReadable()})`;
            case 'yesterday': return `Yesterday (${getDateDaysAgo(1)})`;
            case 'last7days': return `Last 7 Days (${getDateDaysAgo(6)} – ${getTodayReadable()})`;
            case 'last15days': return `Last 15 Days (${getDateDaysAgo(14)} – ${getTodayReadable()})`;
            case 'thisMonth': {
                const now = new Date();
                const monthName = now.toLocaleString('en-GB', { month: 'long' });
                const year = now.getFullYear();
                return `This Month (${monthName} ${year})`;
            }
            case 'customDate':
                if (dateRange) {
                    return `Custom Date: ${formatReadableDate(dateRange.startDate)} – ${formatReadableDate(dateRange.endDate)}`;
                }
                return 'Custom Date';
            case 'customMonth':
                return customMonthLabel ? `Custom Month: ${customMonthLabel}` : 'Custom Month';
            case 'live': return '🔴 LIVE Events';
            default: return '';
        }
    };

    const getPeriodLabel = () => {
        const getTodayReadable = () => {
            const today = new Date();
            return formatReadableDate(today.toISOString().split('T')[0]);
        };
        const getDateDaysAgo = (days) => {
            const date = new Date();
            date.setDate(date.getDate() - days);
            return formatReadableDate(date.toISOString().split('T')[0]);
        };
        switch (filter) {
            case 'today': return `on ${getTodayReadable()}`;
            case 'yesterday': return `on ${getDateDaysAgo(1)}`;
            case 'last7days': {
                const start = getDateDaysAgo(6);
                const end = getTodayReadable();
                return `from ${start} to ${end}`;
            }
            case 'last15days': {
                const start = getDateDaysAgo(14);
                const end = getTodayReadable();
                return `from ${start} to ${end}`;
            }
            case 'thisMonth': {
                const now = new Date();
                const monthName = now.toLocaleString('en-GB', { month: 'long' });
                return `in ${monthName} ${now.getFullYear()}`;
            }
            case 'customDate':
                if (dateRange) {
                    return `from ${formatReadableDate(dateRange.startDate)} to ${formatReadableDate(dateRange.endDate)}`;
                }
                return 'in the selected period';
            case 'customMonth':
                return customMonthLabel ? `in ${customMonthLabel}` : 'in the selected month';
            case 'live': return 'currently live';
            default: return 'today';
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner size={48} />
                </div>
            </Layout>
        );
    }

    if (!substation) return <Layout><div>Substation not found</div></Layout>;

    return (
        <Layout>
            <Link href="/" className="text-emerald-600 hover:underline mb-4 inline-block font-medium">← All Substations</Link>
            <div className="card p-6 mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">🏭 {substation.name}</h1>
                        <p className="text-gray-500">{substation.code} | {substation.location}</p>
                        {hasLiveRecords && (
                            <p className="text-xs text-red-500 mt-1 animate-pulse">🔴 Live event in progress - auto-refreshing every 60s</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="badge badge-blue">Feeders: {feeders.length}</span>
                        <span className="badge badge-red">Events: {records.length}</span>
                        <span className="badge badge-yellow">Duration: {totalDuration} mins</span>
                        {canAddRecord && <span className="badge badge-emerald">✅ Can Add Data</span>}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-center justify-between">
                    <span>⚠️ {error}</span>
                    <button onClick={() => fetchData(filter, dateRange)} className="text-red-700 underline text-xs">
                        Retry
                    </button>
                </div>
            )}

            <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} filterLabel={getFilterLabel()} />

            <div className="mb-8">
                {records.length === 0 ? (
                    <div className="card p-6 text-center text-gray-500">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-sm">No loadshed data available for the selected period.</p>
                        <p className="text-xs text-gray-400 mt-1">Add a new record using the "Add" button on any feeder.</p>
                    </div>
                ) : (
                    <VerticalBarChart feeders={feeders} records={records} />
                )}
            </div>

            <div className="space-y-4">
                {feeders.map((feeder, idx) => {
                    const feederRecords = records.filter(r => r.feederId === feeder.id);
                    return (
                        <FeederCard
                            key={feeder.id}
                            feeder={feeder}
                            records={feederRecords}
                            maxDuration={maxDuration}
                            index={idx}
                            substation={substation}
                            onRecordAdded={handleRecordAdded}
                            canAdd={canAddRecord}
                            periodLabel={getPeriodLabel()}
                        />
                    );
                })}
            </div>

            {feeders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-100">
                    <p className="text-gray-500 text-lg">No feeders found for this substation</p>
                </div>
            )}
        </Layout>
    );
}