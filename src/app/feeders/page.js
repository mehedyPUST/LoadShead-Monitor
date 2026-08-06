'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import Spinner from '@/components/common/Spinner';
import { apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#F472B6', '#34D399', '#60A5FA', '#A78BFA', '#FBBF24'];

const formatDateTime = (date) => {
    if (!date) return 'LIVE';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};
const formatDuration = (mins) => mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60}m`;

const FeedersSkeleton = () => (
    <div className="space-y-4 mt-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="card overflow-hidden">
                <div className="px-3 py-2 border-b bg-gray-50"><Skeleton width={180} height={16} /></div>
                <div>{[1, 2, 3].map(j => <div key={j} className="px-3 py-2 border-b border-gray-50"><Skeleton height={20} className="mt-1" /></div>)}</div>
            </div>
        ))}
    </div>
);

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

    useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);

    const fetchData = useCallback(async (filterType = filter, range = null) => {
        try {
            setIsLoading(true); setError(null);
            let url = '/feeders/all-stats';
            const params = new URLSearchParams();
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) { params.append('startDate', range.startDate); params.append('endDate', range.endDate); }
            else params.append('view', filterType);
            if (params.toString()) url += '?' + params.toString();
            const res = await apiCall(url);
            if (res.success) { setFeeders(res.data); retryCountRef.current = 0; }
            else setError(res.error || 'Failed');
        } catch (err) { setError(err.message); if (retryCountRef.current < 1) { retryCountRef.current++; setTimeout(() => fetchData(filterType, range), 3000); } }
        finally { setIsLoading(false); }
    }, [filter]);

    const handleFilterChange = (fData) => {
        const { type, startDate, endDate, month, year } = fData; setFilter(type);
        if (type === 'customDate' && startDate && endDate) { setDateRange({ startDate, endDate }); setCustomMonthLabel(''); fetchData('customDate', { startDate, endDate }); }
        else if (type === 'customMonth' && month && year) { const mi = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month); const s = new Date(year, mi, 1); const e = new Date(year, mi + 1, 0); const ss = s.toISOString().split('T')[0]; const ee = e.toISOString().split('T')[0]; setDateRange({ startDate: ss, endDate: ee }); setCustomMonthLabel(`${month} ${year}`); fetchData('customMonth', { startDate: ss, endDate: ee }); }
        else { setDateRange(null); setCustomMonthLabel(''); fetchData(type); }
    };

    useEffect(() => { if (user) fetchData(); }, [user]);
    useEffect(() => {
        const hasLive = feeders.some(f => f.events.some(e => e.isLive));
        if (hasLive || filter === 'live') { refreshTimerRef.current = setInterval(() => { if (isVisibleRef.current) fetchData(filter, dateRange); }, 60000); }
        const hv = () => { isVisibleRef.current = document.visibilityState === 'visible'; if (document.visibilityState === 'visible' && (hasLive || filter === 'live')) fetchData(filter, dateRange); };
        document.addEventListener('visibilitychange', hv);
        return () => { clearInterval(refreshTimerRef.current); document.removeEventListener('visibilitychange', hv); };
    }, [feeders, filter, dateRange, fetchData]);

    const grouped = useMemo(() => {
        const g = {}; feeders.forEach(f => { const k = f.substationName || 'Unknown'; if (!g[k]) g[k] = { feeders: [], totalEvents: 0, hasLive: false, feederCount: 0, affected: 0 }; g[k].feeders.push(f); g[k].totalEvents += f.eventCount || 0; g[k].feederCount++; if (f.eventCount > 0) g[k].affected++; if (f.events.some(e => e.isLive)) g[k].hasLive = true; }); return g;
    }, [feeders]);

    const stats = useMemo(() => {
        const totalFeeders = feeders.length, active = feeders.filter(f => f.eventCount > 0).length, events = feeders.reduce((s, f) => s + f.eventCount, 0);
        const affectedSS = Object.keys(grouped).filter(k => grouped[k].totalEvents > 0).length, liveSS = Object.keys(grouped).filter(k => grouped[k].hasLive).length;
        return { totalFeeders, active, events, affectedSS, liveSS, totalSS: Object.keys(grouped).length };
    }, [feeders, grouped]);

    if (loading || !user) return <Layout><div className="flex justify-center items-center h-64"><Spinner size={48} /></div></Layout>;

    return (
        <Layout>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="mb-4">
                    <h1 className="text-xl font-bold text-gray-800">⚡ All Feeders</h1>
                    <p className="text-xs text-gray-500">{stats.totalSS} substations · {stats.totalFeeders} feeders {stats.liveSS > 0 && <span className="text-red-500 ml-2 animate-pulse">· 🔴 {stats.liveSS} live</span>}</p>
                </div>

                {/* Responsive stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                    {[
                        { l: 'SS', v: stats.totalSS, c: 'border-blue-500' },
                        { l: 'Feeders', v: stats.totalFeeders, c: 'border-purple-500' },
                        { l: 'Active', v: stats.active, c: 'border-red-500' },
                        { l: 'Events', v: stats.events, c: 'border-yellow-500' },
                        { l: 'Affected', v: stats.affectedSS, c: 'border-orange-500' },
                    ].map((c, i) => (
                        <motion.div key={c.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }} className={`card p-2.5 border-l-4 ${c.c}`}>
                            <p className="text-[10px] text-gray-400 uppercase">{c.l}</p>
                            <p className="text-lg font-bold text-gray-800">{c.v}</p>
                        </motion.div>
                    ))}
                </div>

                <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} filterLabel="All Feeders" />

                {isLoading && <FeedersSkeleton />}
                {error && !isLoading && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card p-8 text-center my-4">
                        <p className="text-red-500 mb-2">⚠️ {error}</p>
                        <button onClick={() => { setError(null); fetchData(filter, dateRange); }} className="btn-primary text-sm">🔄 Retry</button>
                    </motion.div>
                )}
                {!isLoading && !error && feeders.length === 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center my-4"><p className="text-gray-500">📭 No feeders</p></motion.div>
                )}

                {!isLoading && !error && feeders.length > 0 && (
                    <div className="space-y-3 mt-3">
                        {Object.entries(grouped).map(([ssName, group], gi) => (
                            <motion.div key={ssName} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: gi * 0.06 }} className="card overflow-hidden">
                                <div className={`px-3 py-2 border-b flex justify-between items-center ${group.hasLive ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span>🏭</span><span className="font-semibold text-gray-700">{ssName}</span>
                                        {group.hasLive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">🔴 LIVE</motion.span>}
                                    </div>
                                    <div className="text-[10px] text-gray-500">{group.feederCount} feeders · {group.affected} affected · {group.totalEvents} events</div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {group.feeders.map((feeder, fi) => {
                                        const hasLive = feeder.events.some(e => e.isLive);
                                        const maxDur = Math.max(...feeder.events.map(e => e.duration || 0), 1);
                                        return (
                                            <motion.div key={feeder.feederId} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: gi * 0.06 + fi * 0.02 }} className="px-3 py-2 hover:bg-gray-50/50 cursor-pointer" onClick={() => router.push(`/feeder/${feeder.feederId}`)}>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <h4 className="text-sm font-medium text-gray-700">⚡ {feeder.feederName} {hasLive && <span className="text-red-500 text-[10px] animate-pulse">LIVE</span>}</h4>
                                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{feeder.eventCount}</span>
                                                </div>
                                                {feeder.totalDuration > 0 ? (
                                                    <div className="relative w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                                                        {feeder.events.map((ev, ei) => {
                                                            const w = (ev.duration / maxDur) * 100;
                                                            const l = feeder.events.slice(0, ei).reduce((s, e) => s + (e.duration / maxDur) * 100, 0);
                                                            return <motion.div key={ev.id} initial={{ width: 0 }} animate={{ width: `${Math.max(w, 0.5)}%` }} transition={{ duration: 0.4, delay: ei * 0.05 }} className={`absolute top-0 h-full ${ev.isLive ? 'animate-pulse' : ''}`} style={{ left: `${l}%`, backgroundColor: ev.isLive ? '#EF4444' : colors[ei % colors.length], minWidth: '3px', boxShadow: ev.isLive ? '0 0 8px rgba(239,68,68,0.5)' : 'none' }} title={`${ev.isLive ? 'LIVE' : formatDateTime(ev.start) + '→' + formatDateTime(ev.end)} · ${ev.duration}m`} />;
                                                        })}
                                                    </div>
                                                ) : <div className="w-full h-5 bg-gray-50 rounded-full flex items-center justify-center text-[10px] text-gray-400">No events</div>}
                                                {feeder.events.length > 0 && (
                                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                                        {feeder.events.slice(0, 3).map((ev, ei) => (
                                                            <span key={ev.id} className={`text-[9px] px-1.5 py-0.5 rounded-full ${ev.isLive ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-gray-500 border-gray-150'}`} style={!ev.isLive ? { borderLeft: `2px solid ${colors[ei % colors.length]}` } : {}}>{ev.isLive ? `LIVE ${ev.duration}m` : `${formatDateTime(ev.start)} ${ev.duration}m`}</span>
                                                        ))}
                                                        {feeder.events.length > 3 && <span className="text-[9px] text-gray-400">+{feeder.events.length - 3}</span>}
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