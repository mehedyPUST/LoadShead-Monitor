'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';

export default function AddFeederModal({
    isOpen,
    onClose,
    substation,
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
        if (isOpen) {
            setFormData({ name: '', code: '', capacity: '' });
            setError('');
            setFieldErrors({});
        }
    }, [isOpen]);

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
            const response = await api.createFeeder({
                substationId: substation.id,
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                capacity: formData.capacity ? Number(formData.capacity) : 0,
            });

            if (response.success) {
                if (onSuccess) await onSuccess();
                onClose();
            } else {
                setError(response.error || 'Failed to create feeder');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
                    >
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <span className="text-emerald-600 text-lg">➕</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800">Add New Feeder</h2>
                                    <p className="text-xs text-gray-500">{substation?.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                            >
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

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
                                <p className="text-[10px] text-gray-400 mt-1">Auto-converted to uppercase</p>
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
                                    className="btn-primary flex-1"
                                >
                                    {loading ? 'Creating...' : '➕ Create Feeder'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}