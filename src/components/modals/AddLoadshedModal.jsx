'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    X,
    AlertTriangle,
    Radio,
    Building2,
    Zap,
    Clock,
    CheckCircle2,
    Pencil,
    Lightbulb,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api, apiCall } from '@/utils/api';

export default function AddLoadshedModal({
    isOpen,
    onClose,
    substation,
    feeder,
    onSuccess,
    mode = 'full',
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
    const [success, setSuccess] = useState(false); // <-- NEW success state

    const startMonthRef = useRef(null);
    const startYearRef = useRef(null);
    const endMonthRef = useRef(null);
    const endYearRef = useRef(null);
    const startMinuteRef = useRef(null);
    const endMinuteRef = useRef(null);

    const isLiveMode = mode === 'live';

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

    const getCurrentDateTime = () => {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;
        const currentTime = now.toTimeString().slice(0, 5);
        const endNow = new Date(now);
        endNow.setHours(endNow.getHours() + 1);
        const endTime = endNow.toTimeString().slice(0, 5);
        return { currentDate, currentTime, endTime, year, month, day };
    };

    const resetForm = () => {
        const { currentDate, currentTime, endTime, year, month, day } = getCurrentDateTime();
        setFormData({
            startDate: currentDate,
            startTime: currentTime,
            endDate: currentDate,
            endTime: isLiveMode ? '' : endTime,
            reason: '',
            loadshedMW: '',
        });
        setStartDay(day);
        setStartMonth(month);
        setStartYear(year);
        setEndDay(isLiveMode ? '' : day);
        setEndMonth(isLiveMode ? '' : month);
        setEndYear(isLiveMode ? '' : year);
        setDuration(0);
        setError('');
        setOverlapError(null);
        setShowOverlapModal(false);
        setSuccess(false); // reset success flag
    };

    useEffect(() => {
        if (isOpen) resetForm();
    }, [isOpen, isLiveMode]);

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
            if (iso) setFormData((prev) => ({ ...prev, startDate: iso }));
        } else {
            if (part === 'day') setEndDay(limited);
            if (part === 'month') setEndMonth(limited);
            if (part === 'year') setEndYear(limited);
            const d = part === 'day' ? limited : endDay;
            const m = part === 'month' ? limited : endMonth;
            const y = part === 'year' ? limited : endYear;
            const iso = buildDate(d, m, y);
            if (iso) setFormData((prev) => ({ ...prev, endDate: iso }));
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
        const newTime = part === 'hour' ? `${cleaned}:${m || '00'}` : `${h || '00'}:${cleaned}`;
        setFormData((prev) => ({ ...prev, [field]: newTime }));
        if (cleaned.length === 2 && nextRef?.current) {
            nextRef.current.focus();
            nextRef.current.select();
        }
        setOverlapError(null);
        setShowOverlapModal(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setOverlapError(null);
        setShowOverlapModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setOverlapError(null);
        setShowOverlapModal(false);
        setSuccess(false);

        if (isLiveMode) {
            if (!formData.startDate || !formData.startTime) {
                setError('Please enter valid start date and time.');
                return;
            }
        } else {
            if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
                setError('Please enter valid dates and times.');
                return;
            }
        }

        const sDay = normalize(startDay, 31);
        const sMonth = normalize(startMonth, 12);
        const startIso = buildDate(sDay, sMonth, startYear);
        if (!startIso) {
            setError('Invalid start date.');
            return;
        }

        const startHour = normalize(getHour(formData.startTime), 23);
        const startMinute = normalize(getMinute(formData.startTime), 59);
        const startTime = `${startHour}:${startMinute}`;
        const start = new Date(`${startIso}T${startTime}`);
        if (isNaN(start.getTime())) {
            setError('Invalid start date/time.');
            return;
        }

        const now = new Date();
        if (start > now) {
            setError('Start time cannot be in the future. Please select a time that has already passed.');
            return;
        }

        if (isLiveMode) {
            setLoading(true);
            try {
                const payload = {
                    substationId: substation.id,
                    feederId: feeder.id,
                    startTime: start.toISOString(),
                    reason: formData.reason,
                    loadshedMW: formData.loadshedMW ? parseFloat(formData.loadshedMW) : null,
                };
                const response = await apiCall('/records/live', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                if (response.success) {
                    toast.success('✅ Live loadshed started successfully');
                    setSuccess(true);
                    if (onSuccess) await onSuccess();
                    // modal stays open – user closes manually
                } else if (response.error === 'There is already a live loadshed event for this feeder.') {
                    setError('A live event is already in progress for this feeder.');
                } else {
                    setError(response.error || 'Failed to start live event.');
                }
            } catch (err) {
                setError(err.message || 'Something went wrong.');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Full mode
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
                toast.success('✅ Loadshed record added successfully');
                setSuccess(true);
                if (onSuccess) await onSuccess();
                // modal stays open – user closes manually
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

    const modalKey = `add-modal-${substation?.id || 'ss'}-${feeder?.id || 'fd'}`;
    const inputCls =
        'w-10 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white';
    const yearCls =
        'w-16 px-1 py-2 border border-gray-200 rounded-lg text-center font-mono text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition bg-gray-50/50 hover:bg-white';

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div
                        key={modalKey}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl ${isLiveMode ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                                            }`}
                                    >
                                        {isLiveMode ? <Radio size={18} /> : <Plus size={18} />}
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {isLiveMode ? 'Start Live Loadshed' : 'Add New Loadshed'}
                                    </h2>
                                    {/* Success indicator */}
                                    {success && (
                                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2.5 py-0.5 rounded-full">
                                            <CheckCircle2 size={12} /> Saved
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Info Card */}
                            <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/40 rounded-xl border border-emerald-100">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                            <Building2 size={14} className="text-gray-400" />
                                            {substation.name}
                                        </p>
                                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                            <Zap size={14} className="text-emerald-500" />
                                            {feeder.name}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {isLiveMode ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                LIVE MODE
                                            </span>
                                        ) : (
                                            <>
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                                                    DD/MM/YYYY
                                                </span>
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                                                    24h
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Start */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-red-500' : 'bg-emerald-500'}`}
                                            />
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
                                                        className={inputCls}
                                                    />
                                                    <span className="text-lg font-medium text-gray-300 select-none">/</span>
                                                    <input
                                                        ref={startMonthRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={startMonth}
                                                        onChange={(e) => handleDateSegment('start', 'month', e.target.value, startYearRef)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="MM"
                                                        className={inputCls}
                                                    />
                                                    <span className="text-lg font-medium text-gray-300 select-none">/</span>
                                                    <input
                                                        ref={startYearRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={4}
                                                        value={startYear}
                                                        onChange={(e) => handleDateSegment('start', 'year', e.target.value, null)}
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="YYYY"
                                                        className={yearCls}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 min-h-[16px] flex items-center gap-1">
                                                    {formData.startDate ? (
                                                        <>
                                                            <CheckCircle2 size={11} className="text-emerald-500" />{' '}
                                                            {toNamedDate(formData.startDate)}
                                                        </>
                                                    ) : (
                                                        'DD / MM / YYYY'
                                                    )}
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
                                                        onChange={(e) =>
                                                            handleTimeSegment('startTime', 'hour', e.target.value, startMinuteRef)
                                                        }
                                                        onBlur={(e) =>
                                                            handleTimeSegment('startTime', 'hour', normalize(e.target.value, 23), null)
                                                        }
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="HH"
                                                        className={inputCls}
                                                    />
                                                    <span className="text-lg font-medium text-gray-300 select-none">:</span>
                                                    <input
                                                        ref={startMinuteRef}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={2}
                                                        value={getMinute(formData.startTime)}
                                                        onChange={(e) =>
                                                            handleTimeSegment('startTime', 'minute', e.target.value, null)
                                                        }
                                                        onBlur={(e) =>
                                                            handleTimeSegment('startTime', 'minute', normalize(e.target.value, 59), null)
                                                        }
                                                        onFocus={(e) => e.target.select()}
                                                        placeholder="MM"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-1 min-h-[16px]">24h (e.g., 14:30)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* End – full mode only */}
                                    {!isLiveMode && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
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
                                                            className={inputCls}
                                                        />
                                                        <span className="text-lg font-medium text-gray-300 select-none">/</span>
                                                        <input
                                                            ref={endMonthRef}
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={2}
                                                            value={endMonth}
                                                            onChange={(e) => handleDateSegment('end', 'month', e.target.value, endYearRef)}
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="MM"
                                                            className={inputCls}
                                                        />
                                                        <span className="text-lg font-medium text-gray-300 select-none">/</span>
                                                        <input
                                                            ref={endYearRef}
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={4}
                                                            value={endYear}
                                                            onChange={(e) => handleDateSegment('end', 'year', e.target.value, null)}
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="YYYY"
                                                            className={yearCls}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1 min-h-[16px] flex items-center gap-1">
                                                        {formData.endDate ? (
                                                            <>
                                                                <CheckCircle2 size={11} className="text-emerald-500" />{' '}
                                                                {toNamedDate(formData.endDate)}
                                                            </>
                                                        ) : (
                                                            'DD / MM / YYYY'
                                                        )}
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
                                                            onChange={(e) =>
                                                                handleTimeSegment('endTime', 'hour', e.target.value, endMinuteRef)
                                                            }
                                                            onBlur={(e) =>
                                                                handleTimeSegment('endTime', 'hour', normalize(e.target.value, 23), null)
                                                            }
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="HH"
                                                            className={inputCls}
                                                        />
                                                        <span className="text-lg font-medium text-gray-300 select-none">:</span>
                                                        <input
                                                            ref={endMinuteRef}
                                                            type="text"
                                                            inputMode="numeric"
                                                            maxLength={2}
                                                            value={getMinute(formData.endTime)}
                                                            onChange={(e) =>
                                                                handleTimeSegment('endTime', 'minute', e.target.value, null)
                                                            }
                                                            onBlur={(e) =>
                                                                handleTimeSegment('endTime', 'minute', normalize(e.target.value, 59), null)
                                                            }
                                                            onFocus={(e) => e.target.select()}
                                                            placeholder="MM"
                                                            className={inputCls}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1 min-h-[16px]">24h (e.g., 15:30)</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Duration */}
                                {!isLiveMode && duration > 0 && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-4 rounded-xl border border-emerald-100 text-center">
                                        <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                                            <Clock size={14} />
                                            Duration
                                        </p>
                                        <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                                            {duration} minutes
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                ({Math.floor(duration / 60)}h {duration % 60}m)
                                            </span>
                                        </p>
                                    </div>
                                )}

                                {!isLiveMode && duration === 0 && formData.startTime && formData.endTime && (
                                    <div className="bg-amber-50 border border-amber-100 text-amber-700 p-3 rounded-xl text-sm flex items-center gap-2">
                                        <AlertTriangle size={15} className="shrink-0" />
                                        <span>End time must be after start time</span>
                                    </div>
                                )}

                                {isLiveMode && (
                                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-sm flex items-start gap-2">
                                        <Radio size={15} className="text-red-500 mt-0.5 shrink-0" />
                                        <span className="text-red-700">
                                            This will start a <strong>live</strong> loadshed event. You can withdraw it later to
                                            record the end time.
                                        </span>
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
                                    <button type="button" onClick={onClose} className="btn-secondary flex-1">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || success || (isLiveMode ? false : duration === 0)}
                                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium transition disabled:opacity-50 text-white ${isLiveMode ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                    >
                                        {loading ? (
                                            'Saving...'
                                        ) : success ? (
                                            <>
                                                <CheckCircle2 size={15} /> Saved – Close Modal
                                            </>
                                        ) : isLiveMode ? (
                                            <>
                                                <Radio size={15} /> Start Live
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={15} /> Save Record
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Overlap Modal */}
            {overlapError && (
                <AnimatePresence>
                    {showOverlapModal && (
                        <div
                            key={`overlap-modal-${feeder?.id || 'ov'}`}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                            >
                                <div className="text-center mb-4">
                                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 text-red-500 mx-auto mb-3">
                                        <AlertTriangle size={28} />
                                    </div>
                                    <h2 className="text-lg font-bold text-red-600">Overlapping Time Period</h2>
                                    <p className="text-gray-600 mt-2 text-sm">
                                        This time period overlaps with an existing loadshed record for{' '}
                                        <strong>{feeder?.name}</strong>.
                                    </p>
                                </div>

                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                                    <p className="text-sm text-red-700 font-medium">Existing Record</p>
                                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1.5">
                                        <Clock size={13} />
                                        {overlapError.overlappingRecord
                                            ? new Date(overlapError.overlappingRecord.startTime).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                            })
                                            : 'Unknown'}
                                        {' → '}
                                        {overlapError.overlappingRecord
                                            ? new Date(overlapError.overlappingRecord.endTime).toLocaleString('en-GB', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false,
                                            })
                                            : 'Unknown'}
                                    </p>
                                    <p className="text-sm text-red-600 mt-0.5">
                                        Duration: {overlapError.overlappingRecord?.duration || 0} minutes
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                                    <Lightbulb size={15} className="text-amber-600 mt-0.5 shrink-0" />
                                    <p className="text-sm text-amber-700">
                                        Please adjust the start or end time to avoid overlap.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowOverlapModal(false);
                                            setOverlapError(null);
                                        }}
                                        className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5"
                                    >
                                        <Pencil size={14} />
                                        Adjust Time
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowOverlapModal(false);
                                            setOverlapError(null);
                                            onClose();
                                        }}
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