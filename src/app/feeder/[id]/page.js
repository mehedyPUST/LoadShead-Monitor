'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Layout from '@/components/common/Layout';
import { api } from '@/utils/api';

export default function FeederDetailsPage() {
    const params = useParams();
    const feederId = params.id;
    const [feeder, setFeeder] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const substationsRes = await api.getSubstations();
                if (substationsRes.success) {
                    let foundFeeder = null;
                    let foundSubstation = null;

                    for (const ss of substationsRes.data) {
                        const ssDetail = await api.getSubstation(ss.id);
                        if (ssDetail.success) {
                            const feeder = ssDetail.data.feeders?.find(f => f.id === feederId);
                            if (feeder) {
                                foundFeeder = { ...feeder, substation: ssDetail.data };
                                foundSubstation = ssDetail.data;
                                break;
                            }
                        }
                    }

                    setFeeder(foundFeeder);

                    if (foundSubstation) {
                        const recordsRes = await api.getRecordsBySubstation(foundSubstation.id, 'today');
                        if (recordsRes.success) {
                            const feederRecords = recordsRes.data.filter(r => r.feederId === feederId);
                            setRecords(feederRecords);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching feeder data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [feederId]);

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </Layout>
        );
    }

    if (!feeder) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <p className="text-xl text-gray-600">Feeder not found</p>
                    <Link href="/" className="text-emerald-600 hover:underline mt-4 inline-block">
                        ← Go back home
                    </Link>
                </div>
            </Layout>
        );
    }

    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);

    return (
        <Layout>
            <Link
                href={`/substation/${feeder.substation.id}`}
                className="text-emerald-600 hover:underline mb-4 inline-block font-medium"
            >
                ← Back to {feeder.substation.name}
            </Link>

            <div className="card p-6 mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">⚡ {feeder.name}</h1>
                        <p className="text-gray-500">{feeder.substation.name} | {feeder.substation.code}</p>
                        <p className="text-sm text-gray-400 mt-1">{feeder.substation.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="badge badge-red">Total Sheds: {records.length}</span>
                        <span className="badge badge-yellow">Total Duration: {totalDuration} mins</span>
                    </div>
                </div>
            </div>

            {records.length > 0 ? (
                <div className="space-y-3">
                    {records.map((record, idx) => (
                        <div key={record.id} className="card p-4 border-l-4 border-red-500">
                            <div className="flex flex-wrap justify-between items-start gap-2">
                                <div>
                                    <p className="font-medium text-gray-800">
                                        Spell #{idx + 1}: {new Date(record.startTime).toLocaleTimeString()} → {new Date(record.endTime).toLocaleTimeString()}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Date: {new Date(record.startTime).toLocaleDateString()}
                                        {record.operator?.name && ` | Operator: ${record.operator.name}`}
                                    </p>
                                    {record.reason && <p className="text-sm text-gray-500">Reason: {record.reason}</p>}
                                </div>
                                <span className="font-bold text-red-600 text-lg">{record.duration} mins</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card p-12 text-center">
                    <p className="text-gray-500 text-lg">⚪ No loadshed records found</p>
                </div>
            )}
        </Layout>
    );
}