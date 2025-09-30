import { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';

interface DeploymentStats {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  runningDeployments: number;
  averageDeploymentTime: number;
  successRate: number;
  deploymentTrend: number;
}

interface EnvironmentData {
  name: string;
  value: number;
  successful: number;
  failed: number;
  percentage: number;
}

interface RecentActivity {
  id: string;
  name: string;
  environment: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  timestamp: string;
  user: string;
  duration?: number;
}

interface DeploymentTrend {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface DashboardData {
  stats: DeploymentStats | null;
  environments: EnvironmentData[];
  recentActivity: RecentActivity[];
  trend: DeploymentTrend[];
  isLoading: boolean;
  error: string | null;
}

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    environments: [],
    recentActivity: [],
    trend: [],
    isLoading: true,
    error: null
  });

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch all dashboard data in parallel
      const [statsResponse, environmentsResponse, activityResponse, trendResponse] = await Promise.all([
        dashboardApi.getDeploymentStats().catch(() => null),
        dashboardApi.getEnvironmentData().catch(() => ({ data: [] })),
        dashboardApi.getRecentActivity(5).catch(() => ({ data: [] })),
        dashboardApi.getDeploymentTrend(7).catch(() => ({ data: [] }))
      ]);

      setData({
        stats: statsResponse?.data || null,
        environments: environmentsResponse.data,
        recentActivity: activityResponse.data,
        trend: trendResponse.data,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load dashboard data. Using mock data as fallback.'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh dashboard data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...data,
    refresh: fetchDashboardData
  };
};