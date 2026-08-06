'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import EditLoadshedModal from '@/components/modals/EditLoadshedModal';
import AddLoadshedModal from '@/components/modals/AddLoadshedModal';
import EditFeederModal from '@/components/modals/EditFeederModal';
import Spinner from '@/components/common/Spinner';
import { api, apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const formatDateTime = (date) => {
    if (!date) return 'LIVE';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month} ${time}`;
};

const formatDuration = (mins) => {
    if (!mins && mins !== 0) return '—';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};

export default function FeederDetailsPage() {
    const params = useParams();
    const feederId = params.id;
    const { user } = useAuth();

    const [feeder, setFeeder] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('today');
    const [dateRange, setDateRange] = useState(null);
    const [customMonthLabel, setCustomMonthLabel] = useState('');
    const [noData, setNoData] = useState(false);
    const [error, setError] = useState(null);

    // Modals
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
    const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
    const [isEditFeederModalOpen, setIsEditFeederModalOpen] = useState(false);
    const [isDeletingRecord, setIsDeletingRecord] = useState(false);
    const [isDeletingFeeder, setIsDeletingFeeder] = useState(false);

    // Live duration counter
    const [liveDurations, setLiveDurations] = useState({});
    const liveIntervalRef = useRef(null);
    const refreshTimerRef = useRef(null);
    const isVisibleRef = useRef(true);

    const hasLiveRecords = useMemo(() => records.some(r => r.isLive), [records]);

    // Fetch feeder and records
    const fetchData = useCallback(async (filterType = filter, range = null) => {
        try {
            setLoading(true);
            setNoData(false);
            setError(null);

            const feederPromise = apiCall(`/feeders/${feederId}/with-substation`);
            let recordsPromise;
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) {
                recordsPromise = api.getRecords({ feederId, startDate: range.startDate, endDate: range.endDate });
            } else {
                recordsPromise = api.getRecordsByFeeder(feederId, filterType);
            }

            const [feederRes, recordsRes] = await Promise.all([feederPromise, recordsPromise]);

            if (feederRes.success) setFeeder(feederRes.data);
            else setError('Feeder not found');

            if (recordsRes.success) {
                setRecords(recordsRes.data);
                setNoData(recordsRes.data.length === 0);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to load data');
            setNoData(true);
        } finally {
            setLoading(false);
        }
    }, [feederId, filter]);

    // Filter change handler
    const handleFilterChange = useCallback((filterData) => {
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
    }, [fetchData]);

    // Initial load
    useEffect(() => {
        fetchData('today');
    }, []);

    // Auto-refresh live durations client-side
    useEffect(() => {
        if (hasLiveRecords) {
            liveIntervalRef.current = setInterval(() => {
                setLiveDurations(prev => {
                    const updated = { ...prev };
                    records.forEach(r => {
                        if (r.isLive) {
                            const start = new Date(r.startTime).getTime();
                            updated[r.id] = Math.round((Date.now() - start) / 60000);
                        }
                    });
                    return updated;
                });
            }, 1000);
        } else {
            setLiveDurations({});
        }
        return () => { if (liveIntervalRef.current) clearInterval(liveIntervalRef.current); };
    }, [hasLiveRecords, records]);

    // Auto-refresh data every 60s when live
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
    }, [hasLiveRecords, filter, dateRange, fetchData]);

    // Permissions
    const canEdit = useMemo(() => {
        if (!user || !feeder) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') return user.substationId === feeder.substation?.id;
        return false;
    }, [user, feeder]);

    // Record actions
    const openEditRecordModal = (record) => {
        setSelectedRecord(record);
        setIsEditRecordModalOpen(true);
    };

    const handleRecordUpdated = async () => {
        await fetchData(filter, dateRange);
        setIsEditRecordModalOpen(false);
        setSelectedRecord(null);
    };

    const handleRecordAdded = async () => {
        await fetchData(filter, dateRange);
        setIsAddRecordModalOpen(false);
    };

    const handleDeleteRecord = async (recordId) => {
        if (!confirm('Delete this loadshed record?')) return;
        setIsDeletingRecord(true);
        try {
            const res = await api.deleteRecord(recordId);
            if (res.success) await fetchData(filter, dateRange);
            else alert('Failed to delete');
        } catch (err) {
            alert('Error deleting record');
        } finally {
            setIsDeletingRecord(false);
        }
    };

    // Feeder actions
    const handleDeleteFeeder = async () => {
        if (!confirm(`Delete feeder "${feeder?.name}"? This cannot be undone.`)) return;
        setIsDeletingFeeder(true);
        try {
            const res = await api.deleteFeeder(feederId);
            if (res.success) {
                // Navigate back to substation
                window.location.href = `/substation/${feeder.substation.id}`;
            } else {
                alert(res.error || 'Failed to delete feeder');
            }
        } catch (err) {
            alert('Error deleting feeder');
        } finally {
            setIsDeletingFeeder(false);
        }
    };

    const getFilterLabel = () => {
        // simplified label
        const today = new Date().toISOString().split('T')[0];
        switch (filter) {
            case 'today': return `Today (${today})`;
            case 'yesterday': return 'Yesterday';
            case 'last7days': return 'Last 7 Days';
            case 'last15days': return 'Last 15 Days';
            case 'thisMonth': return 'This Month';
            case 'customDate': if (dateRange) return `${dateRange.startDate} – ${dateRange.endDate}`; return 'Custom Date';
            case 'customMonth': return customMonthLabel || 'Custom Month';
            case 'live': return '🔴 LIVE Events';
            default: return '';
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64"><Spinner size={48} /></div>
            </Layout>
        );
    }

    if (error || !feeder) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <p className="text-red-500 text-lg">{error || 'Feeder not found'}</p>
                    <Link href="/" className="text-emerald-600 underline text-sm mt-2 inline-block">← Go back</Link>
                </div>
            </Layout>
        );
    }

    const totalDuration = records.reduce((sum, r) => sum + (r.isLive ? (liveDurations[r.id] || 0) : (r.duration || 0)), 0);

    return (
        <Layout>
            {/* Breadcrumb */}
            <div className="mb-3">
                <Link href={`/substation/${feeder.substation?.id}`} className="text-xs text-emerald-600 hover:underline">
                    ← {feeder.substation?.name}
                </Link>
            </div>

            {/* Feeder Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4"
            >
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            ⚡ {feeder.name}
                            {hasLiveRecords && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>LIVE
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {feeder.substation?.name} · {feeder.substation?.code} · {feeder.substation?.location}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                            <span>Events: <strong>{records.length}</strong></span>
                            <span>Duration: <strong className="text-red-600">{formatDuration(totalDuration)}</strong></span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-start">
                        {canEdit && (
                            <>
                                <button
                                    onClick={() => setIsAddRecordModalOpen(true)}
                                    className="btn-primary text-xs px-3 py-1.5"
                                >
                                    ➕ Add Event
                                </button>
                                {user?.role === 'admin' && (
                                    <>
                                        <button
                                            onClick={() => setIsEditFeederModalOpen(true)}
                                            className="btn-secondary text-xs px-3 py-1.5"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={handleDeleteFeeder}
                                            className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 transition"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Filter Bar */}
            <div className="mb-4">
                <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} filterLabel={getFilterLabel()} />
            </div>

            {/* Records list */}
            {noData ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500"
                >
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm">No loadshed records found for this period.</p>
                    {canEdit && (
                        <button
                            onClick={() => setIsAddRecordModalOpen(true)}
                            className="btn-primary text-sm mt-3"
                        >
                            ➕ Add Event
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-2">
                    {records.map((record, idx) => {
                        const isLive = record.isLive;
                        const duration = isLive ? (liveDurations[record.id] || 0) : record.duration;
                        return (
                            <motion.div
                                key={record.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.03 }}
                                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 ${isLive ? 'border-red-300 bg-red-50/30' : ''
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm font-semibold ${isLive ? 'text-red-700' : 'text-gray-800'}`}>
                                                {isLive ? '🔴 Live Event' : `Event #${records.length - idx}`}
                                            </span>
                                            {record.operator?.name && (
                                                <span className="text-xs text-gray-500">by {record.operator.name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                            <span>{formatDateTime(record.startTime)}</span>
                                            <span>→</span>
                                            {isLive ? (
                                                <span className="text-red-600 font-semibold animate-pulse">LIVE ({duration}m)</span>
                                            ) : (
                                                <span>{formatDateTime(record.endTime)}</span>
                                            )}
                                        </div>
                                        {record.reason && (
                                            <p className="text-xs text-gray-400 mt-1">Reason: {record.reason}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <span className={`text-sm font-bold ${isLive ? 'text-red-600 animate-pulse' : 'text-red-600'}`}>
                                            {duration}m
                                        </span>
                                        {canEdit && !isLive && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openEditRecordModal(record)}
                                                    className="text-blue-500 hover:text-blue-700 text-xs px-1"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord(record.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs px-1"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            {selectedRecord && (
                <EditLoadshedModal
                    isOpen={isEditRecordModalOpen}
                    onClose={() => { setIsEditRecordModalOpen(false); setSelectedRecord(null); }}
                    record={selectedRecord}
                    substation={feeder.substation}
                    feeder={feeder}
                    onSuccess={handleRecordUpdated}
                />
            )}
            <AddLoadshedModal
                isOpen={isAddRecordModalOpen}
                onClose={() => setIsAddRecordModalOpen(false)}
                substation={feeder.substation}
                feeder={feeder}
                onSuccess={handleRecordAdded}
            />
            {feeder && (
                <EditFeederModal
                    isOpen={isEditFeederModalOpen}
                    onClose={() => setIsEditFeederModalOpen(false)}
                    feeder={feeder}
                    onSuccess={async () => {
                        const fres = await apiCall(`/feeders/${feederId}/with-substation`);
                        if (fres.success) setFeeder(fres.data);
                        setIsEditFeederModalOpen(false);
                    }}
                />
            )}
        </Layout>
    );
}