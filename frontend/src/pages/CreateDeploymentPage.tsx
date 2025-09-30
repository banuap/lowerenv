import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiService } from '../services/api';
import { ArrowLeft, Github, Cloud, Cog, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeploymentForm {
  name: string;
  description?: string;
  sourceType: 'pcf' | 'vm' | 'baremetal' | 'gke' | 'gce';
  githubRepo: string;
  branch: string;
  targetGCPProject: string;
  targetCluster: string;
  targetNamespace: string;
  environment: 'dev' | 'staging' | 'test';
  deploymentType: 'terraform' | 'helm' | 'ansible' | 'hybrid' | 'kubectl' | 'kustomize' | 'gke-autopilot' | 'gce-instance' | 'cloud-deployment-manager';
  terraformWorkspaceDir?: string;
  helmChartPath?: string;
  helmReleaseName?: string;
  ansiblePlaybookPath?: string;
  // New GKE/GCE specific fields
  kubectlManifestsPath?: string;
  kustomizationPath?: string;
  gkeRegion?: string;
  gceZone?: string;
  gceMachineType?: string;
  deploymentManagerTemplate?: string;
}

const CreateDeploymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<DeploymentForm>({
    defaultValues: {
      sourceType: 'vm',
      environment: 'dev',
      deploymentType: 'helm',
      branch: 'main',
      targetNamespace: 'default'
    }
  });

  const { data: gcpProjects } = useQuery({
    queryKey: ['gcp-projects'],
    queryFn: () => apiService.get('/gcp/projects'),
  });

  const validateRepo = useMutation({
    mutationFn: (repoUrl: string) => apiService.post('/github/validate', { repoUrl }),
    onSuccess: (data: any) => {
      // Handle different possible response structures
      const responseData = data?.data;
      const isValid = responseData?.isValid ?? responseData?.data?.isValid ?? false;
      
      if (isValid) {
        toast.success('Repository validated successfully!');
      } else {
        toast.error('Invalid repository URL');
      }
    },
  });

  const createDeployment = useMutation({
    mutationFn: (data: DeploymentForm) => {
      const deploymentData = {
        ...data,
        config: {
          ...(data.deploymentType === 'terraform' && {
            terraform: {
              workspaceDir: data.terraformWorkspaceDir || 'terraform',
              variables: {},
              backend: { type: 'gcs' }
            }
          }),
          ...(data.deploymentType === 'helm' && {
            helm: {
              chartPath: data.helmChartPath || 'chart',
              values: {},
              release: data.helmReleaseName || data.name,
              namespace: data.targetNamespace,
              timeout: 300
            }
          }),
          ...(data.deploymentType === 'ansible' && {
            ansible: {
              playbookPath: data.ansiblePlaybookPath || 'playbook.yml',
              inventory: 'inventory.ini',
              variables: {}
            }
          }),
          ...(data.deploymentType === 'kubectl' && {
            kubectl: {
              manifestsPath: data.kubectlManifestsPath || 'k8s/manifests',
              namespace: data.targetNamespace,
              waitForCompletion: true,
              timeout: 600
            }
          }),
          ...(data.deploymentType === 'kustomize' && {
            kustomize: {
              kustomizationPath: data.kustomizationPath || 'k8s/overlays/dev',
              namespace: data.targetNamespace,
              buildArgs: {}
            }
          }),
          ...(data.deploymentType === 'gke-autopilot' && {
            gkeAutopilot: {
              cluster: data.targetCluster,
              region: data.gkeRegion || 'us-central1',
              manifestsPath: data.kubectlManifestsPath || 'k8s/autopilot',
              namespace: data.targetNamespace,
              resourceLimits: {
                cpu: '1000m',
                memory: '2Gi'
              },
              autopilotFeatures: {
                verticalPodAutoscaling: true,
                horizontalPodAutoscaling: true,
                nodeAutoProvisioning: true
              }
            }
          }),
          ...(data.deploymentType === 'gce-instance' && {
            gceInstance: {
              instanceTemplate: `${data.name}-template`,
              zone: data.gceZone || 'us-central1-a',
              machineType: data.gceMachineType || 'e2-micro',
              diskConfig: {
                bootDisk: {
                  image: 'ubuntu-2004-lts',
                  sizeGb: 20,
                  type: 'pd-standard'
                }
              },
              networkConfig: {
                network: 'default',
                subnet: 'default',
                externalIP: true
              }
            }
          }),
          ...(data.deploymentType === 'cloud-deployment-manager' && {
            cloudDeploymentManager: {
              templatePath: data.deploymentManagerTemplate || 'templates/infrastructure.yaml',
              deploymentName: `${data.name}-dm`,
              properties: {},
              createPolicy: 'CREATE_OR_ACQUIRE',
              deletePolicy: 'DELETE'
            }
          })
        }
      };
      return apiService.post('/deployments', deploymentData);
    },
    onSuccess: () => {
      toast.success('Deployment created successfully!');
      navigate('/deployments');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create deployment');
    },
  });

  const watchedValues = watch();

  const onSubmit = (data: DeploymentForm) => {
    createDeployment.mutate(data);
  };

  const handleValidateRepo = () => {
    if (watchedValues.githubRepo) {
      validateRepo.mutate(watchedValues.githubRepo);
    }
  };

  const steps = [
    { id: 1, name: 'Basic Info', icon: Cog },
    { id: 2, name: 'Source Config', icon: Github },
    { id: 3, name: 'Target Config', icon: Cloud },
    { id: 4, name: 'Review', icon: Save },
  ];

  const gcpProjectsData = Array.isArray(gcpProjects?.data) ? gcpProjects.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/deployments')}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-100" />
        </button>
        <h1 className="text-2xl font-bold text-gray-100">Create New Deployment</h1>
      </div>

      {/* Steps */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center">
                  <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                    step.id <= currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'border-2 border-gray-500 bg-gray-700 text-gray-300'
                  }`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className={`ml-4 text-sm font-medium ${
                    step.id <= currentStep ? 'text-blue-400' : 'text-gray-300'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className={`absolute top-4 left-4 -ml-px mt-0.5 h-0.5 w-full ${
                    step.id < currentStep ? 'bg-blue-600' : 'bg-gray-600'
                  }`} />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-1">
                  Deployment Name *
                </label>
                <input
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., my-app-dev"
                />
                {errors.name && (
                  <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="environment" className="block text-sm font-medium text-gray-200 mb-1">
                  Environment *
                </label>
                <select id="environment" {...register('environment')} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="dev">Development</option>
                  <option value="staging">Staging</option>
                  <option value="test">Test</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description of this deployment..."
              />
            </div>

            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-200 mb-1">
                  Source Type *
                </legend>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {(['pcf', 'vm', 'baremetal', 'gke', 'gce'] as const).map((type) => (
                    <label key={type} className="relative">
                      <input
                        {...register('sourceType')}
                        type="radio"
                        value={type}
                        className="sr-only peer"
                      />
                      <div className="p-4 border border-gray-600 bg-gray-700 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-900 hover:bg-gray-600 transition-colors">
                        <div className="text-sm font-medium text-gray-100 capitalize">
                          {type === 'pcf' ? 'PCF' : 
                           type === 'gke' ? 'GKE' : 
                           type === 'gce' ? 'GCE' : type}
                        </div>
                        <div className="text-xs text-gray-300">
                          {type === 'pcf' && 'Pivotal Cloud Foundry'}
                          {type === 'vm' && 'Virtual Machine'}
                          {type === 'baremetal' && 'Bare Metal Server'}
                          {type === 'gke' && 'Google Kubernetes Engine'}
                          {type === 'gce' && 'Google Compute Engine'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {/* Step 2: Source Configuration */}
        {currentStep === 2 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Source Configuration</h3>
            
            <div>
              <label htmlFor="githubRepo" className="block text-sm font-medium text-gray-200 mb-1">
                GitHub Repository URL *
              </label>
              <div className="flex space-x-2">
                <input
                  id="githubRepo"
                  {...register('githubRepo', { required: 'Repository URL is required' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1"
                  placeholder="https://github.com/user/repo.git"
                />
                <button
                  type="button"
                  onClick={handleValidateRepo}
                  disabled={validateRepo.isPending}
                  className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 disabled:opacity-50 transition-colors"
                >
                  {validateRepo.isPending ? 'Validating...' : 'Validate'}
                </button>
              </div>
              {errors.githubRepo && (
                <p className="text-sm text-red-400 mt-1">{errors.githubRepo.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-200 mb-1">
                Branch *
              </label>
              <input
                id="branch"
                {...register('branch', { required: 'Branch is required' })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="main"
              />
              {errors.branch && (
                <p className="text-sm text-red-400 mt-1">{errors.branch.message}</p>
              )}
            </div>

            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-200 mb-1">
                  Deployment Type *
                </legend>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Traditional deployment types */}
                  {(['terraform', 'helm', 'ansible', 'hybrid'] as const).map((type) => (
                    <label key={type} className="relative">
                      <input
                        {...register('deploymentType')}
                        type="radio"
                        value={type}
                        className="sr-only peer"
                      />
                      <div className="p-3 border border-gray-600 bg-gray-700 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-900 hover:bg-gray-600 transition-colors">
                        <div className="text-sm font-medium text-gray-100 capitalize">
                          {type}
                        </div>
                        <div className="text-xs text-gray-300">
                          {type === 'terraform' && 'Infrastructure as Code'}
                          {type === 'helm' && 'Kubernetes Package Manager'}
                          {type === 'ansible' && 'Configuration Management'}
                          {type === 'hybrid' && 'Multi-tool Deployment'}
                        </div>
                      </div>
                    </label>
                  ))}
                  
                  {/* GKE/GCE specific deployment types */}
                  {(['kubectl', 'kustomize', 'gke-autopilot', 'gce-instance', 'cloud-deployment-manager'] as const).map((type) => (
                    <label key={type} className="relative">
                      <input
                        {...register('deploymentType')}
                        type="radio"
                        value={type}
                        className="sr-only peer"
                      />
                      <div className="p-3 border border-gray-600 bg-gray-700 rounded-lg cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-900 hover:bg-gray-600 transition-colors">
                        <div className="text-sm font-medium text-gray-100">
                          {type === 'kubectl' && 'kubectl'}
                          {type === 'kustomize' && 'Kustomize'}
                          {type === 'gke-autopilot' && 'GKE Autopilot'}
                          {type === 'gce-instance' && 'GCE Instance'}
                          {type === 'cloud-deployment-manager' && 'Cloud DM'}
                        </div>
                        <div className="text-xs text-gray-300">
                          {type === 'kubectl' && 'Direct K8s Manifests'}
                          {type === 'kustomize' && 'K8s Configuration Tool'}
                          {type === 'gke-autopilot' && 'Serverless Kubernetes'}
                          {type === 'gce-instance' && 'Virtual Machine'}
                          {type === 'cloud-deployment-manager' && 'Google Cloud DM'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Conditional fields based on deployment type */}
            {watchedValues.deploymentType === 'terraform' && (
              <div>
                <label htmlFor="terraformWorkspaceDir" className="block text-sm font-medium text-gray-200 mb-1">
                  Terraform Workspace Directory
                </label>
                <input
                  id="terraformWorkspaceDir"
                  {...register('terraformWorkspaceDir')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="terraform"
                />
              </div>
            )}

            {watchedValues.deploymentType === 'helm' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="helmChartPath" className="block text-sm font-medium text-gray-200 mb-1">
                    Chart Path
                  </label>
                  <input
                    id="helmChartPath"
                    {...register('helmChartPath')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="chart"
                  />
                </div>
                <div>
                  <label htmlFor="helmReleaseName" className="block text-sm font-medium text-gray-200 mb-1">
                    Release Name
                  </label>
                  <input
                    id="helmReleaseName"
                    {...register('helmReleaseName')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Auto-generated from deployment name"
                  />
                </div>
              </div>
            )}

            {watchedValues.deploymentType === 'ansible' && (
              <div>
                <label htmlFor="ansiblePlaybookPath" className="block text-sm font-medium text-gray-200 mb-1">
                  Playbook Path
                </label>
                <input
                  id="ansiblePlaybookPath"
                  {...register('ansiblePlaybookPath')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="playbook.yml"
                />
              </div>
            )}

            {/* New GKE/GCE deployment type configurations */}
            {watchedValues.deploymentType === 'kubectl' && (
              <div>
                <label htmlFor="kubectlManifestsPath" className="block text-sm font-medium text-gray-200 mb-1">
                  Kubernetes Manifests Path
                </label>
                <input
                  id="kubectlManifestsPath"
                  {...register('kubectlManifestsPath')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="k8s/manifests"
                />
              </div>
            )}

            {watchedValues.deploymentType === 'kustomize' && (
              <div>
                <label htmlFor="kustomizationPath" className="block text-sm font-medium text-gray-200 mb-1">
                  Kustomization Path
                </label>
                <input
                  id="kustomizationPath"
                  {...register('kustomizationPath')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="k8s/overlays/dev"
                />
              </div>
            )}

            {watchedValues.deploymentType === 'gke-autopilot' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gkeRegion" className="block text-sm font-medium text-gray-200 mb-1">
                    GKE Region
                  </label>
                  <input
                    id="gkeRegion"
                    {...register('gkeRegion')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="us-central1"
                  />
                </div>
                <div>
                  <label htmlFor="kubectlManifestsPath" className="block text-sm font-medium text-gray-200 mb-1">
                    Manifests Path
                  </label>
                  <input
                    id="kubectlManifestsPath"
                    {...register('kubectlManifestsPath')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="k8s/autopilot"
                  />
                </div>
              </div>
            )}

            {watchedValues.deploymentType === 'gce-instance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gceZone" className="block text-sm font-medium text-gray-200 mb-1">
                    GCE Zone
                  </label>
                  <input
                    id="gceZone"
                    {...register('gceZone')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="us-central1-a"
                  />
                </div>
                <div>
                  <label htmlFor="gceMachineType" className="block text-sm font-medium text-gray-200 mb-1">
                    Machine Type
                  </label>
                  <select
                    id="gceMachineType"
                    {...register('gceMachineType')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Machine Type</option>
                    <option value="e2-micro">e2-micro (1 vCPU, 1GB RAM)</option>
                    <option value="e2-small">e2-small (1 vCPU, 2GB RAM)</option>
                    <option value="e2-medium">e2-medium (1 vCPU, 4GB RAM)</option>
                    <option value="e2-standard-2">e2-standard-2 (2 vCPU, 8GB RAM)</option>
                    <option value="e2-standard-4">e2-standard-4 (4 vCPU, 16GB RAM)</option>
                  </select>
                </div>
              </div>
            )}

            {watchedValues.deploymentType === 'cloud-deployment-manager' && (
              <div>
                <label htmlFor="deploymentManagerTemplate" className="block text-sm font-medium text-gray-200 mb-1">
                  Deployment Manager Template Path
                </label>
                <input
                  id="deploymentManagerTemplate"
                  {...register('deploymentManagerTemplate')}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="templates/infrastructure.yaml"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Target Configuration */}
        {currentStep === 3 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Target Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="targetGCPProject" className="block text-sm font-medium text-gray-200 mb-1">
                  GCP Project *
                </label>
                <select
                  id="targetGCPProject"
                  {...register('targetGCPProject', { required: 'GCP Project is required' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select GCP Project</option>
                  {gcpProjectsData.map((project: any) => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.displayName} ({project.projectId})
                    </option>
                  ))}
                </select>
                {errors.targetGCPProject && (
                  <p className="text-sm text-red-400 mt-1">{errors.targetGCPProject.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="targetCluster" className="block text-sm font-medium text-gray-200 mb-1">
                  GKE Cluster *
                </label>
                <input
                  id="targetCluster"
                  {...register('targetCluster', { required: 'Cluster is required' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="cluster-name"
                />
                {errors.targetCluster && (
                  <p className="text-sm text-red-400 mt-1">{errors.targetCluster.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="targetNamespace" className="block text-sm font-medium text-gray-200 mb-1">
                Target Namespace *
              </label>
              <input
                id="targetNamespace"
                {...register('targetNamespace', { required: 'Namespace is required' })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="default"
              />
              {errors.targetNamespace && (
                <p className="text-sm text-red-400 mt-1">{errors.targetNamespace.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-100">Review Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-100">Basic Information</h4>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-300">Name:</span> <span className="text-gray-100">{watchedValues.name}</span></div>
                  <div><span className="text-gray-300">Environment:</span> <span className="text-gray-100">{watchedValues.environment}</span></div>
                  <div><span className="text-gray-300">Source Type:</span> <span className="text-gray-100">{watchedValues.sourceType}</span></div>
                  {watchedValues.description && (
                    <div><span className="text-gray-300">Description:</span> <span className="text-gray-100">{watchedValues.description}</span></div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-100">Source Configuration</h4>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-300">Repository:</span> <span className="text-gray-100">{watchedValues.githubRepo}</span></div>
                  <div><span className="text-gray-300">Branch:</span> <span className="text-gray-100">{watchedValues.branch}</span></div>
                  <div><span className="text-gray-300">Deployment Type:</span> <span className="text-gray-100">{watchedValues.deploymentType}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-100">Target Configuration</h4>
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-300">GCP Project:</span> <span className="text-gray-100">{watchedValues.targetGCPProject}</span></div>
                  <div><span className="text-gray-300">Cluster:</span> <span className="text-gray-100">{watchedValues.targetCluster}</span></div>
                  <div><span className="text-gray-300">Namespace:</span> <span className="text-gray-100">{watchedValues.targetNamespace}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={createDeployment.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createDeployment.isPending ? 'Creating...' : 'Create Deployment'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateDeploymentPage;