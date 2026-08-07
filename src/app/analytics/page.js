'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Building2, Clock, Activity, TrendingUp } from 'lucide-react';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [substationId, setSubstationId] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.getPredictions(substationId);
                if (response.success) {
                    setData(response.data);
                }
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        if (substationId) fetchData();
    }, [substationId]);

    if (loading && substationId) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700">
                    <BarChart3 size={22} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Analytics & Predictions
                    </h1>
                    <p className="text-sm text-gray-500">
                        View loadshed patterns and predictions by substation
                    </p>
                </div>
            </div>

            {/* Substation Selector */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Building2 size={16} className="text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-700">Select Substation</h2>
                </div>
                <select
                    value={substationId}
                    onChange={(e) => setSubstationId(e.target.value)}
                    className="input-field max-w-md"
                >
                    <option value="">Select a substation</option>
                    {/* Options will be populated from API */}
                </select>
            </div>

            {/* Stats */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-blue-500 shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
                                <Activity size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                    Total Records
                                </p>
                                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                                    {data.summary.totalRecords}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-red-500 shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                    Total Duration
                                </p>
                                <p className="text-2xl font-bold text-red-600 tabular-nums">
                                    {data.summary.totalDuration} mins
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-amber-500 shadow-sm p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 text-amber-600">
                                <TrendingUp size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                    Average Duration
                                </p>
                                <p className="text-2xl font-bold text-amber-600 tabular-nums">
                                    {data.summary.avgDuration} mins
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state when no substation selected */}
            {!substationId && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-400 mx-auto mb-4">
                        <BarChart3 size={26} />
                    </div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">
                        No substation selected
                    </h3>
                    <p className="text-sm text-gray-500">
                        Select a substation above to view analytics and predictions.
                    </p>
                </div>
            )}
        </Layout>
    );
}