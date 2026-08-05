'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/common/Layout';
import FilterBar from '@/components/substation/FilterBar';
import FeederCard from '@/components/substation/FeederCard';
import VerticalBarChart from '@/components/substation/VerticalBarChart';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

// ===== HELPER: ORDINAL SUFFIX =====
const getOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ===== HELPER: FORMAT DATE TO "1st August 2026" =====
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
        } else {
            return dateStr;
        }
    }

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

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

    // ====== ALL HOOKS CALLED UNCONDITIONALLY ======
    const fetchData = useCallback(async (filterType = filter, range = null) => {
        try {
            setLoading(true);
            setNoData(false);
            console.log('🔄 Fetching substation data for:', id, 'filter:', filterType, 'range:', range);

            const substationRes = await api.getSubstation(id);
            if (substationRes.success) {
                setSubstation(substationRes.data);
                console.log('✅ Substation loaded:', substationRes.data.name);
            }

            let recordsRes;
            if (range && (filterType === 'customDate' || filterType === 'customMonth')) {
                recordsRes = await api.getRecordsBySubstationWithDates(id, range.startDate, range.endDate);
            } else {
                recordsRes = await api.getRecordsBySubstation(id, filterType);
            }

            if (recordsRes.success) {
                setRecords(recordsRes.data);
                setNoData(recordsRes.data.length === 0);
                console.log('📊 Records fetched:', recordsRes.data.length);
            }
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            setNoData(true);
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

    const handleRecordAdded = useCallback(async () => {
        console.log('🔄 Record added, refetching data...');
        await fetchData(filter, dateRange);
    }, [filter, dateRange, fetchData]);

    // Initial fetch on mount
    useEffect(() => {
        fetchData('today');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ====== COMPUTED FILTER LABEL (with actual dates) ======
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
            case 'today':
                return `Today (${getTodayReadable()})`;
            case 'yesterday':
                return `Yesterday (${getDateDaysAgo(1)})`;
            case 'last7days':
                return `Last 7 Days (${getDateDaysAgo(6)} – ${getTodayReadable()})`;
            case 'last15days':
                return `Last 15 Days (${getDateDaysAgo(14)} – ${getTodayReadable()})`;
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
            default:
                return '';
        }
    };

    // ====== EARLY RETURNS ======
    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </Layout>
        );
    }

    if (!substation) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <p className="text-xl text-gray-600">Substation not found</p>
                    <Link href="/" className="text-emerald-600 hover:underline mt-4 inline-block">
                        ← Go back home
                    </Link>
                </div>
            </Layout>
        );
    }

    // ====== DERIVED DATA ======
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const feeders = substation.feeders || [];
    const maxDuration = Math.max(
        ...feeders.map(feeder => {
            const feederRecords = records.filter(r => r.feederId === feeder.id);
            return feederRecords.reduce((sum, r) => sum + r.duration, 0);
        }),
        1
    );

    const canAddRecord = () => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') {
            return user.substationId === id;
        }
        return false;
    };

    // ====== RENDER ======
    return (
        <Layout>
            <Link href="/" className="text-emerald-600 hover:underline mb-4 inline-block font-medium">
                ← All Substations
            </Link>

            <div className="card p-6 mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">🏭 {substation.name}</h1>
                        <p className="text-gray-500">{substation.code} | {substation.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="badge badge-blue">Feeders: {substation.feeders?.length || 0}</span>
                        <span className="badge badge-red">Sheds: {records.length}</span>
                        <span className="badge badge-yellow">Duration: {records.reduce((s, r) => s + r.duration, 0)} mins</span>
                        {canAddRecord() && <span className="badge badge-emerald">✅ Can Add Data</span>}
                    </div>
                </div>
            </div>

            <FilterBar
                activeFilter={filter}
                onFilterChange={handleFilterChange}
                filterLabel={getFilterLabel()}
            />

            {noData && (
                <div className="card p-12 text-center my-6">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-gray-700">No loadshed records found</h3>
                    <p className="text-gray-500 mt-2">
                        There are no loadshed records for the selected period.
                        {canAddRecord() && ' You can add a new record using the "Add" button on any feeder.'}
                    </p>
                </div>
            )}

            {!noData && (
                <>
                    <div className="mb-8">
                        <VerticalBarChart feeders={feeders} records={records} />
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
                                    canAdd={canAddRecord()}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </Layout>
    );
}