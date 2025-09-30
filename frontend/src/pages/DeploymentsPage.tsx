import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { DeploymentConfig } from '@shared/types';
import { 
  Plus, 
  Play, 
  Eye, 
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Rocket
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DeploymentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: deploymentsData, isLoading, refetch } = useQuery({
    queryKey: ['deployments', { environment: environmentFilter, status: statusFilter }],
    queryFn: () => apiService.get(`/deployments?environment=${environmentFilter}&status=${statusFilter}`),
  });

  const triggerDeployment = useMutation({
    mutationFn: (deploymentId: string) => apiService.post(`/deployments/${deploymentId}/trigger`),
    onSuccess: () => {
      toast.success('Deployment triggered successfully!');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to trigger deployment');
    },
  });

  const deleteDeployment = useMutation({
    mutationFn: (deploymentId: string) => apiService.delete(`/deployments/${deploymentId}`),
    onSuccess: () => {
      toast.success('Deployment deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete deployment');
    },
  });

  const deployments = Array.isArray(deploymentsData?.data) ? deploymentsData.data : [];
  const filteredDeployments = deployments.filter((deployment: DeploymentConfig) =>
    deployment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deployment.githubRepo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTriggerDeployment = (deploymentId: string, deploymentName: string) => {
    if (confirm(`Are you sure you want to trigger deployment "${deploymentName}"?`)) {
      triggerDeployment.mutate(deploymentId);
    }
  };

  const handleDeleteDeployment = (deploymentId: string, deploymentName: string) => {
    if (confirm(`Are you sure you want to delete deployment "${deploymentName}"? This action cannot be undone.`)) {
      deleteDeployment.mutate(deploymentId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
        <Link
          to="/deployments/create"
          className="btn-primary inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Deployment
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search deployments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Environments</option>
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="test">Test</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={() => refetch()}
            className="btn-secondary inline-flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Deployments List */}
      <div className="card overflow-hidden">
        {filteredDeployments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deployments found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || environmentFilter || statusFilter 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first deployment'
              }
            </p>
            <Link to="/deployments/create" className="btn-primary">
              Create Deployment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeployments.map((deployment: DeploymentConfig) => (
                  <tr key={deployment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {deployment.name}
                        </div>
                        {deployment.description && (
                          <div className="text-sm text-gray-500">
                            {deployment.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {deployment.environment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize mr-2">
                            {deployment.sourceType}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                          {deployment.githubRepo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-${deployment.status}`}>
                        {deployment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(deployment.updatedAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/deployments/${deployment.id}`}
                          className="text-primary-600 hover:text-primary-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {deployment.status !== 'running' && (
                          <button
                            onClick={() => handleTriggerDeployment(deployment.id, deployment.name)}
                            disabled={triggerDeployment.isPending}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Trigger Deployment"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        
                        <Link
                          to={`/deployments/${deployment.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        
                        {deployment.status !== 'running' && (
                          <button
                            onClick={() => handleDeleteDeployment(deployment.id, deployment.name)}
                            disabled={deleteDeployment.isPending}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentsPage;