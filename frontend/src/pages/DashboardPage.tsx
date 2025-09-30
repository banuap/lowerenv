import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Rocket, 
  CheckCircle, 
  Activity,
  Clock, 
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Server,
  Users,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';

const DashboardPage: React.FC = () => {
  const { stats, environments, recentActivity, trend, isLoading, error, refresh } = useDashboard();

  // Fallback mock data when API is not available
  const fallbackStats = {
    totalDeployments: 247,
    successfulDeployments: 218,
    failedDeployments: 19,
    runningDeployments: 10,
    averageDeploymentTime: 12.5,
    successRate: 88.3,
    deploymentTrend: 15.2
  };

  const fallbackEnvironments = [
    { name: 'Development', value: 89, successful: 78, failed: 11, percentage: 36 },
    { name: 'Staging', value: 67, successful: 61, failed: 6, percentage: 27 },
    { name: 'Testing', value: 45, successful: 42, failed: 3, percentage: 18 },
    { name: 'Integration', value: 46, successful: 37, failed: 9, percentage: 19 }
  ];

  const fallbackActivity = [
    { id: '1', name: 'Web API v2.1', environment: 'Production', status: 'completed' as const, timestamp: '2 min ago', user: 'Alice Johnson' },
    { id: '2', name: 'Frontend Dashboard', environment: 'Staging', status: 'running' as const, timestamp: '5 min ago', user: 'Bob Smith' },
    { id: '3', name: 'Auth Service', environment: 'Development', status: 'failed' as const, timestamp: '12 min ago', user: 'Carol Williams' },
    { id: '4', name: 'Payment Gateway', environment: 'Testing', status: 'completed' as const, timestamp: '18 min ago', user: 'David Brown' },
    { id: '5', name: 'Notification Service', environment: 'Development', status: 'completed' as const, timestamp: '25 min ago', user: 'Eva Davis' }
  ];

  const fallbackTrend = [
    { date: 'Sep 19', successful: 13, failed: 2, total: 15 },
    { date: 'Sep 20', successful: 19, failed: 3, total: 22 },
    { date: 'Sep 21', successful: 16, failed: 2, total: 18 },
    { date: 'Sep 22', successful: 22, failed: 3, total: 25 },
    { date: 'Sep 23', successful: 26, failed: 2, total: 28 },
    { date: 'Sep 24', successful: 27, failed: 4, total: 31 },
    { date: 'Sep 25', successful: 21, failed: 3, total: 24 }
  ];

  // Use real data if available, otherwise fall back to mock data
  const deploymentStats = stats || fallbackStats;
  const environmentData = environments.length > 0 ? environments : fallbackEnvironments;
  const activityData = recentActivity.length > 0 ? recentActivity : fallbackActivity;
  const trendData = trend.length > 0 ? trend : fallbackTrend;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500 bg-opacity-20';
      case 'failed': return 'text-red-400 bg-red-500 bg-opacity-20';
      case 'running': return 'text-blue-400 bg-blue-500 bg-opacity-20';
      default: return 'text-yellow-400 bg-yellow-500 bg-opacity-20';
    }
  };

  const MetricCard = ({ title, value, subtitle, change, changeType, icon: Icon }: any) => (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-sm">
      <div className="flex items-center">
        <div className="p-3 bg-blue-600 bg-opacity-20 rounded-lg">
          <Icon className="h-6 w-6 text-blue-400" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          {change && (
            <div className="flex items-center mt-2">
              {changeType === 'positive' ? 
                <TrendingUp className="h-4 w-4 text-green-400" /> : 
                <TrendingDown className="h-4 w-4 text-red-400" />
              }
              <span className={`text-sm font-medium ml-1 ${changeType === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                {change}% vs last week
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Overview of your deployment platform
            {error && (
              <span className="ml-2 inline-flex items-center text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                Using mock data
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/deployments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Deployment
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Deployments"
          value={deploymentStats.totalDeployments}
          change={deploymentStats.deploymentTrend}
          changeType="positive"
          icon={Rocket}
        />
        <MetricCard
          title="Success Rate"
          value={`${deploymentStats.successRate}%`}
          subtitle={`${deploymentStats.successfulDeployments}/${deploymentStats.totalDeployments} successful`}
          change={2.1}
          changeType="positive"
          icon={CheckCircle}
        />
        <MetricCard
          title="Active Deployments"
          value={deploymentStats.runningDeployments}
          subtitle="Currently running"
          icon={Activity}
        />
        <MetricCard
          title="Avg Deploy Time"
          value={`${deploymentStats.averageDeploymentTime}m`}
          subtitle="Average duration"
          change={-8.4}
          changeType="positive"
          icon={Clock}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment Trend */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-100">Deployment Trend</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {trendData.map((day) => (
              <div key={day.date} className="flex items-center space-x-4">
                <span className="w-12 text-xs text-gray-400">{day.date.split(' ')[1]}</span>
                <div className="flex-1 flex space-x-1">
                  <div 
                    className="bg-blue-500 rounded h-6 transition-all"
                    style={{ width: `${Math.max((day.successful / Math.max(...trendData.map(d => d.total))) * 100, 5)}%` }}
                    title={`${day.successful} successful`}
                  ></div>
                  <div 
                    className="bg-red-500 rounded h-6 transition-all"
                    style={{ width: `${Math.max((day.failed / Math.max(...trendData.map(d => d.total))) * 100 * 3, 3)}%` }}
                    title={`${day.failed} failed`}
                  ></div>
                </div>
                <span className="w-8 text-xs text-gray-400">{day.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Distribution */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-100 mb-6">Environment Distribution</h3>
          
          <div className="space-y-4">
            {environmentData.map((env, index) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
              return (
                <div key={env.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                    <div>
                      <p className="font-medium text-gray-100">{env.name}</p>
                      <p className="text-sm text-gray-400">{env.value} deployments</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-100">{env.percentage}%</p>
                    <div className="flex space-x-2 text-sm">
                      <span className="text-green-400">{env.successful} ✓</span>
                      <span className="text-red-400">{env.failed} ✗</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">Recent Activity</h3>
          <Link 
            to="/deployments" 
            className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center"
          >
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        <div className="space-y-4">
          {activityData.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-gray-700 rounded-lg transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  activity.status === 'completed' ? 'bg-green-500' :
                  activity.status === 'failed' ? 'bg-red-500' :
                  activity.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-100">{activity.name}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs font-medium">{activity.environment}</span>
                    <span>•</span>
                    <span>{activity.user}</span>
                    <span>•</span>
                    <span>{activity.timestamp}</span>
                  </div>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-100 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/deployments/create"
            className="group flex items-center p-4 bg-gradient-to-r from-blue-900 to-blue-800 border border-blue-700 rounded-lg hover:from-blue-800 hover:to-blue-700 transition-all"
          >
            <Plus className="h-8 w-8 text-blue-400 mr-4 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-gray-100">Create Deployment</p>
              <p className="text-sm text-gray-300">Set up new pipeline</p>
            </div>
          </Link>
          
          <Link
            to="/deployments"
            className="group flex items-center p-4 bg-gradient-to-r from-green-900 to-green-800 border border-green-700 rounded-lg hover:from-green-800 hover:to-green-700 transition-all"
          >
            <Server className="h-8 w-8 text-green-400 mr-4 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-gray-100">Manage Deployments</p>
              <p className="text-sm text-gray-300">View and control pipelines</p>
            </div>
          </Link>
          
          <button className="group flex items-center p-4 bg-gradient-to-r from-purple-900 to-purple-800 border border-purple-700 rounded-lg hover:from-purple-800 hover:to-purple-700 transition-all">
            <BarChart3 className="h-8 w-8 text-purple-400 mr-4 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-gray-100">View Analytics</p>
              <p className="text-sm text-gray-300">Performance insights</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;