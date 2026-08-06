'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Layout from '@/components/common/Layout';
import StatsCards from '@/components/dashboard/StatsCards';
import SubstationCard from '@/components/dashboard/SubstationCard';
import Spinner from '@/components/common/Spinner';
import { apiCall } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

const HorizontalBarChart = dynamic(
  () => import('@/components/substation/HorizontalBarChart'),
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {substationCards}

        {/* "View All Feeders" Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: substations.length * 0.08 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="card overflow-hidden hover:shadow-lg cursor-pointer border-2 border-dashed border-emerald-300 bg-emerald-50/30"
          onClick={() => router.push('/feeders')}
        >
          <div className="p-5 flex flex-col items-center justify-center text-center h-full min-h-[120px]">
            <span className="text-3xl mb-2">⚡</span>
            <h3 className="text-base font-semibold text-emerald-700">View All Feeders</h3>
            <p className="text-xs text-emerald-500 mt-1">See detailed event bars</p>
            <p className="text-xs text-emerald-400 mt-1">{stats.totalFeeders || 0} feeders across all substations</p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}