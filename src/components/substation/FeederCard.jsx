'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
    Zap,
    Pencil,
    Trash2,
    Plus,
    Square,
    ClipboardList,
    Radio,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';

const AddLoadshedModal = dynamic(() => import('@/components/modals/AddLoadshedModal'), { ssr: false });
const EditLoadshedModal = dynamic(() => import('@/components/modals/EditLoadshedModal'), { ssr: false });
const WithdrawModal = dynamic(() => import('@/components/modals/WithdrawModal'), { ssr: false });
const EditFeederModal = dynamic(() => import('@/components/modals/EditFeederModal'), { ssr: false });

export default function FeederCard({
    feeder,
    records,
    maxDuration,
    index,
    substation,
    onRecordAdded,
    canAdd = false,
    periodLabel = 'today',
}) {
    const router = useRouter();
    const { user } = useAuth();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isEditFeederModalOpen, setIsEditFeederModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [liveRecord, setLiveRecord] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeletingFeeder, setIsDeletingFeeder] = useState(false);
    const [liveDuration, setLiveDuration] = useState(0);

    const isEven = index % 2 === 0;

    const liveRecordData = useMemo(() => records.find((r) => r.isLive === true), [records]);

    useEffect(() => {
        if (liveRecordData) {
            const updateDuration = () => {
                const now = new Date();
                const startTime = new Date(liveRecordData.startTime);
                setLiveDuration(Math.round((now - startTime) / 60000));
            };
            updateDuration();
            const interval = setInterval(updateDuration, 1000);
            return () => clearInterval(interval);
        } else {
            setLiveDuration(0);
        }
    }, [liveRecordData]);

    const totalDuration = useMemo(
        () => records.reduce((sum, r) => (r.isLive ? sum + liveDuration : sum + (r.duration || 0)), 0),
        [records, liveDuration]
    );

    const eventCount = records.length;
    const percentage = useMemo(
        () => (maxDuration > 0 ? (totalDuration / maxDuration) * 100 : 0),
        [totalDuration, maxDuration]
    );

    const getBarColor = useCallback(() => {
        if (liveRecordData) return 'bg-red-500';
        if (totalDuration === 0) return 'bg-gray-200';
        if (totalDuration < 30) return 'bg-emerald-400';
        if (totalDuration < 60) return 'bg-yellow-400';
        if (totalDuration < 120) return 'bg-orange-400';
        return 'bg-red-500';
    }, [totalDuration, liveRecordData]);

    const canEdit = useMemo(() => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') return user.substationId === substation.id;
        return false;
    }, [user, substation]);

    const goToFeederDetails = useCallback(() => {
        router.push(`/feeder/${feeder.id}`);
    }, [router, feeder.id]);

    // ✅ FIX: Only refresh data – DO NOT close modal automatically
    const handleRecordAdded = useCallback(async () => {
        if (onRecordAdded) await onRecordAdded();
        // Modal stays open – user closes manually via Cancel or ✕
    }, [onRecordAdded]);

    const handleRecordUpdated = useCallback(async () => {
        if (onRecordAdded) await onRecordAdded();
        setIsEditModalOpen(false);
        setSelectedRecord(null);
        setIsWithdrawModalOpen(false);
        setLiveRecord(null);
        setIsEditFeederModalOpen(false);
    }, [onRecordAdded]);

    const openEditModal = useCallback((record) => {
        setSelectedRecord(record);
        setIsEditModalOpen(true);
    }, []);

    const openWithdrawModal = useCallback((record) => {
        setLiveRecord(record);
        setIsWithdrawModalOpen(true);
    }, []);

    const handleDelete = useCallback(
        async (recordId) => {
            if (!confirm('Are you sure you want to delete this loadshed record?')) return;
            setIsDeleting(true);
            try {
                const response = await api.deleteRecord(recordId);
                if (response.success) {
                    if (onRecordAdded) await onRecordAdded();
                } else {
                    alert('Failed to delete record');
                }
            } catch (error) {
                alert('Error deleting record');
            } finally {
                setIsDeleting(false);
            }
        },
        [onRecordAdded]
    );

    const handleDeleteFeeder = useCallback(async () => {
        if (!confirm(`Are you sure you want to delete feeder "${feeder.name}"? This action cannot be undone.`)) return;
        setIsDeletingFeeder(true);
        try {
            const response = await api.deleteFeeder(feeder.id);
            if (response.success) {
                if (onRecordAdded) await onRecordAdded();
            } else {
                alert(response.error || 'Failed to delete feeder');
            }
        } catch (error) {
            alert('Error deleting feeder');
        } finally {
            setIsDeletingFeeder(false);
        }
    }, [feeder, onRecordAdded]);

    const formatEventDateTime = useCallback((date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day}/${month} ${time}`;
    }, []);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={goToFeederDetails}
                className="group relative rounded-xl overflow-hidden cursor-pointer"
            >
                {/* alternating border (same as before) */}
                <div
                    className={`absolute inset-0 rounded-xl ${isEven
                            ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                            : 'bg-gradient-to-r from-purple-400 via-violet-300 to-purple-500'
                        } opacity-80`}
                />
                <div
                    className={`absolute -inset-[1px] rounded-xl blur-[1.5px] opacity-40 ${isEven
                            ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400'
                            : 'bg-gradient-to-r from-purple-400 via-violet-300 to-purple-500'
                        }`}
                />

                <div className="relative m-[1.5px] rounded-[10px] bg-white border border-gray-100/80 shadow-sm">
                    {/* hover overlay */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-sm font-medium text-gray-700 bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
                            Click for details →
                        </span>
                    </div>

                    <div className="p-3.5 sm:p-4 relative z-0">
                        {/* header */}
                        <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                                    <Zap
                                        size={16}
                                        className={`shrink-0 ${isEven ? 'text-emerald-600' : 'text-purple-600'}`}
                                    />
                                    <span className="truncate">{feeder.name}</span>

                                    {liveRecordData && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            LIVE
                                        </span>
                                    )}

                                    {user?.role === 'admin' && (
                                        <span
                                            className="inline-flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsEditFeederModalOpen(true);
                                                }}
                                                className="p-1 rounded text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                title="Edit Feeder"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFeeder();
                                                }}
                                                className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                                title="Delete Feeder"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </span>
                                    )}
                                </h3>

                                <p className="text-xs text-gray-500 mt-1">
                                    Total:{' '}
                                    <span className="font-semibold text-red-600 tabular-nums">{totalDuration}m</span>
                                    {' · '}Events:{' '}
                                    <span className="font-semibold tabular-nums">{eventCount}</span>
                                    {liveRecordData && (
                                        <span className="ml-1.5 text-red-600 text-[11px]">· {liveDuration}m ago</span>
                                    )}
                                </p>
                            </div>

                            <div
                                className="flex items-center gap-1.5 flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Link
                                    href={`/feeder/${feeder.id}`}
                                    className={`sm:hidden inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${isEven
                                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                            : 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100'
                                        }`}
                                >
                                    Details
                                    <ChevronRight size={13} />
                                </Link>

                                {canAdd && !liveRecordData && (
                                    <>
                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                                        >
                                            <Plus size={13} />
                                            Add
                                        </button>
                                        <button
                                            onClick={() => setIsLiveModalOpen(true)}
                                            className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium hover:bg-red-700 transition-colors"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            Live
                                        </button>
                                    </>
                                )}

                                {canAdd && liveRecordData && (
                                    <button
                                        onClick={() => openWithdrawModal(liveRecordData)}
                                        className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                                    >
                                        <Square size={12} />
                                        Withdraw
                                    </button>
                                )}

                                <Link
                                    href={`/feeder/${feeder.id}`}
                                    className="hidden sm:inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                                    title="View details"
                                >
                                    <ClipboardList size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3.5">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
                                <span>Loadshed</span>
                                <span className={`tabular-nums ${liveRecordData ? 'text-red-600 font-medium' : ''}`}>
                                    {totalDuration}m{liveRecordData && ' ↑'}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: liveRecordData ? 0.3 : 0.8 }}
                                    className={`h-full rounded-full ${getBarColor()} ${liveRecordData ? 'animate-pulse' : ''}`}
                                    style={liveRecordData ? { boxShadow: '0 0 8px rgba(239,68,68,0.45)' } : {}}
                                />
                            </div>
                        </div>

                        {/* Events list */}
                        {records.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {records.map((rec, idx) => (
                                    <div
                                        key={rec.id}
                                        className={`text-xs bg-gray-50/80 px-2.5 py-1.5 rounded-lg flex justify-between items-center group/item ${rec.isLive ? 'border-l-[3px] border-red-500 bg-red-50/40' : ''
                                            }`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span className="truncate flex items-center gap-1.5">
                                            {rec.isLive ? (
                                                <Radio size={12} className="text-red-500 shrink-0" />
                                            ) : (
                                                <span className="text-gray-400 font-medium">#{idx + 1}</span>
                                            )}
                                            {formatEventDateTime(rec.startTime)} →{' '}
                                            {rec.isLive ? `LIVE (${liveDuration}m)` : formatEventDateTime(rec.endTime)}
                                        </span>

                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`font-semibold tabular-nums ${rec.isLive ? 'text-red-600 animate-pulse' : 'text-red-600'
                                                    }`}
                                            >
                                                {rec.isLive ? `${liveDuration}m` : `${rec.duration}m`}
                                            </span>

                                            {canEdit && !rec.isLive && (
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEditModal(rec)}
                                                        className="p-1 rounded text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rec.id)}
                                                        className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Modals */}
            <AddLoadshedModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                substation={substation}
                feeder={feeder}
                onSuccess={handleRecordAdded}
                mode="full"
            />
            <AddLoadshedModal
                isOpen={isLiveModalOpen}
                onClose={() => setIsLiveModalOpen(false)}
                substation={substation}
                feeder={feeder}
                onSuccess={handleRecordAdded}
                mode="live"
            />
            {isEditModalOpen && selectedRecord && (
                <EditLoadshedModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedRecord(null);
                    }}
                    record={selectedRecord}
                    substation={substation}
                    feeder={feeder}
                    onSuccess={handleRecordUpdated}
                />
            )}
            <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => {
                    setIsWithdrawModalOpen(false);
                    setLiveRecord(null);
                }}
                record={liveRecord}
                substation={substation}
                feeder={feeder}
                onSuccess={handleRecordUpdated}
            />
            <EditFeederModal
                isOpen={isEditFeederModalOpen}
                onClose={() => setIsEditFeederModalOpen(false)}
                feeder={feeder}
                onSuccess={handleRecordUpdated}
            />
        </>
    );
}