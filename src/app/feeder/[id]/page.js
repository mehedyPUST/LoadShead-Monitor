'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Building2,
    MapPin,
    ClipboardList,
    Clock,
    BarChart3,
    TrendingUp,
    Plus,
    Square,
    Inbox,
    Pencil,
    Trash2,
    ArrowLeft,
    FileText,
    Activity,
    Radio,
    CheckCircle2
} from 'lucide-react';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import EditLoadshedModal from '@/components/modals/EditLoadshedModal';
import AddLoadshedModal from '@/components/modals/AddLoadshedModal';
import WithdrawModal from '@/components/modals/WithdrawModal';
import Spinner from '@/components/common/Spinner';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatReadableDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const monthName = date.toLocaleString('en-GB', { month: 'long' });
    return `${getOrdinal(date.getDate())} ${monthName} ${date.getFullYear()}`;
};

const formatEventDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month} ${time}`;
};

const formatDuration = (minutes) => {
    if (minutes === 0) return '0 mins';
    if (minutes < 60) return `${minutes} mins`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${minutes} mins (${h}h)`;
    return `${minutes} mins (${h}h ${m}m)`;
};

const getDurationColor = (minutes) => {
    if (minutes === 0) return 'bg-gray-100 text-gray-400';
    if (minutes < 30) return 'bg-emerald-100 text-emerald-700';
    if (minutes < 60) return 'bg-yellow-100 text-yellow-700';
    if (minutes < 120) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
};

