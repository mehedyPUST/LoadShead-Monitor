'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/utils/api';

// Lazy load modals
const AddLoadshedModal = dynamic(
    () => import('@/components/modals/AddLoadshedModal'),
    { ssr: false }
);

const EditLoadshedModal = dynamic(
    () => import('@/components/modals/EditLoadshedModal'),
    { ssr: false }
);

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
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const eventCount = records.length;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const percentage = maxDuration > 0 ? (totalDuration / maxDuration) * 100 : 0;

    const getBarColor = () => {
        if (totalDuration === 0) return 'bg-gray-200';
        if (totalDuration < 30) return 'bg-emerald-400';
        if (totalDuration < 60) return 'bg-yellow-400';
        if (totalDuration < 120) return 'bg-orange-400';
        return 'bg-red-500';
    };

    const canEdit = () => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'sba') {
            return user.substationId === substation.id;
        }
        return false;
    };

    const handleRecordAdded = async () => {
        if (onRecordAdded) await onRecordAdded();
        setIsAddModalOpen(false);
    };

    const handleRecordUpdated = async () => {
        if (onRecordAdded) await onRecordAdded();
        setIsEditModalOpen(false);
        setSelectedRecord(null);
    };

    const openEditModal = (record) => {
        setSelectedRecord(record);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (recordId) => {
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
    };

    // Format event date & time (DD/MM HH:MM)
    const formatEventDateTime = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day}/${month} ${time}`;
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="card overflow-hidden border-l-4 border-l-emerald-500"
            >
                <div className="p-5">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                ⚡ {feeder.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Total: <span className="font-bold text-red-600">{totalDuration}</span> mins
                                &middot; Events: <span className="font-bold">{eventCount}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {canAdd && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="btn-primary text-sm px-3 py-1.5"
                                >
                                    ➕ Add
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
                            <span>{totalDuration} mins</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className={`h-full rounded-full transition-all ${getBarColor()}`}
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
                                    className="text-sm bg-gray-50 p-2 rounded flex justify-between items-center hover:bg-gray-100 transition group"
                                >
                                    <span className="truncate">
                                        Event #{idx + 1}: {formatEventDateTime(record.startTime)} → {formatEventDateTime(record.endTime)}
                                        {record.operator?.name && (
                                            <span className="text-gray-500 ml-2">by {record.operator.name}</span>
                                        )}
                                        {record.reason && (
                                            <span className="text-gray-400 ml-2 text-xs">({record.reason})</span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-red-600">{record.duration} mins</span>
                                        {canEdit() && (
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
                        <p className="text-sm text-gray-400 mt-3">
                            ⚪ No loadshed events {periodLabel}
                        </p>
                    )}
                </div>
            </motion.div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <AddLoadshedModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    substation={substation}
                    feeder={feeder}
                    onSuccess={handleRecordAdded}
                />
            )}

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
        </>
    );
}