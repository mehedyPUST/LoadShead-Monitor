'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
    Zap,
    Building2,
    Activity,
    ClipboardList,
    MapPin,
    Inbox,
    RefreshCw,
    AlertTriangle,
    Radio,
    ChevronRight,
    Clock
} from 'lucide-react';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import Spinner from '@/components/common/Spinner';
import { apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#F472B6', '#34D399', '#60A5FA', '#A78BFA', '#FBBF24'
];

const formatDateTime = (date) => {
    if (!date) return 'LIVE';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDuration = (mins) => {
    if (mins === 0) return '0 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${mins} min`;
    return `${mins} min (${h}h ${m}m)`;
};

// ---------- Skeleton ----------
const FeedersSkeleton = () => (
    <div className="space-y-6 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <Skeleton width={60} height={12} className="mb-2" />
                    <Skeleton width={40} height={24} />
                </div>
            ))}
        </div>
        {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <Skeleton width={160} height={16} />
                    <Skeleton width={100} height={14} />
                </div>
                <div>
                    {[1, 2, 3].map((j) => (
                        <div key={j} className="px-5 py-4 border-b border-gray-50">
                            <div className="flex justify-between mb-2">
                                <Skeleton width={140} height={16} />
                                <Skeleton width={80} height={14} />
                            </div>
                            <Skeleton height={20} className="rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

// ---------- Empty State ----------
const EmptyState = ({ filter, onRetry }) => {
    const isFiltered = filter !== 'today' && filter !== 'live';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center my-8"
        >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mx-auto mb-4">
                <Inbox size={30} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
                {isFiltered ? 'No feeders match this filter' : 'No feeders found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                {isFiltered
                    ? 'Try selecting a different date range or switch back to "Today".'
                    : 'There are currently no feeder records available.'}
            </p>
            {isFiltered && (
                <button onClick={onRetry} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                    Reset filter
                </button>
            )}
        </motion.div>
    );
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
    const refreshTimerRef = useRef(null);
    const isVisibleRef = useRef(true);
    const retryCountRef = useRef(0);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [loading, user, router]);

    const fetchData = useCallback(
        async (filterType = filter, range = null) => {
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
                if (params.toString()) url += '?' + params.toString();

                const res = await apiCall(url);
                if (res.success) {
                    setFeeders(res.data);
                    retryCountRef.current = 0;
                } else {
                    setError(res.error || 'Failed to load feeders');
                }
            } catch (err) {
                setError(err.message);
                if (retryCountRef.current < 1) {
                    retryCountRef.current++;
                    setTimeout(() => fetchData(filterType, range), 3000);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [filter]
    );

    const handleFilterChange = (fData) => {
        const { type, startDate, endDate, month, year } = fData;
        setFilter(type);

        if (type === 'customDate' && startDate && endDate) {
            setDateRange({ startDate, endDate });
            setCustomMonthLabel('');
            fetchData('customDate', { startDate, endDate });
        } else if (type === 'customMonth' && month && year) {
            const mi = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ].indexOf(month);
            const s = new Date(year, mi, 1);
            const e = new Date(year, mi + 1, 0);
            const ss = s.toISOString().split('T')[0];
            const ee = e.toISOString().split('T')[0];
            setDateRange({ startDate: ss, endDate: ee });
            setCustomMonthLabel(`${month} ${year}`);
            fetchData('customMonth', { startDate: ss, endDate: ee });
        } else {
            setDateRange(null);
            setCustomMonthLabel('');
            fetchData(type);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    useEffect(() => {
        const hasLive = feeders.some((f) => f.events.some((e) => e.isLive));
        if (hasLive || filter === 'live') {
            refreshTimerRef.current = setInterval(() => {
                if (isVisibleRef.current) fetchData(filter, dateRange);
            }, 60000);
        }

        const hv = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (document.visibilityState === 'visible' && (hasLive || filter === 'live')) {
                fetchData(filter, dateRange);
            }
        };
        document.addEventListener('visibilitychange', hv);

        return () => {
            clearInterval(refreshTimerRef.current);
            document.removeEventListener('visibilitychange', hv);
        };
    }, [feeders, filter, dateRange, fetchData]);

    const grouped = useMemo(() => {
        const g = {};
        feeders.forEach((f) => {
            const k = f.substationName || 'Unknown';
            if (!g[k]) {
                g[k] = {
                    feeders: [],
                    totalEvents: 0,
                    hasLive: false,
                    feederCount: 0,
                    affected: 0,
                };
            }
            g[k].feeders.push(f);
            g[k].totalEvents += f.eventCount || 0;
            g[k].feederCount++;
            if (f.eventCount > 0) g[k].affected++;
            if (f.events.some((e) => e.isLive)) g[k].hasLive = true;
        });
        return g;
    }, [feeders]);

    const stats = useMemo(() => {
        const totalFeeders = feeders.length;
        const active = feeders.filter((f) => f.eventCount > 0).length;
        const events = feeders.reduce((s, f) => s + f.eventCount, 0);
        const affectedSS = Object.keys(grouped).filter((k) => grouped[k].totalEvents > 0).length;
        const liveSS = Object.keys(grouped).filter((k) => grouped[k].hasLive).length;

        return {
            totalFeeders,
            active,
            events,
            affectedSS,
            liveSS,
            totalSS: Object.keys(grouped).length,
        };
    }, [feeders, grouped]);

    if (loading || !user) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700">
                            <Zap size={20} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            All Feeders
                        </h1>
                        {stats.liveSS > 0 && (
                            <motion.span
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-semibold border border-red-200"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                {stats.liveSS} live
                            </motion.span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 ml-13">
                        {stats.totalSS} substations · {stats.totalFeeders} feeders · {stats.active} active
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'Substations', value: stats.totalSS, icon: Building2 },
                        { label: 'Feeders', value: stats.totalFeeders, icon: Zap },
                        { label: 'Active', value: stats.active, icon: Radio },
                        { label: 'Events', value: stats.events, icon: ClipboardList },
                        { label: 'Affected SS', value: stats.affectedSS, icon: MapPin },
                    ].map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <motion.div
                                key={c.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.03 }}
                                className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 text-gray-500">
                                    <Icon size={17} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                                        {c.label}
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                                        {c.value}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <FilterBar
                    activeFilter={filter}
                    onFilterChange={handleFilterChange}
                    filterLabel="All Feeders"
                />

                {isLoading && <FeedersSkeleton />}

                {error && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center my-6"
                    >
                        <AlertTriangle size={20} className="text-red-500 mx-auto mb-3" />
                        <p className="text-sm text-red-600 mb-4">{error}</p>
                        <button
                            onClick={() => {
                                setError(null);
                                fetchData(filter, dateRange);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    </motion.div>
                )}

                {!isLoading && !error && feeders.length === 0 && (
                    <EmptyState
                        filter={filter}
                        onRetry={() => handleFilterChange({ type: 'today' })}
                    />
                )}

                {!isLoading && !error && feeders.length > 0 && (
                    <div className="space-y-5 mt-5">
                        {Object.entries(grouped).map(([ssName, group], gi) => (
                            <motion.div
                                key={ssName}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: gi * 0.04 }}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Substation Header */}
                                <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div className="flex items-center gap-2.5">
                                        <Building2 size={16} className="text-gray-400" />
                                        <span className="font-semibold text-gray-800 text-sm">
                                            {ssName}
                                        </span>
                                        {group.hasLive && (
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                LIVE
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {group.feeders.length} feeders
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        <span className="hidden sm:inline">{group.affected} affected · </span>
                                        {group.totalEvents} events
                                    </div>
                                </div>

                                {/* ✅ Feeder rows – CLEARLY DIFFERENTIATED */}
                                <div className="divide-y divide-gray-200">
                                    {group.feeders.map((feeder, fi) => {
                                        const hasLive = feeder.events.some((e) => e.isLive);
                                        const maxDur = Math.max(...feeder.events.map((e) => e.duration || 0), 1);
                                        // Alternating background for better differentiation
                                        const isAlternate = fi % 2 === 0;

                                        return (
                                            <motion.div
                                                key={feeder.feederId}
                                                initial={{ opacity: 0, x: -4 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.2, delay: gi * 0.04 + fi * 0.02 }}
                                                className={`px-4 sm:px-5 py-3.5 cursor-pointer transition-colors ${hasLive
                                                        ? 'bg-red-50/30 hover:bg-red-50/60'
                                                        : isAlternate
                                                            ? 'bg-white hover:bg-gray-50'
                                                            : 'bg-gray-50/30 hover:bg-gray-50/70'
                                                    }`}
                                                onClick={() => router.push(`/feeder/${feeder.feederId}`)}
                                            >
                                                {/* Left border accent for live feeders */}
                                                <div className={`${hasLive ? 'border-l-4 border-red-400 pl-3' : 'pl-0'} -ml-0.5`}>
                                                    <div className="flex justify-between items-center gap-3 mb-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Zap size={14} className={`shrink-0 ${hasLive ? 'text-red-500' : 'text-gray-400'}`} />
                                                            <span className={`text-sm font-medium truncate ${hasLive ? 'text-gray-900' : 'text-gray-700'}`}>
                                                                {feeder.feederName}
                                                            </span>
                                                            {hasLive && (
                                                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse shrink-0">
                                                                    LIVE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock size={12} className="text-gray-400" />
                                                                <span className={`text-sm font-semibold tabular-nums ${hasLive ? 'text-red-600' : 'text-gray-700'}`}>
                                                                    {formatDuration(feeder.totalDuration)}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-medium tabular-nums">
                                                                {feeder.eventCount}
                                                            </span>
                                                            <ChevronRight size={14} className="text-gray-300" />
                                                        </div>
                                                    </div>

                                                    {/* Duration bar */}
                                                    {feeder.totalDuration > 0 ? (
                                                        <div
                                                            className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden"
                                                            title={`${feeder.eventCount} events · Total ${formatDuration(feeder.totalDuration)}`}
                                                        >
                                                            {feeder.events.map((ev, ei) => {
                                                                const w = (ev.duration / maxDur) * 100;
                                                                const l = feeder.events
                                                                    .slice(0, ei)
                                                                    .reduce((s, e) => s + (e.duration / maxDur) * 100, 0);

                                                                return (
                                                                    <motion.div
                                                                        key={ev.id}
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${Math.max(w, 0.5)}%` }}
                                                                        transition={{ duration: 0.4, delay: ei * 0.03 }}
                                                                        className={`absolute top-0 h-full rounded-full ${ev.isLive ? 'animate-pulse' : ''
                                                                            }`}
                                                                        style={{
                                                                            left: `${l}%`,
                                                                            backgroundColor: ev.isLive
                                                                                ? '#EF4444'
                                                                                : colors[ei % colors.length],
                                                                            minWidth: '3px',
                                                                        }}
                                                                        title={`${ev.isLive ? 'LIVE' : formatDateTime(ev.start)} · ${formatDuration(ev.duration)}`}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-2 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center">
                                                            <span className="text-[9px] text-gray-400">No events</span>
                                                        </div>
                                                    )}

                                                    {/* Event chips */}
                                                    {feeder.events.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {feeder.events.slice(0, 3).map((ev, ei) => {
                                                                const label = ev.isLive
                                                                    ? `⚡ LIVE ${formatDuration(ev.duration)}`
                                                                    : `${formatDateTime(ev.start)} ${formatDuration(ev.duration)}`;

                                                                return (
                                                                    <span
                                                                        key={ev.id}
                                                                        className={`text-[9px] px-2 py-0.5 rounded-full font-medium truncate max-w-[130px] ${ev.isLive
                                                                                ? 'bg-red-100 text-red-600 border border-red-200'
                                                                                : 'bg-gray-100 text-gray-600'
                                                                            }`}
                                                                        style={
                                                                            !ev.isLive
                                                                                ? { borderLeft: `2px solid ${colors[ei % colors.length]}` }
                                                                                : {}
                                                                        }
                                                                    >
                                                                        {label}
                                                                    </span>
                                                                );
                                                            })}
                                                            {feeder.events.length > 3 && (
                                                                <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                                                                    +{feeder.events.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </Layout>
    );
}