export default function FeederDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const feederId = params.id;
    const { user } = useAuth();

    const [feeder, setFeeder] = useState(null);
    const [records, setRecords] = useState([]);
    const [liveRecord, setLiveRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('today');
    const [dateRange, setDateRange] = useState(null);
    const [customMonthLabel, setCustomMonthLabel] = useState('');
    const [noData, setNoData] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showLiveOnly, setShowLiveOnly] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let interval;
        if (liveRecord) {
            const start = new Date(liveRecord.startTime);
            interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now - start) / 1000);
                setElapsedTime(diff);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [liveRecord]);

    const fetchData = useCallback(async (filterType = filter, range = null) => {
        try {
            setLoading(true);
            setNoData(false);

            const substationsRes = await api.getSubstations();
            let foundFeeder = null;
            let foundSubstation = null;
            if (substationsRes.success) {
                for (const ss of substationsRes.data) {
                    const ssDetail = await api.getSubstation(ss.id);
                    if (ssDetail.success) {
                        const f = ssDetail.data.feeders?.find(fd => fd.id === feederId);
                        if (f) {
                            foundFeeder = { ...f, substation: ssDetail.data };
                            foundSubstation = ssDetail.data;
                            break;
                        }
                    }
                }
            }
            setFeeder(foundFeeder);

            let recordsRes;
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) {
                recordsRes = await api.getRecords({ feederId, startDate: range.startDate, endDate: range.endDate });
            } else {
                recordsRes = await api.getRecordsByFeeder(feederId, filterType);
            }
            if (recordsRes.success) {
                const allRecords = recordsRes.data || [];
                const live = allRecords.find(r => r.status === 'live' || r.isLive === true);
                const completed = allRecords.filter(r => r.status !== 'live' && !r.isLive);
                setLiveRecord(live || null);
                setRecords(completed);
                setNoData(completed.length === 0 && !live);
            }
        } catch (error) {
            console.error(error);
            setNoData(true);
        } finally {
            setLoading(false);
        }
    }, [feederId, filter]);

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

    useEffect(() => {
        fetchData('today');
    }, []);

    const handleRecordAdded = async () => {
        await fetchData(filter, dateRange);
        setIsAddModalOpen(false);
    };

    const handleRecordUpdated = async () => {
        await fetchData(filter, dateRange);
        setIsEditModalOpen(false);
        setSelectedRecord(null);
    };

    const handleWithdrawComplete = async () => {
        await fetchData(filter, dateRange);
        setIsWithdrawModalOpen(false);
    };

    const handleDelete = async (recordId) => {
        if (!confirm('Are you sure you want to delete this loadshed record?')) return;
        setIsDeleting(true);
        try {
            const response = await api.deleteRecord(recordId);
            if (response.success) await fetchData(filter, dateRange);
            else alert('Failed to delete record');
        } catch (error) {
            alert('Error deleting record');
        } finally {
            setIsDeleting(false);
        }
    };

    const canEdit = () => {
        if (!user || !feeder) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') return user.substationId === feeder.substation.id;
        return false;
    };

    const getFilterLabel = () => {
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
            case 'today': return `Today (${getTodayReadable()})`;
            case 'yesterday': return `Yesterday (${getDateDaysAgo(1)})`;
            case 'last7days': return `Last 7 Days (${getDateDaysAgo(6)} – ${getTodayReadable()})`;
            case 'last15days': return `Last 15 Days (${getDateDaysAgo(14)} – ${getTodayReadable()})`;
            case 'thisMonth': {
                const now = new Date();
                const monthName = now.toLocaleString('en-GB', { month: 'long' });
                return `This Month (${monthName} ${now.getFullYear()})`;
            }
            case 'customDate':
                if (dateRange) {
                    return `Custom Date: ${formatReadableDate(dateRange.startDate)} – ${formatReadableDate(dateRange.endDate)}`;
                }
                return 'Custom Date';
            case 'customMonth':
                return customMonthLabel ? `Custom Month: ${customMonthLabel}` : 'Custom Month';
            default: return '';
        }
    };

    const getPeriodLabel = () => {
        const now = new Date();
        switch (filter) {
            case 'today': return 'today';
            case 'yesterday': return 'yesterday';
            case 'last7days': return 'the last 7 days';
            case 'last15days': return 'the last 15 days';
            case 'thisMonth': return `this month (${now.toLocaleString('en-GB', { month: 'long' })} ${now.getFullYear()})`;
            case 'customDate':
                if (dateRange) {
                    return `from ${formatReadableDate(dateRange.startDate)} to ${formatReadableDate(dateRange.endDate)}`;
                }
                return 'the selected period';
            case 'customMonth':
                return customMonthLabel ? `in ${customMonthLabel}` : 'the selected month';
            default: return 'today';
        }
    };

    const stats = useMemo(() => {
        const totalEvents = records.length;
        const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
        const avgDuration = totalEvents > 0 ? Math.round(totalDuration / totalEvents) : 0;
        const maxDuration = totalEvents > 0 ? Math.max(...records.map(r => r.duration)) : 0;
        const liveExists = !!liveRecord;
        return { totalEvents, totalDuration, avgDuration, maxDuration, liveExists };
    }, [records, liveRecord]);

    const formatElapsedTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    if (loading) return <Layout><div className="flex justify-center items-center h-64"><Spinner /></div></Layout>;
    if (!feeder) return <Layout><div className="text-center py-12">Feeder not found</div></Layout>;

    return (
        <Layout>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Breadcrumb */}
                <Link
                    href={`/substation/${feeder.substation.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-5 transition-colors"
                >
                    <ArrowLeft size={15} />
                    Back to {feeder.substation.name}
                </Link>

                {/* Feeder Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                                <Zap size={22} strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                                        {feeder.name}
                                    </h1>
                                    {stats.liveExists && (
                                        <motion.span
                                            animate={{ opacity: [1, 0.55, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-semibold border border-red-100"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            LIVE
                                        </motion.span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm text-gray-500">
                                    <span className="inline-flex items-center gap-1">
                                        <Building2 size={13} className="text-gray-400" />
                                        {feeder.substation.name}
                                    </span>
                                    <span className="text-gray-300">·</span>
                                    <span>{feeder.substation.code}</span>
                                    {feeder.substation.location && (
                                        <>
                                            <span className="text-gray-300">·</span>
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin size={13} className="text-gray-400" />
                                                {feeder.substation.location}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-xs">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                                Feeder
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 font-medium">
                                {stats.totalEvents} events
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                                {formatDuration(stats.totalDuration)}
                            </span>
                            {canEdit() && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                                    <CheckCircle2 size={12} />
                                    Can Edit
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {[
                        { label: 'Total Events', value: stats.totalEvents, icon: ClipboardList, color: 'border-blue-500 bg-blue-50/50', iconBg: 'bg-blue-100 text-blue-600' },
                        { label: 'Total Duration', value: formatDuration(stats.totalDuration), icon: Clock, color: 'border-purple-500 bg-purple-50/50', iconBg: 'bg-purple-100 text-purple-600' },
                        { label: 'Avg Duration', value: stats.avgDuration > 0 ? `${stats.avgDuration} mins` : '—', icon: BarChart3, color: 'border-emerald-500 bg-emerald-50/50', iconBg: 'bg-emerald-100 text-emerald-600' },
                        { label: 'Max Duration', value: stats.maxDuration > 0 ? `${stats.maxDuration} mins` : '—', icon: TrendingUp, color: 'border-red-500 bg-red-50/50', iconBg: 'bg-red-100 text-red-600' },
                    ].map((c, i) => {
                        const Icon = c.icon;
                        return (
                            <motion.div
                                key={c.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: i * 0.05 }}
                                className={`rounded-xl border border-gray-100 border-l-4 ${c.color} p-3.5 flex items-center gap-3 shadow-sm`}
                            >
                                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${c.iconBg} shrink-0`}>
                                    <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium truncate">{c.label}</p>
                                    <p className="text-base font-bold text-gray-900 tabular-nums truncate">{c.value}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Live Status Banner */}
                {stats.liveExists && liveRecord && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-4 mb-5 shadow-lg shadow-red-200/50"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
                                    <Radio size={18} className="text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm tracking-wide">LOADSHED IN PROGRESS</p>
                                    <p className="text-xs text-red-100/90 mt-0.5">
                                        Started: {formatEventDateTime(liveRecord.startTime)}
                                        {liveRecord.operator?.name && ` · Operator: ${liveRecord.operator.name}`}
                                    </p>
                                    {liveRecord.reason && (
                                        <p className="text-xs text-red-100/75 mt-0.5">Reason: {liveRecord.reason}</p>
                                    )}
                                    {liveRecord.loadshedMW && (
                                        <p className="text-xs text-red-100/75">Load: {liveRecord.loadshedMW} MW</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-mono font-bold tracking-wider tabular-nums">
                                        {formatElapsedTime(elapsedTime)}
                                    </p>
                                    <p className="text-[10px] text-red-100 uppercase tracking-wider">Elapsed</p>
                                </div>
                                {canEdit() && (
                                    <button
                                        onClick={() => setIsWithdrawModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 bg-white text-red-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-50 transition shadow-md"
                                    >
                                        <Square size={14} />
                                        Withdraw
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Actions & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {canEdit() && !stats.liveExists && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium bg-emerald-600 text-white px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <Plus size={15} />
                                Add Event
                            </button>
                        )}
                        {canEdit() && stats.liveExists && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                                <Zap size={12} />
                                Live in progress – Add disabled
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowLiveOnly(!showLiveOnly)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${showLiveOnly
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {showLiveOnly ? (
                                <>
                                    <Radio size={12} />
                                    Live Only
                                </>
                            ) : (
                                <>
                                    <ClipboardList size={12} />
                                    All Events
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <FilterBar activeFilter={filter} onFilterChange={handleFilterChange} filterLabel={getFilterLabel()} />

                {/* Empty State */}
                {noData && !stats.liveExists && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center my-6"
                    >
                        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-400 mx-auto mb-4">
                            <Inbox size={26} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 mb-1">No loadshed records</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            There are no events for this feeder {getPeriodLabel()}.
                            {canEdit() && !stats.liveExists && ' Click "Add Event" to log a new record.'}
                        </p>
                    </motion.div>
                )}

                {/* Event List */}
                {!noData && records.length > 0 && (
                    <div className="space-y-2 mt-5">
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1 pb-2 border-b border-gray-100">
                            <span className="font-medium">Event History</span>
                            <span>{records.length} event{records.length !== 1 ? 's' : ''}</span>
                        </div>

                        {records
                            .filter(r => showLiveOnly ? false : true)
                            .map((record, idx) => {
                                const isLive = record.status === 'live' || record.isLive === true;
                                if (isLive) return null;

                                return (
                                    <motion.div
                                        key={record.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 sm:p-4 hover:shadow-md transition-shadow border-l-4"
                                        style={{
                                            borderLeftColor: record.duration < 30
                                                ? '#10B981'
                                                : record.duration < 60
                                                    ? '#F59E0B'
                                                    : record.duration < 120
                                                        ? '#F97316'
                                                        : '#EF4444'
                                        }}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-gray-400 font-mono tabular-nums">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {formatEventDateTime(record.startTime)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">→</span>
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {formatEventDateTime(record.endTime)}
                                                    </span>
                                                    {record.operator?.name && (
                                                        <span className="text-xs text-gray-400">
                                                            · {record.operator.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getDurationColor(record.duration)}`}>
                                                        {formatDuration(record.duration)}
                                                    </span>
                                                    {record.reason && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                                                            <FileText size={11} />
                                                            {record.reason}
                                                        </span>
                                                    )}
                                                    {record.loadshedMW && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                                                            <Activity size={11} />
                                                            {record.loadshedMW} MW
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {canEdit() && (
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        onClick={() => { setSelectedRecord(record); setIsEditModalOpen(true); }}
                                                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(record.id)}
                                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                                        title="Delete"
                                                        disabled={isDeleting}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-5 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3">
                    Showing {records.length} records for {feeder.name} {getPeriodLabel()}
                </div>

                {/* Modals */}
                <AddLoadshedModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    substation={feeder.substation}
                    feeder={feeder}
                    onSuccess={handleRecordAdded}
                />

                {selectedRecord && (
                    <EditLoadshedModal
                        isOpen={isEditModalOpen}
                        onClose={() => { setIsEditModalOpen(false); setSelectedRecord(null); }}
                        record={selectedRecord}
                        substation={feeder.substation}
                        feeder={feeder}
                        onSuccess={handleRecordUpdated}
                    />
                )}

                {liveRecord && (
                    <WithdrawModal
                        isOpen={isWithdrawModalOpen}
                        onClose={() => setIsWithdrawModalOpen(false)}
                        record={liveRecord}
                        feeder={feeder}
                        substation={feeder.substation}
                        onSuccess={handleWithdrawComplete}
                    />
                )}
            </motion.div>
        </Layout>
    );
}