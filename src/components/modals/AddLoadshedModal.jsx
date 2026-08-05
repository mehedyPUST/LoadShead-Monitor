'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';

export default function AddLoadshedModal({
    isOpen,
    onClose,
    substation,
    feeder,
    onSuccess
}) {
    const [formData, setFormData] = useState({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        reason: '',
        loadshedMW: '',
    });

    const [startDay, setStartDay] = useState('');
    const [startMonth, setStartMonth] = useState('');
    const [startYear, setStartYear] = useState('');
    const [endDay, setEndDay] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [endYear, setEndYear] = useState('');

    const [duration, setDuration] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [overlapError, setOverlapError] = useState(null);
    const [showOverlapModal, setShowOverlapModal] = useState(false);

    const startMonthRef = useRef(null);
    const startYearRef = useRef(null);
    const endMonthRef = useRef(null);
    const endYearRef = useRef(null);
    const startMinuteRef = useRef(null);
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

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const currentDate = now.toISOString().split('T')[0];
            const [y, m, d] = currentDate.split('-');
            const currentTime = now.toTimeString().slice(0, 5);
            const endNow = new Date(now);
            endNow.setHours(endNow.getHours() + 1);
            const endTime = endNow.toTimeString().slice(0, 5);

            setFormData({
                startDate: currentDate,
                startTime: currentTime,
                endDate: currentDate,
                endTime: endTime,
                reason: '',
                loadshedMW: '',
            });

            setStartDay(d);
            setStartMonth(m);
            setStartYear(y);
            setEndDay(d);
            setEndMonth(m);
            setEndYear(y);

            setDuration(0);
            setError('');
            setOverlapError(null);
            setShowOverlapModal(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);
            if (end > start) {
                setDuration(Math.round((end - start) / 60000));
            } else {
                setDuration(0);
            }
        } else {
            setDuration(0);
        }
    }, [formData.startDate, formData.startTime, formData.endDate, formData.endTime]);

    const handleDateSegment = (type, part, value, nextRef) => {
        const cleaned = value.replace(/\D/g, '');
        const limited = part === 'year' ? cleaned.slice(0, 4) : cleaned.slice(0, 2);

        if (type === 'start') {
            if (part === 'day') setStartDay(limited);
            if (part === 'month') setStartMonth(limited);
            if (part === 'year') setStartYear(limited);

            const d = part === 'day' ? limited : startDay;
            const m = part === 'month' ? limited : startMonth;
            const y = part === 'year' ? limited : startYear;
            const iso = buildDate(d, m, y);
            if (iso) setFormData(prev => ({ ...prev, startDate: iso }));
        } else {
            if (part === 'day') setEndDay(limited);
            if (part === 'month') setEndMonth(limited);
            if (part === 'year') setEndYear(limited);

            const d = part === 'day' ? limited : endDay;
            const m = part === 'month' ? limited : endMonth;
            const y = part === 'year' ? limited : endYear;
            const iso = buildDate(d, m, y);
            if (iso) setFormData(prev => ({ ...prev, endDate: iso }));
        }

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

        const sDay = normalize(startDay, 31);
        const sMonth = normalize(startMonth, 12);
        const eDay = normalize(endDay, 31);
        const eMonth = normalize(endMonth, 12);

        const startIso = buildDate(sDay, sMonth, startYear);
        const endIso = buildDate(eDay, eMonth, endYear);

        if (!startIso || !endIso || !formData.startTime || !formData.endTime) {
            setError('Please enter valid dates and times.');
            return;
        }

        const startHour = normalize(getHour(formData.startTime), 23);
        const startMinute = normalize(getMinute(formData.startTime), 59);
        const endHour = normalize(getHour(formData.endTime), 23);
        const endMinute = normalize(getMinute(formData.endTime), 59);

        const startTime = `${startHour}:${startMinute}`;
        const endTime = `${endHour}:${endMinute}`;

        const start = new Date(`${startIso}T${startTime}`);
        const end = new Date(`${endIso}T${endTime}`);

        if (end <= start) {
            setError('End time must be after start time.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                substationId: substation.id,
                feederId: feeder.id,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                reason: formData.reason,
                loadshedMW: formData.loadshedMW ? parseFloat(formData.loadshedMW) : null,
            };

            const response = await api.createRecord(payload);
            if (response.success) {
                if (onSuccess) await onSuccess();
                onClose();
            } else if (response.error === 'overlap') {
                setOverlapError(response);
                setShowOverlapModal(true);
            } else {
                setError(response.error || 'Failed to save record.');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Unique identifier for this modal instance
    const modalKey = `add-modal-${substation?.id || 'ss'}-${feeder?.id || 'fd'}`;

    return (
        <>
            {/* Main Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div key={modalKey} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <span className="text-emerald-600 text-lg">➕</span>
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Add New Loadshed</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200/60">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">🏭 {substation.name}</p>
                                        <p className="text-sm text-gray-600">⚡ {feeder.name}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <span className="text-xs bg-emerald-200/70 text-emerald-700 px-2.5 py-1 rounded-full font-medium">DD/MM/YYYY</span>
                                        <span className="text-xs bg-emerald-200/70 text-emerald-700 px-2.5 py-1 rounded-full font-medium">24h</span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2.5">
                                    <span className="text-lg">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* ... (rest of form – same as before) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Start Column */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-sm font-semibold text-gray-700">Start</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={startDay}
                                                        onChange={(e) => handleDateSegment('start', 'day', e.target.value, startMonthRef)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="DD"
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                    <span className="text-lg font-medium text-gray-400 select-none">/</span>
                                                    <input
                                                        ref={startMonthRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={startMonth}
                                                        onChange={(e) => handleDateSegment('start', 'month', e.target.value, startYearRef)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="MM"
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                    <span className="text-lg font-medium text-gray-400 select-none">/</span>
                                                    <input
                                                        ref={startYearRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        value={startYear}
                                                        onChange={(e) => handleDateSegment('start', 'year', e.target.value, null)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="YYYY"
                                                        className="w-16 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 min-h-[16px]">
                                                    {formData.startDate ? `✅ ${toNamedDate(formData.startDate)}` : 'DD / MM / YYYY'}
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={getHour(formData.startTime)}
                                                        onChange={(e) => handleTimeSegment('startTime', 'hour', e.target.value, startMinuteRef)}
                                                        onBlur={(e) => handleTimeSegment('startTime', 'hour', normalize(e.target.value, 23), null)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="HH"
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                    <span className="text-lg font-medium text-gray-400 select-none">:</span>
                                                    <input
                                                        ref={startMinuteRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={getMinute(formData.startTime)}
                                                        onChange={(e) => handleTimeSegment('startTime', 'minute', e.target.value, null)}
                                                        onBlur={(e) => handleTimeSegment('startTime', 'minute', normalize(e.target.value, 59), null)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="MM"
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 min-h-[16px]">24h (e.g., 14:30)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* End Column */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                            <span className="text-sm font-semibold text-gray-700">End</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={endDay}
                                                        onChange={(e) => handleDateSegment('end', 'day', e.target.value, endMonthRef)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="DD"
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
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
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
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
                                                        className="w-16 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 min-h-[16px]">
                                                    {formData.endDate ? `✅ ${toNamedDate(formData.endDate)}` : 'DD / MM / YYYY'}
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
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
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
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
                                                        className="w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 min-h-[16px]">24h (e.g., 15:30)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {duration > 0 && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/70 p-4 rounded-xl border border-emerald-200/60 text-center">
                                        <p className="text-sm text-gray-600">⏱️ Duration</p>
                                        <p className="text-2xl font-bold text-emerald-700">
                                            {duration} minutes
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                ({Math.floor(duration / 60)}h {duration % 60}m)
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {duration === 0 && formData.startTime && formData.endTime && (
                                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-xl text-sm flex items-center gap-2.5">
                                        <span className="text-lg">⚠️</span>
                                        <span>End time must be after start time</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Loadshed Amount (MW)
                                            <span className="text-gray-400 text-xs ml-1">(Optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="loadshedMW"
                                            value={formData.loadshedMW}
                                            onChange={handleChange}
                                            placeholder="e.g., 10.5"
                                            step="0.1"
                                            min="0"
                                            className="input-field"
                                        />
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
                                            placeholder="Load Management..."
                                            className="input-field"
                                        />
                                    </div>
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
                                        disabled={loading || duration === 0}
                                        className="btn-primary flex-1"
                                    >
                                        {loading ? 'Saving...' : '✅ Save Record'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Overlap Alert Modal – with its own key */}
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
                                    <p className="text-sm text-yellow-700">💡 Please adjust the start or end time to avoid overlap.</p>
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