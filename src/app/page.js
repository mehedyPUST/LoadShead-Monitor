'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Layout from '@/components/common/Layout';
import StatsCards from '@/components/dashboard/StatsCards';
import SubstationCard from '@/components/dashboard/SubstationCard';
import Spinner from '@/components/common/Spinner';
import { apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const VerticalBarChart = dynamic(
  () => import('@/components/substation/VerticalBarChart'),
  { ssr: false, loading: () => <div className="h-80 bg-gray-100 rounded-xl animate-pulse" /> }
);

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [substations, setSubstations] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveEvents, setLiveEvents] = useState(0);
  const intervalRef = useRef(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const fetchData = useCallback(async () => {
    try {
      const response = await apiCall('/records/dashboard-stats?view=today');

      if (response.success) {
        setSubstations(response.data);
        setLiveEvents(response.liveEvents || 0);

        const aggregatedStats = response.data.reduce((acc, ss) => ({
          totalSubstations: response.data.length,
          totalFeeders: acc.totalFeeders + (ss.feederCount || 0),
          totalSheds: acc.totalSheds + (ss.totalSheds || 0),
          liveCount: response.liveEvents || 0,
        }), { totalSubstations: 0, totalFeeders: 0, totalSheds: 0, liveCount: 0 });

        setStats(aggregatedStats);
      } else {
        setError(response.error || 'Failed to load data');
      }
    } catch (error) {
      console.error(error);
      setError(error.message);
      if (error.message?.includes('token')) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    setIsLoading(true);
    fetchData();

    // Start 60-second interval
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        fetchData();
      }
    }, 60000); // 60 seconds

    // Refresh when tab becomes visible again
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (document.visibilityState === 'visible') {
        fetchData(); // Immediate refresh when user returns
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, fetchData]);

  const substationCards = useMemo(() =>
    substations.map((ss, index) => (
      <SubstationCard key={ss.id} substation={ss} index={index} />
    )),
    [substations]);

  if (loading || !user || isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner size={48} />
        </div>
      </Layout>
    );
  }

  if (error) return <Layout><div className="text-red-500">Error: {error}</div></Layout>;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏢 Substations Overview</h1>
        <p className="text-sm text-gray-500">Monitor your substations and their loadshed activities</p>
      </div>
      <StatsCards stats={stats} />
      <div className="mb-6">
        <button onClick={() => router.push('/feeders')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition shadow-sm flex items-center gap-2">
          <span>⚡</span> View All Feeders
        </button>
        <p className="text-xs text-gray-400 mt-1">See all feeders across all substations with detailed event bars</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {substationCards}
      </div>
    </Layout>
  );
}