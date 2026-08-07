'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, X, AlertTriangle, Check } from 'lucide-react';
import { api } from '@/utils/api';

export default function EditFeederModal({
    isOpen,
    onClose,
    feeder,
    onSuccess
}) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        capacity: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (isOpen && feeder) {
            setFormData({
                name: feeder.name || '',
                code: feeder.code || '',
                capacity: feeder.capacity || '',
            });
            setError('');
            setFieldErrors({});
        }
    }, [isOpen, feeder]);

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Feeder name is required';
        if (!formData.code.trim()) errors.code = 'Feeder code is required';
        if (formData.capacity && (isNaN(formData.capacity) || Number(formData.capacity) < 0)) {
            errors.capacity = 'Invalid capacity';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setError('');
        try {
            const response = await api.updateFeeder(feeder.id, {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                capacity: formData.capacity ? Number(formData.capacity) : 0,
            });

            if (response.success) {
                if (onSuccess) await onSuccess();
                onClose();
            } else {
                setError(response.error || 'Failed to update feeder');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !feeder) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
                                    <Pencil size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Edit Feeder
                                    </h2>
                                    <p className="text-xs text-gray-500">{feeder.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Feeder Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., Court Station"
                                    className={`input-field ${fieldErrors.name ? 'border-red-500' : ''}`}
                                />
                                {fieldErrors.name && (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Feeder Code *
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="e.g., FDR-01"
                                    className={`input-field uppercase ${fieldErrors.code ? 'border-red-500' : ''}`}
                                />
                                {fieldErrors.code && (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Capacity (MW)
                                    <span className="text-gray-400 text-xs ml-1">(Optional)</span>
                                </label>
                                <input
                                    type="number"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    placeholder="e.g., 10"
                                    step="0.1"
                                    min="0"
                                    className={`input-field ${fieldErrors.capacity ? 'border-red-500' : ''}`}
                                />
                                {fieldErrors.capacity && (
                                    <p className="text-xs text-red-500 mt-1">{fieldErrors.capacity}</p>
                                )}
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
                                    {loading ? (
                                        'Saving...'
                                    ) : (
                                        <>
                                            <Check size={15} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}