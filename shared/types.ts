export interface DeploymentConfig {
  id: string;
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
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastDeployedAt?: Date;
  config: {
    terraform?: TerraformConfig;
    helm?: HelmConfig;
    ansible?: AnsibleConfig;
    kubectl?: KubectlConfig;
    kustomize?: KustomizeConfig;
    gkeAutopilot?: GKEAutopilotConfig;
    gceInstance?: GCEInstanceConfig;
    cloudDeploymentManager?: CloudDeploymentManagerConfig;
  };
}

export interface TerraformConfig {
  workspaceDir: string;
  variables: Record<string, any>;
  backend: {
    type: 'gcs' | 'local';
    bucket?: string;
    prefix?: string;
  };
}

export interface HelmConfig {
  chartPath: string;
  values: Record<string, any>;
  release: string;
  namespace: string;
  timeout: number;
}

export interface AnsibleConfig {
  playbookPath: string;
  inventory: string;
  variables: Record<string, any>;
  vault?: {
    passwordFile: string;
  };
}

// GKE and GCE specific deployment configurations
export interface KubectlConfig {
  manifestsPath: string;
  applyOrder?: string[]; // Order of manifest files to apply
  namespace: string;
  kubeconfig?: string;
  dryRun?: boolean;
  waitForCompletion?: boolean;
  timeout?: number;
}

export interface KustomizeConfig {
  kustomizationPath: string;
  overlayPath?: string;
  namespace: string;
  kubeconfig?: string;
  buildArgs?: Record<string, string>;
  images?: Array<{
    name: string;
    newTag: string;
  }>;
}

export interface GKEAutopilotConfig {
  cluster: string;
  region: string;
  manifestsPath: string;
  namespace: string;
  resourceLimits: {
    cpu: string;
    memory: string;
  };
  autopilotFeatures: {
    verticalPodAutoscaling?: boolean;
    horizontalPodAutoscaling?: boolean;
    nodeAutoProvisioning?: boolean;
  };
}

export interface GCEInstanceConfig {
  instanceTemplate: string;
  zone: string;
  machineType: string;
  diskConfig: {
    bootDisk: {
      image: string;
      sizeGb: number;
      type: 'pd-standard' | 'pd-ssd' | 'pd-balanced';
    };
    additionalDisks?: Array<{
      name: string;
      sizeGb: number;
      type: string;
    }>;
  };
  networkConfig: {
    network: string;
    subnet: string;
    externalIP?: boolean;
    tags?: string[];
  };
  metadata?: Record<string, string>;
  serviceAccount?: {
    email: string;
    scopes: string[];
  };
  startupScript?: string;
}

export interface CloudDeploymentManagerConfig {
  templatePath: string;
  deploymentName: string;
  properties: Record<string, any>;
  imports?: string[];
  createPolicy?: 'CREATE_OR_ACQUIRE' | 'ACQUIRE';
  deletePolicy?: 'DELETE' | 'ABANDON';
  preview?: boolean;
}

export type DeploymentStatus = 'pending' | 'running' | 'completed' | 'failed';
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';

export interface PipelineStep {
  id: string;
  name: string;
  type: 'clone' | 'terraform-plan' | 'terraform-apply' | 'helm-deploy' | 'ansible-run' | 'post-deploy';
  status: PipelineStepStatus;
  startTime?: Date;
  endTime?: Date;
  logs: string[];
  dependencies: string[];
  config: Record<string, any>;
}

export interface Pipeline {
  id: string;
  deploymentId: string;
  status: PipelineStatus;
  steps: PipelineStep[];
  startTime?: Date;
  endTime?: Date;
  triggeredBy: string;
}

export interface GitHubRepository {
  name: string;
  fullName: string;
  url: string;
  branches: string[];
  defaultBranch: string;
}

export interface GCPProject {
  projectId: string;
  displayName: string;
  clusters: GKECluster[];
}

export interface GKECluster {
  name: string;
  location: string;
  status: string;
  nodeCount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'developer' | 'viewer';
  permissions: string[];
}

export interface DeploymentMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  averageDeploymentTime: number;
  deploymentsToday: number;
  deploymentsThisWeek: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}