'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, apiCall } from '@/utils/api';

export default function WithdrawModal({
    isOpen,
    onClose,
    record,
    substation,
    feeder,
    onSuccess
}) {
    const [formData, setFormData] = useState({
        endDate: '',
        endTime: '',
        reason: '',
    });

    const [endDay, setEndDay] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [endYear, setEndYear] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [overlapError, setOverlapError] = useState(null);
    const [showOverlapModal, setShowOverlapModal] = useState(false);

    const endMonthRef = useRef(null);
    const endYearRef = useRef(null);
    const endMinuteRef = useRef(null);

    const toNamedDate = (iso) => {
        if (!iso) return '';
        const date = new Date(iso + 'T00:00:00');
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getHour = (time) => (time ? time.split(':')[0] || '' : '');
    const getMinute = (time) => (time ? time.split(':')[1] || '' : '');

    const normalize = (value, max) => {
        let num = parseInt(value || '0', 10);
        if (isNaN(num)) num = 0;
        return String(Math.min(Math.max(num, 0), max)).padStart(2, '0');
    };

    const buildDate = (d, m, y) => {
        if (!d || !m || !y || y.length < 4) return '';
        const day = normalize(d, 31);
        const month = normalize(m, 12);
        return `${y}-${month}-${day}`;
    };

    const formatEventDateTime = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day}/${month} ${time}`;
    };

    // Set current time when modal opens
    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            setFormData({
                endDate: `${year}-${month}-${day}`,
                endTime: `${hours}:${minutes}`,
                reason: record?.reason || '',
            });

            setEndDay(day);
            setEndMonth(month);
            setEndYear(String(year));

            setError('');
            setOverlapError(null);
            setShowOverlapModal(false);
        }
    }, [isOpen, record]);

    const handleDateSegment = (type, part, value, nextRef) => {
        const cleaned = value.replace(/\D/g, '');
        const limited = part === 'year' ? cleaned.slice(0, 4) : cleaned.slice(0, 2);

        if (part === 'day') setEndDay(limited);
        if (part === 'month') setEndMonth(limited);
        if (part === 'year') setEndYear(limited);

        const iso = buildDate(
            part === 'day' ? limited : endDay,
            part === 'month' ? limited : endMonth,
            part === 'year' ? limited : endYear
        );
        if (iso) setFormData(prev => ({ ...prev, endDate: iso }));

        if (limited.length === (part === 'year' ? 4 : 2) && nextRef?.current) {
            nextRef.current.focus();
            nextRef.current.select();
        }

        setOverlapError(null);
        setShowOverlapModal(false);
    };

    const handleTimeSegment = (field, part, value, nextRef) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 2);
        const current = formData[field] || '00:00';
        const [h, m] = current.split(':');

        const newTime = part === 'hour'
            ? `${cleaned}:${m || '00'}`
            : `${h || '00'}:${cleaned}`;

        setFormData(prev => ({ ...prev, [field]: newTime }));

        if (cleaned.length === 2 && nextRef?.current) {
            nextRef.current.focus();
            nextRef.current.select();
        }

        setOverlapError(null);
        setShowOverlapModal(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setOverlapError(null);
        setShowOverlapModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setOverlapError(null);
        setShowOverlapModal(false);

        if (!formData.endDate || !formData.endTime) {
            setError('Please enter valid end date and time.');
            return;
        }

        const eDay = normalize(endDay, 31);
        const eMonth = normalize(endMonth, 12);
        const endIso = buildDate(eDay, eMonth, endYear);

        if (!endIso) {
            setError('Invalid end date.');
            return;
        }

        const endHour = normalize(getHour(formData.endTime), 23);
        const endMinute = normalize(getMinute(formData.endTime), 59);
        const endTime = `${endHour}:${endMinute}`;
        const end = new Date(`${endIso}T${endTime}`);

        if (isNaN(end.getTime())) {
            setError('Invalid end date/time.');
            return;
        }

        if (!record) {
            setError('No live record to withdraw.');
            return;
        }

        const start = new Date(record.startTime);
        if (end <= start) {
            setError('End time must be after start time.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                endTime: end.toISOString(),
                reason: formData.reason,
            };

            const response = await apiCall(`/records/${record.id}/withdraw`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });

            if (response.success) {
                if (onSuccess) await onSuccess();
                onClose();
            } else if (response.error === 'overlap') {
                setOverlapError(response);
                setShowOverlapModal(true);
            } else {
                setError(response.error || 'Failed to withdraw live event.');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    const modalKey = `withdraw-modal-${feeder?.id || 'wd'}`;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div key={modalKey} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center">
                                        <span className="text-yellow-600 text-lg">⏹️</span>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Withdraw Live Loadshed</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100/50 rounded-xl border border-yellow-200/60">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">🏭 {substation?.name}</p>
                                        <p className="text-sm text-gray-600">⚡ {feeder?.name}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="text-xs bg-red-200/70 text-red-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
                                            🔴 LIVE
                                        </span>
                                    </div>
                                </div>
                                {record && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Started: {formatEventDateTime(record.startTime)}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2.5">
                                    <span className="text-lg">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        End Date *
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={endDay}
                                            onChange={(e) => handleDateSegment('end', 'day', e.target.value, endMonthRef)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="DD"
                                            className="w-12 px-2 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                        />
                                        <span className="text-lg font-medium text-gray-400 select-none">/</span>
                                        <input
                                            ref={endMonthRef}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={endMonth}
                                            onChange={(e) => handleDateSegment('end', 'month', e.target.value, endYearRef)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="MM"
                                            className="w-12 px-2 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                        />
                                        <span className="text-lg font-medium text-gray-400 select-none">/</span>
                                        <input
                                            ref={endYearRef}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={endYear}
                                            onChange={(e) => handleDateSegment('end', 'year', e.target.value, null)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="YYYY"
                                            className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        {formData.endDate ? `✅ ${toNamedDate(formData.endDate)}` : 'DD / MM / YYYY'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        End Time *
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={getHour(formData.endTime)}
                                            onChange={(e) => handleTimeSegment('endTime', 'hour', e.target.value, endMinuteRef)}
                                            onBlur={(e) => handleTimeSegment('endTime', 'hour', normalize(e.target.value, 23), null)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="HH"
                                            className="w-12 px-2 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                        />
                                        <span className="text-lg font-medium text-gray-400 select-none">:</span>
                                        <input
                                            ref={endMinuteRef}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={2}
                                            value={getMinute(formData.endTime)}
                                            onChange={(e) => handleTimeSegment('endTime', 'minute', e.target.value, null)}
                                            onBlur={(e) => handleTimeSegment('endTime', 'minute', normalize(e.target.value, 59), null)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="MM"
                                            className="w-12 px-2 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5">24h (e.g., 14:30)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Reason
                                        <span className="text-gray-400 text-xs ml-1">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="reason"
                                        value={formData.reason}
                                        onChange={handleChange}
                                        placeholder="Power restored, maintenance complete..."
                                        className="input-field"
                                    />
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
                                        className="bg-yellow-500 text-white flex-1 py-2 rounded-lg font-medium hover:bg-yellow-600 transition disabled:opacity-50"
                                    >
                                        {loading ? 'Withdrawing...' : '⏹️ Withdraw Live'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Overlap Alert Modal */}
            {overlapError && (
                <AnimatePresence>
                    {showOverlapModal && (
                        <div key={`overlap-modal-${feeder?.id || 'ov'}`} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
                            >
                                <div className="text-center mb-4">
                                    <div className="text-5xl mb-3">⚠️</div>
                                    <h2 className="text-xl font-bold text-red-600">Overlapping Time Period!</h2>
                                    <p className="text-gray-600 mt-2">
                                        This time period overlaps with an existing loadshed record for <strong>{feeder?.name}</strong>.
                                    </p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                    <p className="text-sm text-red-700 font-medium">Existing Record:</p>
                                    <p className="text-sm text-red-600 mt-1">
                                        🕐 {overlapError.overlappingRecord
                                            ? new Date(overlapError.overlappingRecord.startTime).toLocaleString('en-GB')
                                            : 'Unknown'} → {overlapError.overlappingRecord
                                                ? new Date(overlapError.overlappingRecord.endTime).toLocaleString('en-GB')
                                                : 'Unknown'}
                                    </p>
                                    <p className="text-sm text-red-600">
                                        ⏱️ Duration: {overlapError.overlappingRecord?.duration || 0} minutes
                                    </p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                                    <p className="text-sm text-yellow-700">💡 Please adjust the end time to avoid overlap.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowOverlapModal(false); setOverlapError(null); }}
                                        className="btn-primary flex-1"
                                    >
                                        ✏️ Adjust Time
                                    </button>
                                    <button
                                        onClick={() => { setShowOverlapModal(false); setOverlapError(null); onClose(); }}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            )}
        </>
    );
}