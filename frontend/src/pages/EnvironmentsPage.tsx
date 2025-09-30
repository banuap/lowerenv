import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Square, 
  Trash2, 
  Settings, 
  Activity, 
  DollarSign,
  Users,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';

interface Environment {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'testing' | 'integration' | 'uat' | 'sandbox';
  description?: string;
  status: 'active' | 'inactive' | 'provisioning' | 'terminating' | 'error';
  infrastructure: {
    provider: string;
    region: string;
    project: string;
    namespace: string;
  };
  resources: {
    currentUsage: {
      cpu: number;
      memory: number;
      storage: number;
      pods: number;
    };
    limits: {
      cpu: number;
      memory: number;
      storage: number;
      pods: number;
    };
    costs: {
      daily: number;
      monthly: number;
      currency: string;
    };
  };
  health: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    uptime: number;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
    }>;
  };
  deployments: string[];
  createdAt: string;
  access: {
    owners: string[];
    developers: string[];
  };
}

const EnvironmentsPage: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [filteredEnvironments, setFilteredEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchEnvironments();
  }, []);

  useEffect(() => {
    filterEnvironments();
  }, [environments, searchTerm, filterType, filterStatus]);

  const fetchEnvironments = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - replace with actual API call
      const mockEnvironments: Environment[] = [
        {
          id: '1',
          name: 'dev-web-frontend',
          type: 'development',
          description: 'Frontend development environment',
          status: 'active',
          infrastructure: {
            provider: 'gcp',
            region: 'us-central1',
            project: 'my-project-dev',
            namespace: 'env-dev-web-frontend'
          },
          resources: {
            currentUsage: { cpu: 250, memory: 512, storage: 5, pods: 3 },
            limits: { cpu: 1000, memory: 2048, storage: 20, pods: 10 },
            costs: { daily: 12.50, monthly: 375, currency: 'USD' }
          },
          health: {
            status: 'healthy',
            uptime: 99.8,
            issues: []
          },
          deployments: ['dep1', 'dep2'],
          createdAt: '2024-09-20T10:30:00Z',
          access: { owners: ['user1'], developers: ['user2', 'user3'] }
        },
        {
          id: '2',
          name: 'staging-api-backend',
          type: 'staging',
          description: 'API staging environment',
          status: 'active',
          infrastructure: {
            provider: 'gcp',
            region: 'us-central1',
            project: 'my-project-staging',
            namespace: 'env-staging-api-backend'
          },
          resources: {
            currentUsage: { cpu: 450, memory: 1024, storage: 8, pods: 5 },
            limits: { cpu: 2000, memory: 4096, storage: 50, pods: 20 },
            costs: { daily: 25.80, monthly: 774, currency: 'USD' }
          },
          health: {
            status: 'warning',
            uptime: 98.5,
            issues: [{ type: 'warning', message: 'High memory usage detected' }]
          },
          deployments: ['dep3', 'dep4', 'dep5'],
          createdAt: '2024-09-18T14:15:00Z',
          access: { owners: ['user1'], developers: ['user4'] }
        },
        {
          id: '3',
          name: 'test-integration',
          type: 'testing',
          description: 'Integration testing environment',
          status: 'inactive',
          infrastructure: {
            provider: 'gcp',
            region: 'us-central1',
            project: 'my-project-test',
            namespace: 'env-test-integration'
          },
          resources: {
            currentUsage: { cpu: 0, memory: 0, storage: 2, pods: 0 },
            limits: { cpu: 500, memory: 1024, storage: 10, pods: 5 },
            costs: { daily: 2.40, monthly: 72, currency: 'USD' }
          },
          health: {
            status: 'unknown',
            uptime: 0,
            issues: []
          },
          deployments: [],
          createdAt: '2024-09-15T09:00:00Z',
          access: { owners: ['user1'], developers: ['user5'] }
        }
      ];
      
      setEnvironments(mockEnvironments);
    } catch (error) {
      console.error('Failed to fetch environments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEnvironments = () => {
    let filtered = environments;

    if (searchTerm) {
      filtered = filtered.filter(env => 
        env.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        env.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(env => env.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(env => env.status === filterStatus);
    }

    setFilteredEnvironments(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'inactive': return <Square className="h-5 w-5 text-gray-400" />;
      case 'provisioning': return <Loader className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'terminating': return <Loader className="h-5 w-5 text-red-400 animate-spin" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-400" />;
      default: return <Square className="h-5 w-5 text-gray-400" />;
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Square className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      development: 'bg-blue-900 text-blue-300',
      staging: 'bg-green-900 text-green-300',
      testing: 'bg-purple-900 text-purple-300',
      integration: 'bg-orange-900 text-orange-300',
      uat: 'bg-pink-900 text-pink-300',
      sandbox: 'bg-gray-700 text-gray-300'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-700 text-gray-300';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-400" />
        <span className="ml-2 text-gray-400">Loading environments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Environment Management</h1>
          <p className="text-gray-400 mt-1">Manage your lower environments and resources</p>
        </div>
        <Link
          to="/environments/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Environment
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search environments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="testing">Testing</option>
              <option value="integration">Integration</option>
              <option value="uat">UAT</option>
              <option value="sandbox">Sandbox</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="provisioning">Provisioning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Environment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEnvironments.map((environment) => (
          <div key={environment.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100 mb-1">{environment.name}</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(environment.type)}`}>
                    {environment.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(environment.status)}
                  {getHealthIcon(environment.health.status)}
                </div>
              </div>
              {environment.description && (
                <p className="text-sm text-gray-400 mb-3">{environment.description}</p>
              )}
            </div>

            {/* Metrics */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{environment.resources.currentUsage.pods}</div>
                  <div className="text-xs text-gray-400">Active Pods</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{environment.deployments.length}</div>
                  <div className="text-xs text-gray-400">Deployments</div>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">CPU: {environment.resources.currentUsage.cpu}m / {environment.resources.limits.cpu}m</span>
                  <span className="text-gray-300">{Math.round((environment.resources.currentUsage.cpu / environment.resources.limits.cpu) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min((environment.resources.currentUsage.cpu / environment.resources.limits.cpu) * 100, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Memory: {environment.resources.currentUsage.memory}MB / {environment.resources.limits.memory}MB</span>
                  <span className="text-gray-300">{Math.round((environment.resources.currentUsage.memory / environment.resources.limits.memory) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min((environment.resources.currentUsage.memory / environment.resources.limits.memory) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Cost */}
              <div className="flex items-center justify-between mb-4 p-2 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-sm text-gray-300">Daily Cost</span>
                </div>
                <span className="font-semibold text-green-400">
                  {formatCurrency(environment.resources.costs.daily, environment.resources.costs.currency)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-750 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {environment.status === 'active' && (
                    <button className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Stop Environment">
                      <Square className="h-4 w-4" />
                    </button>
                  )}
                  {environment.status === 'inactive' && (
                    <button className="p-2 text-gray-400 hover:text-green-400 transition-colors" title="Start Environment">
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-blue-400 transition-colors" title="Settings">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors" title="Activity">
                    <Activity className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/environments/${environment.id}`}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEnvironments.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">No environments found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? "Try adjusting your search or filters"
              : "Create your first environment to get started"
            }
          </p>
          <Link
            to="/environments/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Environment
          </Link>
        </div>
      )}
    </div>
  );
};

export default EnvironmentsPage;