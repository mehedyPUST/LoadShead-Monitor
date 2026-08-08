'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Building2,
    Clock,
    Radio,
    Users,
    MapPin,
    AlertTriangle,
    RefreshCw,
    ArrowLeft,
    Square,
    Eye,
    Activity
} from 'lucide-react';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import WithdrawModal from '@/components/modals/WithdrawModal';
import { apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const formatDuration = (mins) => {
    if (mins === 0) return '0 min';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${mins} min (${h}h)`;
    return `${mins} min (${h}h ${m}m)`;
};

const formatTime = (date) => {
    if (!date) return '--:--';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
    if (!date) return '--/--/----';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Compute elapsed time in seconds
const getElapsedSeconds = (startTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now - start) / 1000);
};

// Format elapsed time as HH:MM:SS
const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ---------- Skeleton ----------
const LiveSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-12 bg-gray-200 rounded-lg mb-3" />
                <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

export default function LivePage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [liveEvents, setLiveEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elapsedTimes, setElapsedTimes] = useState({});
    const refreshTimerRef = useRef(null);
    const isVisibleRef = useRef(true);

    // Withdraw modal state
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Fetch live events
    const fetchLiveEvents = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await apiCall('/records?status=live');
            if (res.success) {
                setLiveEvents(res.data || []);
            } else {
                setError(res.error || 'Failed to load live events');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchLiveEvents();
    }, [user]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        refreshTimerRef.current = setInterval(() => {
            if (isVisibleRef.current) fetchLiveEvents();
        }, 30000);

        const handleVisibility = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (document.visibilityState === 'visible') fetchLiveEvents();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(refreshTimerRef.current);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchLiveEvents]);

    // Update elapsed times every second
    useEffect(() => {
        const interval = setInterval(() => {
            const times = {};
            liveEvents.forEach((event) => {
                times[event.id] = getElapsedSeconds(event.startTime);
            });
            setElapsedTimes(times);
        }, 1000);
        return () => clearInterval(interval);
    }, [liveEvents]);

    // Open withdraw modal
    const openWithdrawModal = (event) => {
        setSelectedEvent(event);
        setWithdrawModalOpen(true);
    };

    // Close withdraw modal and refresh
    const handleWithdrawComplete = async () => {
        setWithdrawModalOpen(false);
        setSelectedEvent(null);
        await fetchLiveEvents();
    };

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
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/')}
                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600">
                                    <Radio size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                        Live Loadshed
                                    </h1>
                                    <p className="text-sm text-gray-500">
                                        {liveEvents.length} active event{liveEvents.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-medium text-red-600">LIVE</span>
                                <span className="text-xs text-red-500">·</span>
                                <span className="text-xs font-bold text-red-600 tabular-nums">
                                    {liveEvents.length}
                                </span>
                            </div>
                            <button
                                onClick={fetchLiveEvents}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <RefreshCw size={14} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Active Events', value: liveEvents.length, icon: Radio, color: 'text-red-600 bg-red-50' },
                        { label: 'Affected Feeders', value: liveEvents.length, icon: Zap, color: 'text-orange-600 bg-orange-50' },
                        { label: 'Substations', value: new Set(liveEvents.map(e => e.substationId)).size, icon: Building2, color: 'text-blue-600 bg-blue-50' },
                        { label: 'Operators', value: new Set(liveEvents.map(e => e.operatorId).filter(Boolean)).size, icon: Users, color: 'text-purple-600 bg-purple-50' },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.05 }}
                                className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm"
                            >
                                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.color}`}>
                                    <Icon size={17} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                                        {stat.label}
                                    </p>
                                    <p className="text-lg font-bold text-gray-900 tabular-nums">{stat.value}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {isLoading && <LiveSkeleton />}

                {error && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center my-6"
                    >
                        <AlertTriangle size={20} className="text-red-500 mx-auto mb-3" />
                        <p className="text-sm text-red-600 mb-4">{error}</p>
                        <button
                            onClick={fetchLiveEvents}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            <RefreshCw size={14} />
                            Retry
                        </button>
                    </motion.div>
                )}

                {!isLoading && !error && liveEvents.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center my-8"
                    >
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mx-auto mb-4">
                            <Activity size={30} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">No Active Live Events</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            All feeders are currently operating normally.
                            Live events will appear here automatically when a loadshed is started.
                        </p>
                    </motion.div>
                )}

                {/* Live Events Grid */}
                {!isLoading && !error && liveEvents.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <AnimatePresence>
                            {liveEvents.map((event, index) => {
                                const elapsed = elapsedTimes[event.id] || 0;
                                const feederName = event.feeder?.name || 'Unknown Feeder';
                                const substationName = event.substation?.name || 'Unknown Substation';
                                const operatorName = event.operator?.name || '—';
                                const reason = event.reason || 'No reason provided';
                                const loadshedMW = event.loadshedMW || null;

                                const canWithdraw = user?.role === 'admin' ||
                                    (user?.role === 'sba' && user?.substationId === event.substationId);

                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="bg-white rounded-xl border-2 border-red-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                                    >
                                        {/* Red top bar */}
                                        <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />

                                        <div className="p-5">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                                                            LIVE
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            · {formatDuration(elapsed)} elapsed
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-gray-900 truncate mt-1">
                                                        {feederName}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                        <Building2 size={13} />
                                                        <span className="truncate">{substationName}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    <div className="text-right">
                                                        <div className="text-2xl font-mono font-bold text-red-600 tabular-nums">
                                                            {formatElapsed(elapsed)}
                                                        </div>
                                                        <div className="text-[9px] text-gray-400 uppercase tracking-wider">
                                                            Elapsed
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">Started</p>
                                                    <p className="text-sm font-medium text-gray-700 tabular-nums">
                                                        {formatTime(event.startTime)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {formatDate(event.startTime)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase tracking-wider">Operator</p>
                                                    <p className="text-sm font-medium text-gray-700 truncate">
                                                        {operatorName}
                                                    </p>
                                                </div>
                                                {reason && (
                                                    <div className="col-span-2">
                                                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">Reason</p>
                                                        <p className="text-sm text-gray-600 truncate">{reason}</p>
                                                    </div>
                                                )}
                                                {loadshedMW && (
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 uppercase tracking-wider">Load</p>
                                                        <p className="text-sm font-medium text-gray-700">{loadshedMW} MW</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/feeder/${event.feederId}`)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    <Eye size={14} />
                                                    View Feeder
                                                </button>
                                                {canWithdraw ? (
                                                    <button
                                                        onClick={() => openWithdrawModal(event)}
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                                                    >
                                                        <Square size={14} />
                                                        Withdraw
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                                                    >
                                                        <Square size={14} />
                                                        Withdraw
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Withdraw Modal */}
            {selectedEvent && (
                <WithdrawModal
                    isOpen={withdrawModalOpen}
                    onClose={() => {
                        setWithdrawModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    record={selectedEvent}
                    substation={selectedEvent.substation}
                    feeder={selectedEvent.feeder}
                    onSuccess={handleWithdrawComplete}
                />
            )}
        </Layout>
    );
}