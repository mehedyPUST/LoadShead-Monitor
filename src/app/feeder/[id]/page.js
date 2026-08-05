'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import EditLoadshedModal from '@/components/modals/EditLoadshedModal';
import AddLoadshedModal from '@/components/modals/AddLoadshedModal'; // ✅ NEW
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

// ===== HELPER: FORMAT DATE TO "1st August 2026" =====
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

// ===== HELPER: FORMAT EVENT DATE & TIME (DD/MM HH:MM) =====
const formatEventDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month} ${time}`;
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

    // For modals
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); // ✅ NEW
    const [isDeleting, setIsDeleting] = useState(false);

    // ===== FETCH DATA =====
    const fetchData = useCallback(async (filterType = filter, range = null) => {
        try {
            setLoading(true);
            setNoData(false);

            // Find feeder
            const substationsRes = await api.getSubstations();
            let foundFeeder = null;
            let foundSubstation = null;
            if (substationsRes.success) {
                for (const ss of substationsRes.data) {
                    const ssDetail = await api.getSubstation(ss.id);
                    if (ssDetail.success) {
                        const feeder = ssDetail.data.feeders?.find(f => f.id === feederId);
                        if (feeder) {
                            foundFeeder = { ...feeder, substation: ssDetail.data };
                            foundSubstation = ssDetail.data;
                            break;
                        }
                    }
                }
            }
            setFeeder(foundFeeder);

            // Fetch records
            let recordsRes;
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) {
                recordsRes = await api.getRecords({
                    feederId,
                    startDate: range.startDate,
                    endDate: range.endDate,
                });
            } else {
                recordsRes = await api.getRecordsByFeeder(feederId, filterType);
            }

            if (recordsRes.success) {
                setRecords(recordsRes.data);
                setNoData(recordsRes.data.length === 0);
            }
        } catch (error) {
            console.error('Error fetching feeder data:', error);
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

    // Initial fetch
    useEffect(() => {
        fetchData('today');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== COMPUTED LABELS =====
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
            default: return 'today';
        }
    };

    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);

    // ===== EDIT / DELETE / ADD HANDLERS =====
    const canEdit = () => {
        if (!user || !feeder) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') {
            return user.substationId === feeder.substation.id;
        }
        return false;
    };

    const openEditModal = (record) => {
        setSelectedRecord(record);
        setIsEditModalOpen(true);
    };

    const handleRecordUpdated = async () => {
        await fetchData(filter, dateRange);
        setIsEditModalOpen(false);
        setSelectedRecord(null);
    };

    const handleRecordAdded = async () => {
        await fetchData(filter, dateRange);
        setIsAddModalOpen(false);
    };

    const handleDelete = async (recordId) => {
        if (!confirm('Are you sure you want to delete this loadshed record?')) return;
        setIsDeleting(true);
        try {
            const response = await api.deleteRecord(recordId);
            if (response.success) {
                await fetchData(filter, dateRange);
            } else {
                alert('Failed to delete record');
            }
        } catch (error) {
            alert('Error deleting record');
        } finally {
            setIsDeleting(false);
        }
    };

    // ===== RENDER =====
    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </Layout>
        );
    }

    if (!feeder) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <p className="text-xl text-gray-600">Feeder not found</p>
                    <Link href="/" className="text-emerald-600 hover:underline mt-4 inline-block">
                        ← Go back home
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Link
                href={`/substation/${feeder.substation.id}`}
                className="text-emerald-600 hover:underline mb-4 inline-block font-medium"
            >
                ← Back to {feeder.substation.name}
            </Link>

            <div className="card p-6 mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">⚡ {feeder.name}</h1>
                        <p className="text-gray-500">{feeder.substation.name} | {feeder.substation.code}</p>
                        <p className="text-sm text-gray-400 mt-1">{feeder.substation.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="badge badge-red">Events: {records.length}</span>
                        <span className="badge badge-yellow">Total Duration: {totalDuration} mins</span>
                        {canEdit() && <span className="badge badge-emerald">✅ Can Edit</span>}
                    </div>
                </div>
            </div>

            <FilterBar
                activeFilter={filter}
                onFilterChange={handleFilterChange}
                filterLabel={getFilterLabel()}
            />

            {/* ===== ADD BUTTON ===== */}
            {canEdit() && (
                <div className="mb-4">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        ➕ Add Loadshed Event
                    </button>
                </div>
            )}

            {noData && (
                <div className="card p-12 text-center my-6">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-gray-700">No loadshed records found</h3>
                    <p className="text-gray-500 mt-2">
                        There are no loadshed events for this feeder {getPeriodLabel()}.
                    </p>
                </div>
            )}

            {!noData && (
                <div className="space-y-3">
                    {records.map((record, idx) => (
                        <div key={record.id} className="card p-4 border-l-4 border-red-500">
                            <div className="flex flex-wrap justify-between items-start gap-2">
                                <div>
                                    <p className="font-medium text-gray-800">
                                        Event #{idx + 1}: {formatEventDateTime(record.startTime)} → {formatEventDateTime(record.endTime)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Date: {new Date(record.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {record.operator?.name && ` | Operator: ${record.operator.name}`}
                                    </p>
                                    {record.reason && <p className="text-sm text-gray-500">Reason: {record.reason}</p>}
                                    {record.loadshedMW && <p className="text-sm text-gray-500">Load: {record.loadshedMW} MW</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-600 text-lg">{record.duration} mins</span>
                                    {canEdit() && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditModal(record)}
                                                className="text-blue-500 hover:text-blue-700 text-sm font-medium px-1"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium px-1"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {selectedRecord && (
                <EditLoadshedModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedRecord(null);
                    }}
                    record={selectedRecord}
                    substation={feeder.substation}
                    feeder={feeder}
                    onSuccess={handleRecordUpdated}
                />
            )}

            {/* Add Modal */}
            <AddLoadshedModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                substation={feeder.substation}
                feeder={feeder}
                onSuccess={handleRecordAdded}
            />
        </Layout>
    );
}