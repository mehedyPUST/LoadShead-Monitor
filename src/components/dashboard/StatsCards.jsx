'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Zap,
    Radio,
    Gauge,
    Edit3,
    Check,
    X,
    AlertTriangle,
    RefreshCw,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiCall } from '@/utils/api';
import toast from 'react-hot-toast';
import Spinner from '@/components/common/Spinner';

// Format number
const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return Number(num).toLocaleString('en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    });
};

// Metric Edit Modal
const MetricEditModal = ({ isOpen, onClose, metrics, onSave }) => {
    const [formData, setFormData] = useState({
        allotmentMW: 0,
        demandMW: 0,
        imposedLoadshedMW: 0,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (metrics) {
            setFormData({
                allotmentMW: metrics.allotmentMW || 0,
                demandMW: metrics.demandMW || 0,
                imposedLoadshedMW: metrics.imposedLoadshedMW || 0,
            });
        }
    }, [metrics]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await apiCall('/metrics', {
                method: 'PUT',
                body: JSON.stringify(formData),
            });
            if (res.success) {
                toast.success('✅ Metrics updated successfully');
                if (onSave) onSave(res.data);
                onClose();
            } else {
                toast.error(res.error || 'Failed to update metrics');
            }
        } catch (error) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
                            <Gauge size={18} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Edit System Metrics</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700">
                        <Building2 size={12} className="inline mr-1" />
                        Bottail Main Grid — System-wide metrics
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Allotment (MW)
                        </label>
                        <input
                            type="number"
                            value={formData.allotmentMW}
                            onChange={(e) => setFormData({ ...formData, allotmentMW: parseFloat(e.target.value) || 0 })}
                            step="0.1"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                            required
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Total power received from national grid</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Current Demand (MW)
                        </label>
                        <input
                            type="number"
                            value={formData.demandMW}
                            onChange={(e) => setFormData({ ...formData, demandMW: parseFloat(e.target.value) || 0 })}
                            step="0.1"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                            required
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Total system power demand</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Imposed Loadshed (MW)
                        </label>
                        <input
                            type="number"
                            value={formData.imposedLoadshedMW}
                            onChange={(e) => setFormData({ ...formData, imposedLoadshedMW: parseFloat(e.target.value) || 0 })}
                            step="0.1"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Total imposed loadshed across all feeders</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">
                            <span className="font-medium">Required Loadshed:</span>{' '}
                            {formatNumber(Math.max(0, formData.demandMW - formData.allotmentMW))} MW
                            <span className="text-gray-400 ml-2">
                                (Demand − Allotment)
                            </span>
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5"
                        >
                            {loading ? <Spinner size={16} /> : <Check size={16} />}
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const StatsCards = memo(({ stats }) => {
    const router = useRouter();
    const { user } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [isMetricsLoading, setIsMetricsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [metricsError, setMetricsError] = useState(null);

    const totalSubstations = stats.totalSubstations || 0;
    const totalFeeders = stats.totalFeeders || 0;
    const liveCount = stats.liveCount || 0;

    // Check if user is Bottail SBA or Admin
    const BOTTAIL_SUBSTATION_ID = process.env.NEXT_PUBLIC_BOTTAIL_SUBSTATION_ID;
    const canEditMetrics = user?.role === 'admin' ||
        (user?.role === 'sba' && user?.substationId === BOTTAIL_SUBSTATION_ID);

    // Fetch metrics
    const fetchMetrics = useCallback(async () => {
        try {
            setIsMetricsLoading(true);
            setMetricsError(null);
            const res = await apiCall('/metrics');
            if (res.success) {
                setMetrics(res.data);
            } else {
                setMetricsError(res.error || 'Failed to load metrics');
            }
        } catch (error) {
            setMetricsError(error.message || 'Network error');
        } finally {
            setIsMetricsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    const handleMetricsUpdate = (updatedData) => {
        setMetrics(updatedData);
    };

    // Cards: Substations, Feeders, Live Loadshed (clickable), System Metrics
    const cards = [
        {
            label: 'Substations',
            value: totalSubstations,
            icon: Building2,
            color: 'border-purple-500 bg-purple-50/60',
            iconBg: 'bg-purple-100 text-purple-600',
            valueColor: 'text-purple-700',
            hint: 'Active grid substations',
        },
        {
            label: 'Feeders',
            value: totalFeeders,
            icon: Zap,
            color: 'border-blue-500 bg-blue-50/60',
            iconBg: 'bg-blue-100 text-blue-600',
            valueColor: 'text-blue-700',
            hint: 'Across all substations',
        },
        {
            label: 'Live Loadshed',
            value: liveCount,
            icon: Radio,
            color: liveCount > 0
                ? 'border-red-500 bg-red-50/60'
                : 'border-emerald-500 bg-emerald-50/60',
            iconBg: liveCount > 0
                ? 'bg-red-100 text-red-600'
                : 'bg-emerald-100 text-emerald-600',
            valueColor: liveCount > 0 ? 'text-red-700' : 'text-emerald-700',
            hint: liveCount > 0
                ? `${liveCount} feeder${liveCount !== 1 ? 's' : ''} currently in loadshed`
                : 'No active events',
            pulse: liveCount > 0,
            clickable: true,
            href: '/live',
        },
        // System Metrics – last card
        {
            label: 'System Metrics',
            value: '',
            icon: Gauge,
            color: 'border-emerald-500 bg-emerald-50/60',
            iconBg: 'bg-emerald-100 text-emerald-600',
            valueColor: 'text-emerald-700',
            hint: 'Bottail Main Grid',
            isMetrics: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {cards.map((card, index) => {
                const Icon = card.icon;

                // Render metrics card
                if (card.isMetrics) {
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.08 }}
                            className={`relative overflow-hidden rounded-xl border border-gray-100 border-l-4 border-emerald-500 bg-emerald-50/60 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1 ${canEditMetrics ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400/40' : ''}`}
                            onClick={() => {
                                if (canEditMetrics && !isMetricsLoading && !metricsError) {
                                    setIsEditModalOpen(true);
                                }
                            }}
                        >
                            {isMetricsLoading ? (
                                <div className="flex items-center justify-center h-14">
                                    <Spinner size={20} />
                                </div>
                            ) : metricsError ? (
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 text-red-500 text-xs">
                                        <AlertTriangle size={14} />
                                        <span>{metricsError}</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fetchMetrics();
                                        }}
                                        className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 mt-1.5 transition-colors"
                                    >
                                        <RefreshCw size={12} />
                                        Retry
                                    </button>
                                </div>
                            ) : metrics ? (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600">
                                                <Gauge size={14} />
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                                System Metrics
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                                        <div>
                                            <p className="text-[9px] text-gray-400">Allotment</p>
                                            <p className="text-sm font-bold text-emerald-700 tabular-nums">
                                                {formatNumber(metrics.allotmentMW)} MW
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400">Demand</p>
                                            <p className="text-sm font-bold text-blue-700 tabular-nums">
                                                {formatNumber(metrics.demandMW)} MW
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400">Required</p>
                                            <p className={`text-sm font-bold tabular-nums ${metrics.requiredLoadshedMW > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatNumber(metrics.requiredLoadshedMW)} MW
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400">Imposed Loadshed</p>
                                            <p className="text-sm font-bold text-orange-600 tabular-nums">
                                                {formatNumber(metrics.imposedLoadshedMW)} MW
                                            </p>
                                        </div>
                                    </div>

                                    {metrics.updatedBy && (
                                        <p className="text-[8px] text-gray-400 mt-1.5 border-t border-emerald-100 pt-1">
                                            Updated: {metrics.updatedBy}
                                            {metrics.updatedAt && ` · ${new Date(metrics.updatedAt).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}`}
                                        </p>
                                    )}

                                    {/* Hover overlay – edit */}
                                    {canEditMetrics && (
                                        <div className="absolute inset-0 bg-emerald-900/10 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-lg shadow-lg border border-emerald-200 text-emerald-700 text-sm font-medium">
                                                <Edit3 size={16} />
                                                Edit Metrics
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-xs text-gray-400">No metrics data</p>
                                    {canEditMetrics && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditModalOpen(true);
                                            }}
                                            className="text-[10px] text-emerald-600 hover:underline mt-1"
                                        >
                                            Add Metrics
                                        </button>
                                    )}
                                </div>
                            )}

                            {metrics?.requiredLoadshedMW > 0 && (
                                <div className="absolute top-0 right-0 p-1">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[8px] font-medium">
                                        <AlertTriangle size={10} />
                                        Deficit
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    );
                }

                // Regular cards (Substations, Feeders, Live Loadshed)
                const isClickable = card.clickable;
                return (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                        className={`relative overflow-hidden rounded-xl border border-gray-100 border-l-4 ${card.color} p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}`}
                        onClick={() => {
                            if (isClickable) {
                                router.push('/live');
                            }
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${card.iconBg} shrink-0`}>
                                <Icon
                                    size={18}
                                    strokeWidth={2}
                                    className={card.pulse ? 'animate-pulse' : ''}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                                    {card.label}
                                </p>
                                <p className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight mt-0.5 ${card.valueColor} ${card.pulse ? 'animate-pulse' : ''}`}>
                                    {card.value}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1 hidden sm:block truncate">
                                    {card.hint}
                                </p>
                            </div>
                            {isClickable && (
                                <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight size={16} className="text-gray-400" />
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}

            {/* Metrics Edit Modal */}
            <MetricEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                metrics={metrics}
                onSave={handleMetricsUpdate}
            />
        </div>
    );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;