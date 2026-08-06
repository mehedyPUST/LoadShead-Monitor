'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';

const AddLoadshedModal = dynamic(() => import('@/components/modals/AddLoadshedModal'), { ssr: false });
const EditLoadshedModal = dynamic(() => import('@/components/modals/EditLoadshedModal'), { ssr: false });
const WithdrawModal = dynamic(() => import('@/components/modals/WithdrawModal'), { ssr: false });

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
    const { user } = useAuth();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [liveRecord, setLiveRecord] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 🔥 Client-side live duration counter
    const [liveDuration, setLiveDuration] = useState(0);

    // Find live record for this feeder
    const liveRecordData = useMemo(() =>
        records.find(r => r.isLive === true),
        [records]);

    // 🔥 Update live duration every second when there's a live record
    useEffect(() => {
        if (liveRecordData) {
            const updateDuration = () => {
                const now = new Date();
                const startTime = new Date(liveRecordData.startTime);
                setLiveDuration(Math.round((now - startTime) / 60000));
            };

            updateDuration(); // Initial calculation
            const interval = setInterval(updateDuration, 1000); // Update every second

            return () => clearInterval(interval);
        } else {
            setLiveDuration(0);
        }
    }, [liveRecordData]);

    // 🔥 Use live duration for live events, stored duration for completed
    const totalDuration = useMemo(() =>
        records.reduce((sum, r) => {
            if (r.isLive) {
                return sum + liveDuration; // Use real-time counter
            }
            return sum + (r.duration || 0);
        }, 0),
        [records, liveDuration]);

    const eventCount = records.length;

    const percentage = useMemo(() =>
        maxDuration > 0 ? (totalDuration / maxDuration) * 100 : 0,
        [totalDuration, maxDuration]);

    const getBarColor = useCallback(() => {
        if (liveRecordData) return 'bg-red-500'; // 🔴 Live event
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
                className={`card overflow-hidden border-l-4 ${liveRecordData ? 'border-l-red-500' : 'border-l-emerald-500'}`}
            >
                <div className="p-5">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                ⚡ {feeder.name}
                                {liveRecordData && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        LIVE
                                    </span>
                                )}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Total: <span className={`font-bold ${liveRecordData ? 'text-red-600' : 'text-red-600'}`}>
                                    {totalDuration}
                                </span> mins
                                · Events: <span className="font-bold">{eventCount}</span>
                                {liveRecordData && (
                                    <span className="ml-2 text-red-600 font-medium">
                                        · Started: {formatEventDateTime(liveRecordData.startTime)}
                                        {' '}({liveDuration} mins ago)
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {canAdd && !liveRecordData && (
                                <>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="btn-primary text-sm px-3 py-1.5"
                                    >
                                        ➕ Add
                                    </button>
                                    <button
                                        onClick={() => setIsLiveModalOpen(true)}
                                        className="bg-red-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-1"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                        Live
                                    </button>
                                </>
                            )}
                            {canAdd && liveRecordData && (
                                <button
                                    onClick={() => openWithdrawModal(liveRecordData)}
                                    className="bg-yellow-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-yellow-600 transition flex items-center gap-1"
                                >
                                    ⏹️ Withdraw
                                </button>
                            )}
                            <Link
                                href={`/feeder/${feeder.id}`}
                                className="btn-secondary text-sm px-3 py-1.5"
                            >
                                📋 Details
                            </Link>
                        </div>
                    </div>

                    {/* Horizontal Bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Loadshed Amount</span>
                            <span className={liveRecordData ? 'text-red-600 font-medium' : ''}>
                                {totalDuration} mins
                                {liveRecordData && ' ↑'}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{
                                    duration: liveRecordData ? 0.3 : 0.8,
                                    delay: 0.2
                                }}
                                className={`h-full rounded-full transition-all ${getBarColor()} ${liveRecordData ? 'animate-pulse' : ''}`}
                                style={liveRecordData ? {
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                                } : {}}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-0.5">
                            <span>0</span>
                            <span>{Math.round(maxDuration * 0.25)}</span>
                            <span>{Math.round(maxDuration * 0.5)}</span>
                            <span>{Math.round(maxDuration * 0.75)}</span>
                            <span>{maxDuration}</span>
                        </div>
                    </div>

                    {/* Events List */}
                    {records.length > 0 ? (
                        <div className="mt-3 space-y-1.5">
                            {records.map((record, idx) => (
                                <div
                                    key={record.id}
                                    className={`text-sm bg-gray-50 p-2 rounded flex justify-between items-center hover:bg-gray-100 transition group ${record.isLive ? 'border-l-4 border-red-500 bg-red-50/50' : ''}`}
                                >
                                    <span className="truncate">
                                        {record.isLive ? '🔴' : `Event #${idx + 1}`}:
                                        {formatEventDateTime(record.startTime)} → {record.isLive ? `🔴 LIVE (${liveDuration} mins)` : formatEventDateTime(record.endTime)}
                                        {record.operator?.name && (
                                            <span className="text-gray-500 ml-2">by {record.operator.name}</span>
                                        )}
                                        {record.reason && (
                                            <span className="text-gray-400 ml-2 text-xs">({record.reason})</span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${record.isLive ? 'text-red-600 animate-pulse' : 'text-red-600'}`}>
                                            {record.isLive ? `${liveDuration} mins` : `${record.duration} mins`}
                                        </span>
                                        {canEdit && !record.isLive && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => openEditModal(record)}
                                                    className="text-blue-500 hover:text-blue-700 text-xs font-medium px-1"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-medium px-1"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 mt-3">⚪ No loadshed events {periodLabel}</p>
                    )}
                </div>
            </motion.div>

            {/* Add Loadshed Modal - Full Mode */}
            <AddLoadshedModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                substation={substation}
                feeder={feeder}
                onSuccess={handleRecordAdded}
                mode="full"
            />

            {/* Add Loadshed Modal - Live Mode */}
            <AddLoadshedModal
                isOpen={isLiveModalOpen}
                onClose={() => setIsLiveModalOpen(false)}
                substation={substation}
                feeder={feeder}
                onSuccess={handleRecordAdded}
                mode="live"
            />

            {/* Edit Modal */}
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

            {/* Withdraw Modal */}
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
        </>
    );
}