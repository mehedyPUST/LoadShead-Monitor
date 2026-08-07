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
    Radio
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

const formatDuration = (mins) =>
    mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60}m`;

/* ---------- Skeleton ---------- */
const FeedersSkeleton = () => (
    <div className="space-y-5 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-xl border border-gray-100 p-3 border-l-4 border-l-gray-200">
                    <Skeleton width={70} height={12} className="mb-2" />
                    <Skeleton width={40} height={20} />
                </div>
            ))}
        </div>
        {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                    <Skeleton width={160} height={16} />
                    <Skeleton width={90} height={14} />
                </div>
                <div>
                    {[1, 2, 3].map((j) => (
                        <div key={j} className="px-4 py-3.5 border-b border-gray-50">
                            <div className="flex justify-between mb-2">
                                <Skeleton width={140} height={16} />
                                <Skeleton width={60} height={14} />
                            </div>
                            <Skeleton height={20} className="rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

/* ---------- Empty State ---------- */
const EmptyState = ({ filter, onRetry }) => {
    const isFiltered = filter !== 'today' && filter !== 'live';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center my-6"
        >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-400 mx-auto mb-4">
                <Inbox size={26} />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">
                {isFiltered ? 'No feeders match this filter' : 'No feeders found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-5">
                {isFiltered
                    ? 'Try selecting a different date range or switch back to “Today”.'
                    : 'There are currently no feeder records available.'}
            </p>
            {isFiltered && (
                <button onClick={onRetry} className="btn-primary text-sm px-4 py-2">
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
                    <Spinner size={48} />
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
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                                <Zap size={18} />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                                All Feeders
                            </h1>
                            {stats.liveSS > 0 && (
                                <motion.span
                                    animate={{ opacity: [1, 0.55, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="inline-flex items-center gap-1.5 text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-100 shrink-0"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {stats.liveSS} live
                                </motion.span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-11 truncate">
                            {stats.totalSS} substations · {stats.totalFeeders} feeders · {stats.active} active
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
                    {[
                        { label: 'Substations', value: stats.totalSS, icon: Building2, color: 'border-blue-500 bg-blue-50/50', iconBg: 'bg-blue-100 text-blue-600' },
                        { label: 'Feeders', value: stats.totalFeeders, icon: Zap, color: 'border-purple-500 bg-purple-50/50', iconBg: 'bg-purple-100 text-purple-600' },
                        { label: 'Active', value: stats.active, icon: Radio, color: 'border-red-500 bg-red-50/50', iconBg: 'bg-red-100 text-red-600' },
                        { label: 'Events', value: stats.events, icon: ClipboardList, color: 'border-amber-500 bg-amber-50/50', iconBg: 'bg-amber-100 text-amber-600' },
                        { label: 'Affected SS', value: stats.affectedSS, icon: MapPin, color: 'border-orange-500 bg-orange-50/50', iconBg: 'bg-orange-100 text-orange-600' },
                    ].map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <motion.div
                                key={c.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.03 }}
                                className={`rounded-xl border border-gray-100 border-l-4 ${c.color} p-3 flex items-center gap-2.5 shadow-sm`}
                            >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.iconBg} shrink-0`}>
                                    <Icon size={15} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{c.label}</p>
                                    <p className="text-base font-bold text-gray-900 tabular-nums">{c.value}</p>
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
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center my-4"
                    >
                        <div className="flex items-center justify-center gap-2 text-red-500 mb-3 text-sm">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                        <button
                            onClick={() => {
                                setError(null);
                                fetchData(filter, dateRange);
                            }}
                            className="inline-flex items-center gap-1.5 btn-primary text-sm"
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
                    <div className="space-y-4 mt-4">
                        {Object.entries(grouped).map(([ssName, group], gi) => (
                            <motion.div
                                key={ssName}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: gi * 0.04 }}
                                className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                            >
                                {/* Substation Header */}
                                <div
                                    className={`px-3 sm:px-4 py-2.5 border-b flex justify-between items-center gap-2 ${group.hasLive
                                            ? 'bg-gradient-to-r from-red-50 to-red-50/40 border-red-100'
                                            : 'bg-gradient-to-r from-gray-50 to-white border-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 size={15} className="text-gray-400 shrink-0" />
                                        <span className="font-semibold text-gray-800 text-sm truncate">{ssName}</span>
                                        {group.hasLive && (
                                            <motion.span
                                                animate={{ opacity: [1, 0.55, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                            >
                                                LIVE
                                            </motion.span>
                                        )}
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0 hidden xs:inline">
                                            {group.feeders.length} feeders
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 shrink-0 text-right">
                                        <span className="hidden sm:inline">{group.affected} affected · </span>
                                        <span>{group.totalEvents} events</span>
                                    </div>
                                </div>

                                {/* Feeder rows */}
                                <div className="divide-y divide-gray-50">
                                    {group.feeders.map((feeder, fi) => {
                                        const hasLive = feeder.events.some((e) => e.isLive);
                                        const maxDur = Math.max(...feeder.events.map((e) => e.duration || 0), 1);

                                        return (
                                            <motion.div
                                                key={feeder.feederId}
                                                initial={{ opacity: 0, x: -4 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.2, delay: gi * 0.04 + fi * 0.02 }}
                                                className={`px-3 sm:px-4 py-3.5 active:bg-gray-100/80 hover:bg-gray-50/70 cursor-pointer transition-colors ${hasLive ? 'bg-red-50/25' : ''
                                                    }`}
                                                onClick={() => router.push(`/feeder/${feeder.feederId}`)}
                                            >
                                                <div className="flex justify-between items-center gap-2 mb-2">
                                                    <h4 className="text-sm font-medium text-gray-800 flex items-center gap-1.5 min-w-0">
                                                        <Zap size={14} className="text-emerald-600 shrink-0" />
                                                        <span className="truncate">{feeder.feederName}</span>
                                                        {hasLive && (
                                                            <span className="text-red-500 text-[10px] animate-pulse font-bold shrink-0">
                                                                LIVE
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium shrink-0 tabular-nums">
                                                        {feeder.eventCount}
                                                    </span>
                                                </div>

                                                {/* Duration bar */}
                                                {feeder.totalDuration > 0 ? (
                                                    <div
                                                        className="relative w-full h-5 bg-gray-100/80 rounded-md overflow-hidden shadow-inner"
                                                        title={`${feeder.eventCount} event${feeder.eventCount !== 1 ? 's' : ''} · Total ${formatDuration(feeder.totalDuration)}`}
                                                    >
                                                        {feeder.events.map((ev, ei) => {
                                                            const w = (ev.duration / maxDur) * 100;
                                                            const l = feeder.events
                                                                .slice(0, ei)
                                                                .reduce((s, e) => s + (e.duration / maxDur) * 100, 0);

                                                            const tooltip = ev.isLive
                                                                ? `LIVE · ${formatDuration(ev.duration)}`
                                                                : `${formatDateTime(ev.start)} → ${formatDateTime(ev.end)} · ${formatDuration(ev.duration)}`;

                                                            return (
                                                                <motion.div
                                                                    key={ev.id}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.max(w, 0.8)}%` }}
                                                                    transition={{ duration: 0.35, delay: ei * 0.04 }}
                                                                    className={`absolute top-0 h-full ${ev.isLive ? 'animate-pulse' : ''}`}
                                                                    style={{
                                                                        left: `${l}%`,
                                                                        backgroundColor: ev.isLive ? '#EF4444' : colors[ei % colors.length],
                                                                        minWidth: '4px',
                                                                        boxShadow: ev.isLive
                                                                            ? '0 0 12px rgba(239,68,68,0.35)'
                                                                            : 'none',
                                                                    }}
                                                                    title={tooltip}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-5 bg-gray-50 rounded-md flex items-center justify-center text-[10px] text-gray-400 border border-gray-100">
                                                        No events
                                                    </div>
                                                )}

                                                {/* Event chips */}
                                                {feeder.events.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {feeder.events.slice(0, 3).map((ev, ei) => {
                                                            const label = ev.isLive
                                                                ? `LIVE ${formatDuration(ev.duration)}`
                                                                : `${formatDateTime(ev.start)} ${formatDuration(ev.duration)}`;
                                                            const tooltip = ev.isLive
                                                                ? `Ongoing · ${formatDuration(ev.duration)}`
                                                                : `${formatDateTime(ev.start)} → ${formatDateTime(ev.end)} (${formatDuration(ev.duration)})`;

                                                            return (
                                                                <span
                                                                    key={ev.id}
                                                                    title={tooltip}
                                                                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium truncate max-w-[140px] ${ev.isLive
                                                                            ? 'bg-red-100 text-red-600 border border-red-200'
                                                                            : 'bg-gray-100 text-gray-600'
                                                                        }`}
                                                                    style={
                                                                        !ev.isLive
                                                                            ? { borderLeft: `2.5px solid ${colors[ei % colors.length]}` }
                                                                            : {}
                                                                    }
                                                                >
                                                                    {label}
                                                                </span>
                                                            );
                                                        })}
                                                        {feeder.events.length > 3 && (
                                                            <span
                                                                className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full"
                                                                title={`${feeder.events.length - 3} more events`}
                                                            >
                                                                +{feeder.events.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
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