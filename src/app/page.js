'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Building2, Zap, ArrowRight } from 'lucide-react';
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

        const aggregatedStats = response.data.reduce(
          (acc, ss) => ({
            totalSubstations: response.data.length,
            totalFeeders: acc.totalFeeders + (ss.feederCount || 0),
            totalSheds: acc.totalSheds + (ss.totalSheds || 0),
            liveCount: response.liveEvents || 0,
          }),
          { totalSubstations: 0, totalFeeders: 0, totalSheds: 0, liveCount: 0 }
        );

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

    setIsLoading(true);
    fetchData();

    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        fetchData();
      }
    }, 60000);

    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (document.visibilityState === 'visible') {
        fetchData();
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

  const substationCards = useMemo(
    () =>
      substations.map((ss, index) => (
        <SubstationCard key={ss.id} substation={ss} index={index} />
      )),
    [substations]
  );

  if (loading || !user || isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-1">Failed to load dashboard</p>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700">
            <Building2 size={22} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Substations Overview
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Monitor substations and loadshed activities in real time
            </p>
          </div>
        </div>
      </div>

      <StatsCards stats={stats} />

      {/* Substation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
        {substationCards}

        {/* View All Feeders Card - matching style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: substations.length * 0.08 }}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          className="group relative rounded-xl overflow-hidden cursor-pointer"
          onClick={() => router.push('/feeders')}
        >
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Soft glow */}
          <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-emerald-400/50 via-teal-300/30 to-emerald-500/50 opacity-60 group-hover:opacity-100 blur-[2px] transition-opacity duration-300" />

          {/* Inner content */}
          <div className="relative m-[1.5px] rounded-[10px] bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/50">
            <div className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[148px]">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-3 group-hover:bg-emerald-200 transition-colors">
                <Zap size={22} strokeWidth={2} />
              </div>
              <h3 className="text-base font-semibold text-emerald-800">
                View All Feeders
              </h3>
              <p className="text-xs text-emerald-600/80 mt-1">
                Detailed event timeline & duration bars
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span>{stats.totalFeeders || 0} feeders</span>
                <ArrowRight
                  size={14}
                  className="opacity-70 group-hover:translate-x-0.5 transition-transform"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}