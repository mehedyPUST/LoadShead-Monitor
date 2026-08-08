'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Building2, Zap, ArrowRight, Lock } from 'lucide-react';
import Layout from '@/components/common/Layout';
import StatsCards from '@/components/dashboard/StatsCards';
import SubstationCard from '@/components/dashboard/SubstationCard';
import LiveTicker from '@/components/dashboard/LiveTicker';
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

  // ✅ REMOVED login redirect – homepage is now public

  const fetchData = useCallback(async () => {
    // If no user, don't fetch – just show public message
    if (!user) {
      setIsLoading(false);
      return;
    }

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
        // Don't redirect – just show error
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      </Layout>
    );
  }

  // Public view when not logged in
  if (!user) {
    return (
      <Layout>
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

        {/* Public message */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mx-auto mb-4">
            <Lock size={30} />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Sign in to view substation data
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Please log in to access real-time loadshed monitoring, feeder details, and live event tracking.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </Layout>
    );
  }

  // Authenticated view
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

  if (isLoading) {
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
      {/* 🔴 Breaking News Ticker - Live Events */}
      <LiveTicker />

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
        {substations.map((ss, index) => (
          <SubstationCard key={ss.id} substation={ss} index={index} />
        ))}

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