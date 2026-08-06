'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
    periodLabel = 'today'
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

    const liveRecordData = useMemo(() => records.find(r => r.isLive === true), [records]);

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
    const percentage = useMemo(() => (maxDuration > 0 ? (totalDuration / maxDuration) * 100 : 0), [totalDuration, maxDuration]);

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

    const handleRecordAdded = useCallback(async () => {
        if (onRecordAdded) await onRecordAdded();
        setIsAddModalOpen(false);
        setIsLiveModalOpen(false);
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

    const handleDelete = useCallback(async (recordId) => {
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
    }, [onRecordAdded]);

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
                className={`card overflow-hidden border-l-4 group cursor-pointer relative ${liveRecordData ? 'border-l-red-500' : 'border-l-emerald-500'
                    }`}
            >
                {/* Hover overlay: "Click for details" */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10 pointer-events-none">
                    <span className="text-sm font-medium text-gray-700 bg-white/80 px-3 py-1.5 rounded-full shadow-sm">
                        Click for details →
                    </span>
                </div>

                <div className="p-3 sm:p-4 relative z-0">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                                ⚡ <span className="truncate">{feeder.name}</span>
                                {liveRecordData && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 animate-pulse">
                                        <span className="w-1 h-1 rounded-full bg-red-500"></span>LIVE
                                    </span>
                                )}
                                {user?.role === 'admin' && (
                                    <span
                                        className="inline-flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsEditFeederModalOpen(true); }}
                                            className="text-blue-500 hover:text-blue-700 text-xs"
                                            title="Edit Feeder"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFeeder(); }}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                            title="Delete Feeder"
                                        >
                                            🗑️
                                        </button>
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Total: <span className="font-bold text-red-600">{totalDuration}m</span> · Events:{' '}
                                <span className="font-bold">{eventCount}</span>
                                {liveRecordData && (
                                    <span className="ml-1 text-red-600 text-[10px]">
                                        · {liveDuration}m ago
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {canAdd && !liveRecordData && (
                                <>
                                    <button onClick={() => setIsAddModalOpen(true)} className="btn-primary text-xs px-2.5 py-1.5">
                                        ➕ Add
                                    </button>
                                    <button
                                        onClick={() => setIsLiveModalOpen(true)}
                                        className="bg-red-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-1"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>Live
                                    </button>
                                </>
                            )}
                            {canAdd && liveRecordData && (
                                <button
                                    onClick={() => openWithdrawModal(liveRecordData)}
                                    className="bg-yellow-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium hover:bg-yellow-600 transition"
                                >
                                    ⏹️ Withdraw
                                </button>
                            )}
                            <Link
                                href={`/feeder/${feeder.id}`}
                                className="btn-secondary text-xs px-2.5 py-1.5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                📋
                            </Link>
                        </div>
                    </div>

                    {/* Bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Loadshed</span>
                            <span className={liveRecordData ? 'text-red-600 font-medium' : ''}>
                                {totalDuration}m{liveRecordData && ' ↑'}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: liveRecordData ? 0.3 : 0.8 }}
                                className={`h-full rounded-full ${getBarColor()} ${liveRecordData ? 'animate-pulse' : ''}`}
                                style={liveRecordData ? { boxShadow: '0 0 8px rgba(239,68,68,0.5)' } : {}}
                            />
                        </div>
                    </div>

                    {/* Events list */}
                    {records.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {records.map((rec, idx) => (
                                <div
                                    key={rec.id}
                                    className={`text-xs bg-gray-50 p-1.5 rounded flex justify-between items-center group/item ${rec.isLive ? 'border-l-4 border-red-500 bg-red-50/50' : ''
                                        }`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span className="truncate">
                                        {rec.isLive ? '🔴' : `#${idx + 1}`}{' '}
                                        {formatEventDateTime(rec.startTime)} →{' '}
                                        {rec.isLive ? `LIVE (${liveDuration}m)` : formatEventDateTime(rec.endTime)}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`font-bold ${rec.isLive ? 'text-red-600 animate-pulse' : 'text-red-600'}`}>
                                            {rec.isLive ? `${liveDuration}m` : `${rec.duration}m`}
                                        </span>
                                        {canEdit && !rec.isLive && (
                                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100">
                                                <button onClick={() => openEditModal(rec)} className="text-blue-500 hover:text-blue-700 text-xs">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(rec.id)} className="text-red-500 hover:text-red-700 text-xs">
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

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