'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/common/Layout';
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

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">Loading...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 Analytics & Predictions</h1>

            <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Select Substation</h2>
                <select
                    value={substationId}
                    onChange={(e) => setSubstationId(e.target.value)}
                    className="input-field max-w-md"
                >
                    <option value="">Select a substation</option>
                    {/* Options will be populated from API */}
                </select>
            </div>

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card p-4">
                        <p className="text-sm text-gray-500">Total Records</p>
                        <p className="text-2xl font-bold">{data.summary.totalRecords}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm text-gray-500">Total Duration</p>
                        <p className="text-2xl font-bold text-red-600">{data.summary.totalDuration} mins</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm text-gray-500">Average Duration</p>
                        <p className="text-2xl font-bold text-yellow-600">{data.summary.avgDuration} mins</p>
                    </div>
                </div>
            )}
        </Layout>
    );
}