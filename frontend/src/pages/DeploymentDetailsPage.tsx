import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { DeploymentConfig, Pipeline, PipelineStep } from '@shared/types';
import { 
  ArrowLeft, 
  Play, 
  RefreshCw, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  GitBranch,
  Cloud,
  Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { io } from 'socket.io-client';

const DeploymentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);

  // Fetch deployment details
  const { data: deployment, isLoading: deploymentLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => apiService.get<DeploymentConfig>(`/deployments/${id}`),
    enabled: !!id,
  });

  // Fetch pipelines for this deployment
  const { data: pipelines, refetch: refetchPipelines } = useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => apiService.get<Pipeline[]>(`/pipelines/${id}`),
    enabled: !!id,
  });

  // Fetch specific pipeline details
  const { data: pipelineDetails } = useQuery({
    queryKey: ['pipeline-details', selectedPipeline],
    queryFn: () => apiService.get<Pipeline>(`/pipelines/details/${selectedPipeline}`),
    enabled: !!selectedPipeline,
  });

  // Trigger deployment mutation
  const triggerDeployment = useMutation({
    mutationFn: () => apiService.post(`/deployments/${id}/trigger`),
    onSuccess: (data) => {
      toast.success('Deployment triggered successfully!');
      if (data.data && typeof data.data === 'object' && 'pipelineId' in data.data && typeof data.data.pipelineId === 'string') {
        setSelectedPipeline(data.data.pipelineId);
      }
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      refetchPipelines();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to trigger deployment');
    },
  });

  // Socket.IO for real-time updates
  useEffect(() => {
    if (id) {
      const newSocket = io('ws://localhost:5000');

      newSocket.emit('join-deployment', id);

      newSocket.on('pipeline-update', (data) => {
        queryClient.invalidateQueries({ queryKey: ['pipelines', id] });
        if (data.pipelineId === selectedPipeline) {
          queryClient.invalidateQueries({ queryKey: ['pipeline-details', selectedPipeline] });
        }
      });

      return () => {
        newSocket.emit('leave-deployment', id);
        newSocket.close();
      };
    }
  }, [id, selectedPipeline, queryClient]);

  if (deploymentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!deployment?.data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Deployment not found</h2>
        <p className="text-gray-500 mt-2">The deployment you're looking for doesn't exist.</p>
        <Link to="/deployments" className="btn-primary mt-4">
          Back to Deployments
        </Link>
      </div>
    );
  }

  const deploymentData = deployment.data;
  const pipelineList = pipelines?.data || [];
  const latestPipeline = pipelineList[0];

  const getStepIcon = (step: PipelineStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/deployments')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{deploymentData.name}</h1>
            <p className="text-gray-500">{deploymentData.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`status-${deploymentData.status}`}>
            {deploymentData.status}
          </span>
          {deploymentData.status !== 'running' && (
            <button
              onClick={() => triggerDeployment.mutate()}
              disabled={triggerDeployment.isPending}
              className="btn-primary inline-flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              {triggerDeployment.isPending ? 'Triggering...' : 'Deploy'}
            </button>
          )}
          <Link
            to={`/deployments/${id}/edit`}
            className="btn-secondary inline-flex items-center"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </div>
      </div>

      {/* Deployment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <GitBranch className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Source</h3>
              <p className="text-sm text-gray-500 capitalize">{deploymentData.sourceType}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Repository:</span>
              <div className="font-mono text-xs text-gray-700 truncate">{deploymentData.githubRepo}</div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Branch:</span> <span className="font-medium">{deploymentData.branch}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Cloud className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Target</h3>
              <p className="text-sm text-gray-500 capitalize">{deploymentData.environment}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Project:</span> <span className="font-medium">{deploymentData.targetGCPProject}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Cluster:</span> <span className="font-medium">{deploymentData.targetCluster}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Namespace:</span> <span className="font-medium">{deploymentData.targetNamespace}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Configuration</h3>
              <p className="text-sm text-gray-500 capitalize">{deploymentData.deploymentType}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">Created:</span> <span className="font-medium">{format(new Date(deploymentData.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {deploymentData.lastDeployedAt && (
              <div className="text-sm">
                <span className="text-gray-500">Last Deploy:</span> <span className="font-medium">{format(new Date(deploymentData.lastDeployedAt), 'MMM d, HH:mm')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Pipeline History</h3>
            <button
              onClick={() => refetchPipelines()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {pipelineList.length === 0 ? (
            <div className="text-center py-8">
              <Terminal className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No deployments yet</p>
              <p className="text-sm text-gray-400">Trigger a deployment to see pipeline execution</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineList.slice(0, 5).map((pipeline: Pipeline) => (
                <button
                  key={pipeline.id}
                  type="button"
                  className={`w-full p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    selectedPipeline === pipeline.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedPipeline(pipeline.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPipeline(pipeline.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className={`status-${pipeline.status}`}>
                        {pipeline.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {pipeline.startTime && format(new Date(pipeline.startTime), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                  {pipeline.endTime && pipeline.startTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {Math.round((new Date(pipeline.endTime).getTime() - new Date(pipeline.startTime).getTime()) / 1000 / 60)}min
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline Details */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {selectedPipeline ? 'Pipeline Steps' : 'Latest Pipeline'}
          </h3>

          {(() => {
            const pipeline = selectedPipeline 
              ? pipelineDetails?.data 
              : latestPipeline;

            if (!pipeline) {
              return (
                <div className="text-center py-8 text-gray-500">
                  No pipeline data available
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`status-${pipeline.status}`}>
                    {pipeline.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {pipeline.steps?.map((step: PipelineStep) => (
                    <div key={step.id} className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {getStepIcon(step)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {step.name}
                          </p>
                          <span className={`status-${step.status} text-xs`}>
                            {step.status}
                          </span>
                        </div>
                        {step.startTime && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(step.startTime), 'HH:mm:ss')}
                            {step.endTime && ` - ${format(new Date(step.endTime), 'HH:mm:ss')}`}
                          </p>
                        )}
                        {step.logs && step.logs.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-primary-600 cursor-pointer">
                              View logs ({step.logs.length} entries)
                            </summary>
                            <div className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                              {step.logs.slice(-5).map((log, logIndex) => (
                                <div key={`log-${step.id}-${logIndex}`}>{log}</div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default DeploymentDetailsPage;