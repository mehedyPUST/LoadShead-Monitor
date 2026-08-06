'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import FeederCard from '@/components/substation/FeederCard';

import AddFeederModal from '@/components/modals/AddFeederModal';
import Spinner from '@/components/common/Spinner';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import HorizontalBarChart from '@/components/substation/HorizontalBarChart';

// Keep existing helper functions (getOrdinal, formatReadableDate) unchanged
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
    const [isAddFeederModalOpen, setIsAddFeederModalOpen] = useState(false);

    const refreshTimerRef = useRef(null);
    const retryCountRef = useRef(0);
    const isVisibleRef = useRef(true);

    const hasLiveRecords = useMemo(() => records.some(r => r.isLive), [records]);

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
        } catch (err) {
            console.error(err);
            setError(err.message);
            setNoData(true);
            if (retryCountRef.current < 1) {
                retryCountRef.current += 1;
                setTimeout(() => fetchData(filterType, range), 3000);
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

    const handleDataChanged = useCallback(async () => {
        await fetchData(filter, dateRange);
    }, [filter, dateRange, fetchData]);

    useEffect(() => { fetchData('today'); }, []);
    useEffect(() => {
        if (hasLiveRecords || filter === 'live') {
            refreshTimerRef.current = setInterval(() => {
                if (isVisibleRef.current) fetchData(filter, dateRange);
            }, 60000);
        }
        const handleVisibility = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (document.visibilityState === 'visible' && (hasLiveRecords || filter === 'live'))
                fetchData(filter, dateRange);
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [hasLiveRecords, filter, id, dateRange, fetchData]);

    const totalDuration = useMemo(() =>
        records.reduce((sum, r) => sum + (r.duration || 0), 0),
        [records]);

    const feeders = useMemo(() => substation?.feeders || [], [substation]);
    const maxDuration = useMemo(() =>
        Math.max(1, ...feeders.map(f => {
            const feederRecords = records.filter(r => r.feederId === f.id);
            return feederRecords.reduce((s, r) => s + (r.duration || 0), 0);
        })),
        [feeders, records]);

    const canAddRecord = useMemo(() => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') return user.substationId === id;
        return false;
    }, [user, id]);

    const getFilterLabel = () => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        const daysAgo = (d) => {
            const d2 = new Date();
            d2.setDate(d2.getDate() - d);
            return formatReadableDate(`${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`);
        };
        switch (filter) {
            case 'today': return `Today · ${formatReadableDate(todayStr)}`;
            case 'yesterday': return `Yesterday · ${formatReadableDate(yesterdayStr)}`;
            case 'last7days': return `Last 7 Days · ${daysAgo(6)} – ${formatReadableDate(todayStr)}`;
            case 'last15days': return `Last 15 Days · ${daysAgo(14)} – ${formatReadableDate(todayStr)}`;
            case 'thisMonth': return `This Month · ${today.toLocaleString('en-GB', { month: 'long' })} ${today.getFullYear()}`;
            case 'customDate': return dateRange ? `Custom: ${formatReadableDate(dateRange.startDate)} – ${formatReadableDate(dateRange.endDate)}` : 'Custom Date';
            case 'customMonth': return customMonthLabel ? `Custom Month: ${customMonthLabel}` : 'Custom Month';
            case 'live': return '🔴 LIVE Events';
            default: return '';
        }
    };

    if (loading) return <Layout><div className="flex justify-center items-center h-64"><Spinner size={48} /></div></Layout>;
    if (!substation) return <Layout><div className="text-center py-20 text-gray-500">Substation not found</div></Layout>;

    return (
        <Layout>
            {/* Breadcrumb & Header */}
            <div className="mb-4">
                <Link href="/" className="text-xs text-emerald-600 hover:underline">← All Substations</Link>
            </div>

            {/* Substation Info Card - Sleeker */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            🏭 {substation.name}
                            {hasLiveRecords && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>LIVE
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">{substation.code} · {substation.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Admin Add Feeder Button */}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setIsAddFeederModalOpen(true)}
                                className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition flex items-center gap-1 shadow-sm"
                            >
                                <span className="text-sm">➕</span> Add Feeder
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Feeders</p>
                        <p className="text-lg font-bold text-gray-800">{feeders.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Events</p>
                        <p className="text-lg font-bold text-red-600">{records.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Duration</p>
                        <p className="text-lg font-bold text-amber-600">{totalDuration}m</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Status</p>
                        <p className={`text-lg font-bold ${hasLiveRecords ? 'text-red-600' : 'text-emerald-600'}`}>
                            {hasLiveRecords ? '🔴 Live' : '✅ Normal'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-4">
                <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} filterLabel={getFilterLabel()} />
            </div>

            {/* Chart or Empty */}
            {records.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-500 mb-6">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm">No loadshed data for the selected period.</p>
                </div>
            ) : (
                <div className="mb-6">
                    <HorizontalBarChart feeders={feeders} records={records} />
                </div>
            )}

            {/* Feeder Cards - Cleaner */}
            <div className="space-y-2">
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
                            onRecordAdded={handleDataChanged}
                            canAdd={canAddRecord}
                            periodLabel={getFilterLabel()}
                        />
                    );
                })}
            </div>

            {feeders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">No feeders found for this substation.</p>
                    {user?.role === 'admin' && (
                        <button onClick={() => setIsAddFeederModalOpen(true)} className="btn-primary mt-2 text-sm">
                            ➕ Add First Feeder
                        </button>
                    )}
                </div>
            )}

            <AddFeederModal
                isOpen={isAddFeederModalOpen}
                onClose={() => setIsAddFeederModalOpen(false)}
                substation={substation}
                onSuccess={handleDataChanged}
            />
        </Layout>
    );
}