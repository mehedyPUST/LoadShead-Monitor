'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/common/Layout';
import StatsCards from '@/components/dashboard/StatsCards';
import SubstationCard from '@/components/dashboard/SubstationCard';
import { api } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [substations, setSubstations] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const substationRes = await api.getSubstations();
        if (substationRes.success) {
          setSubstations(substationRes.data);

          const totalSubstations = substationRes.data.length;
          const totalFeeders = substationRes.data.reduce((sum, ss) => sum + (ss.feederCount || 0), 0);

          let totalSheds = 0;
          let totalDuration = 0;

          for (const ss of substationRes.data) {
            try {
              const recordsRes = await api.getRecordsBySubstation(ss.id, 'today');
              if (recordsRes.success) {
                totalSheds += recordsRes.data.length;
                totalDuration += recordsRes.data.reduce((sum, r) => sum + r.duration, 0);
              }
            } catch (e) {
              // Skip if no records
            }
          }

          setStats({
            totalSubstations,
            totalFeeders,
            totalSheds,
            totalDuration,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        if (error.message === 'Unauthorized' || error.message.includes('token')) {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading data...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏢 Substations Overview</h1>
        <p className="text-sm text-gray-500">Monitor your substations and their loadshed activities</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {substations.map((ss, index) => (
          <SubstationCard
            key={ss.id}
            substation={ss}
            index={index}
          />
        ))}
      </div>
    </Layout>
  );
}