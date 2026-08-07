'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Building2,
    MapPin,
    Plus,
    Activity,
    Clock,
    Radio,
    CheckCircle2,
    Inbox,
    ArrowLeft,
    Zap
} from 'lucide-react';
import { CgMediaLive } from 'react-icons/cg';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import FeederCard from '@/components/substation/FeederCard';
import AddFeederModal from '@/components/modals/AddFeederModal';
import Spinner from '@/components/common/Spinner';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import HorizontalBarChart from '@/components/substation/HorizontalBarChart';

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
        if (parts.length === 3) {
            day = parts[0];
            month = parts[1];
            year = parts[2];
        } else return dateStr;
    }
    const d = parseInt(day, 10),
        m = parseInt(month, 10),
        y = parseInt(year, 10);
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

    const hasLiveRecords = useMemo(() => records.some((r) => r.isLive), [records]);

    const fetchData = useCallback(
        async (filterType = filter, range = null) => {
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
        },
        [id, filter]
    );

    const handleFilterChange = useCallback(
        (filterData) => {
            const { type, startDate, endDate, month, year } = filterData;
            setFilter(type);
            if (type === 'customDate' && startDate && endDate) {
                setDateRange({ startDate, endDate });
                setCustomMonthLabel('');
                fetchData('customDate', { startDate, endDate });
            } else if (type === 'customMonth' && month && year) {
                const monthIndex = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                ].indexOf(month);
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
        },
        [fetchData]
    );

    const handleDataChanged = useCallback(async () => {
        await fetchData(filter, dateRange);
    }, [filter, dateRange, fetchData]);

    useEffect(() => {
        fetchData('today');
    }, []);

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

    const totalDuration = useMemo(
        () => records.reduce((sum, r) => sum + (r.duration || 0), 0),
        [records]
    );

    const feeders = useMemo(() => substation?.feeders || [], [substation]);

    const maxDuration = useMemo(
        () =>
            Math.max(
                1,
                ...feeders.map((f) => {
                    const feederRecords = records.filter((r) => r.feederId === f.id);
                    return feederRecords.reduce((s, r) => s + (r.duration || 0), 0);
                })
            ),
        [feeders, records]
    );

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
            return formatReadableDate(
                `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
            );
        };

        switch (filter) {
            case 'today':
                return `Today · ${formatReadableDate(todayStr)}`;
            case 'yesterday':
                return `Yesterday · ${formatReadableDate(yesterdayStr)}`;
            case 'last7days':
                return `Last 7 Days · ${daysAgo(6)} – ${formatReadableDate(todayStr)}`;
            case 'last15days':
                return `Last 15 Days · ${daysAgo(14)} – ${formatReadableDate(todayStr)}`;
            case 'thisMonth':
                return `This Month · ${today.toLocaleString('en-GB', { month: 'long' })} ${today.getFullYear()}`;
            case 'customDate':
                return dateRange
                    ? `Custom: ${formatReadableDate(dateRange.startDate)} – ${formatReadableDate(dateRange.endDate)}`
                    : 'Custom Date';
            case 'customMonth':
                return customMonthLabel ? `Custom Month: ${customMonthLabel}` : 'Custom Month';
            case 'live':
                return (
                    <span className="inline-flex items-center gap-1.5">
                        <CgMediaLive className="w-3.5 h-3.5 text-red-500" />
                        LIVE Events
                    </span>
                );
            default:
                return '';
        }
    };

    if (loading)
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            </Layout>
        );

    if (!substation)
        return (
            <Layout>
                <div className="text-center py-20 text-gray-500">Substation not found</div>
            </Layout>
        );

    return (
        <Layout>
            {/* Breadcrumb */}
            <div className="mb-5">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                    <ArrowLeft size={15} />
                    All Substations
                </Link>
            </div>

            {/* Substation Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                            <Building2 size={22} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {substation.name}
                                </h1>
                                {hasLiveRecords && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-100 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        LIVE
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                                <span className="font-medium text-gray-600">{substation.code}</span>
                                {substation.location && (
                                    <>
                                        <span className="text-gray-300">·</span>
                                        <MapPin size={13} className="text-gray-400" />
                                        <span className="truncate">{substation.location}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsAddFeederModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            <Plus size={16} />
                            Add Feeder
                        </button>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/80">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600">
                            <Zap size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Feeders</p>
                            <p className="text-lg font-bold text-gray-900 tabular-nums">{feeders.length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/80">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-600">
                            <Activity size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Events</p>
                            <p className="text-lg font-bold text-red-600 tabular-nums">{records.length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/80">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-600">
                            <Clock size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Duration</p>
                            <p className="text-lg font-bold text-amber-600 tabular-nums">{totalDuration}m</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50/80">
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${hasLiveRecords ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                            }`}>
                            {hasLiveRecords ? <Radio size={16} /> : <CheckCircle2 size={16} />}
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Status</p>
                            <p className={`text-lg font-bold ${hasLiveRecords ? 'text-red-600' : 'text-emerald-600'}`}>
                                {hasLiveRecords ? 'Live' : 'Normal'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-5">
                <FilterBar
                    activeFilter={filter}
                    onFilterChange={handleFilterChange}
                    filterLabel={getFilterLabel()}
                />
            </div>

            {/* Chart or Empty */}
            {records.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center mb-6">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-400 mx-auto mb-4">
                        <Inbox size={26} />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No loadshed data for the selected period</p>
                    <p className="text-xs text-gray-400 mt-1">Try changing the filter or date range</p>
                </div>
            ) : (
                <div className="mb-6">
                    <HorizontalBarChart feeders={feeders} records={records} />
                </div>
            )}

            {/* Feeder Cards */}
            <div className="space-y-2.5">
                {feeders.map((feeder, idx) => {
                    const feederRecords = records.filter((r) => r.feederId === feeder.id);
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
                <div className="text-center py-14 bg-white rounded-xl border border-gray-100">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mx-auto mb-3">
                        <Zap size={22} />
                    </div>
                    <p className="text-gray-600 font-medium">No feeders found for this substation</p>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsAddFeederModalOpen(true)}
                            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
                        >
                            <Plus size={15} />
                            Add First Feeder
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