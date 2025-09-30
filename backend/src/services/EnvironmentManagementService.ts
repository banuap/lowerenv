import { Environment, IEnvironment } from '../models/Environment';
import { GCPService } from './GCPService';
import { TerraformService } from './TerraformService';
import { logger } from '../config/logger';

export interface EnvironmentProvisioningRequest {
  name: string;
  type: 'development' | 'staging' | 'testing' | 'integration' | 'uat' | 'sandbox';
  description?: string;
  infrastructure: {
    provider: 'gcp' | 'aws' | 'azure' | 'on-premises';
    region: string;
    project: string;
    resourceQuota: {
      cpu: string;
      memory: string;
      storage: string;
      pods: number;
    };
  };
  configuration?: {
    autoShutdown?: boolean;
    monitoring?: boolean;
    backup?: boolean;
  };
  metadata?: {
    team?: string;
    project?: string;
    costCenter?: string;
    expiration?: Date;
  };
  createdBy: string;
}

export interface EnvironmentResourceMetrics {
  cpu: {
    used: number;
    total: number;
    percentage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  pods: {
    running: number;
    total: number;
    percentage: number;
  };
  costs: {
    hourly: number;
    daily: number;
    monthly: number;
    currency: string;
  };
}

export class EnvironmentManagementService {
  private gcpService: GCPService;
  private terraformService: TerraformService;

  constructor() {
    this.gcpService = new GCPService();
    this.terraformService = new TerraformService();
  }

  // Create a new environment
  async createEnvironment(request: EnvironmentProvisioningRequest): Promise<IEnvironment> {
    try {
      logger.info(`Creating new environment: ${request.name}`, { request });

      // Create environment record in database
      const environment = new Environment({
        name: request.name,
        type: request.type,
        description: request.description,
        status: 'provisioning',
        infrastructure: {
          provider: request.infrastructure.provider,
          region: request.infrastructure.region,
          project: request.infrastructure.project,
          namespace: `env-${request.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          resourceQuota: request.infrastructure.resourceQuota,
          networking: {
            ingressEnabled: true,
            loadBalancerEnabled: false
          }
        },
        configuration: {
          autoShutdown: {
            enabled: request.configuration?.autoShutdown || false
          },
          backup: {
            enabled: request.configuration?.backup !== false,
            retention: 7
          },
          monitoring: {
            enabled: request.configuration?.monitoring !== false,
            alerting: true,
            logAggregation: true
          },
          security: {
            networkPolicies: true,
            podSecurityPolicies: true,
            secretsEncryption: true
          }
        },
        access: {
          owners: [request.createdBy],
          developers: [],
          viewers: [],
          serviceAccounts: []
        },
        metadata: {
          team: request.metadata?.team,
          project: request.metadata?.project,
          costCenter: request.metadata?.costCenter,
          expiration: request.metadata?.expiration,
          tags: new Map([
            ['environment-type', request.type],
            ['managed-by', 'lower-env-platform'],
            ['created-at', new Date().toISOString()]
          ])
        },
        resources: {
          currentUsage: {
            cpu: 0,
            memory: 0,
            storage: 0,
            pods: 0
          },
          limits: {
            cpu: this.parseCpuLimit(request.infrastructure.resourceQuota.cpu),
            memory: this.parseMemoryLimit(request.infrastructure.resourceQuota.memory),
            storage: this.parseStorageLimit(request.infrastructure.resourceQuota.storage),
            pods: request.infrastructure.resourceQuota.pods
          },
          costs: {
            daily: 0,
            monthly: 0,
            currency: 'USD'
          }
        },
        health: {
          status: 'unknown',
          lastCheck: new Date(),
          uptime: 0,
          issues: []
        },
        deployments: [],
        createdBy: request.createdBy
      });

      await environment.save();

      // Start provisioning infrastructure asynchronously
      this.provisionEnvironmentInfrastructure(environment).catch(error => {
        logger.error(`Failed to provision infrastructure for environment ${environment.name}`, { error });
        this.updateEnvironmentStatus(environment._id, 'error');
      });

      return environment;
    } catch (error) {
      logger.error('Failed to create environment', { error, request });
      throw error;
    }
  }

  // Provision environment infrastructure
  private async provisionEnvironmentInfrastructure(environment: IEnvironment): Promise<void> {
    try {
      logger.info(`Provisioning infrastructure for environment: ${environment.name}`);

      // Step 1: Create namespace in Kubernetes cluster
      await this.gcpService.createNamespace(
        environment.infrastructure.project,
        environment.infrastructure.cluster || 'default',
        environment.infrastructure.namespace
      );

      // Step 2: Apply resource quotas
      await this.gcpService.applyResourceQuota(
        environment.infrastructure.project,
        environment.infrastructure.cluster || 'default',
        environment.infrastructure.namespace,
        environment.infrastructure.resourceQuota
      );

      // Step 3: Set up networking (if required)
      if (environment.infrastructure.networking.ingressEnabled) {
        await this.gcpService.setupIngress(
          environment.infrastructure.project,
          environment.infrastructure.cluster || 'default',
          environment.infrastructure.namespace
        );
      }

      // Step 4: Configure monitoring and logging
      if (environment.configuration.monitoring.enabled) {
        await this.setupMonitoring(environment);
      }

      // Step 5: Apply security policies
      if (environment.configuration.security.networkPolicies) {
        await this.applySecurityPolicies(environment);
      }

      // Step 6: Set up auto-shutdown if enabled
      if (environment.configuration.autoShutdown.enabled) {
        await this.setupAutoShutdown(environment);
      }

      // Update environment status to active
      await this.updateEnvironmentStatus(environment._id, 'active');
      
      logger.info(`Successfully provisioned environment: ${environment.name}`);
    } catch (error) {
      logger.error(`Failed to provision infrastructure for environment ${environment.name}`, { error });
      await this.updateEnvironmentStatus(environment._id, 'error');
      throw error;
    }
  }

  // Get environment metrics and health status
  async getEnvironmentMetrics(environmentId: string): Promise<EnvironmentResourceMetrics> {
    try {
      const environment = await Environment.findById(environmentId);
      if (!environment) {
        throw new Error('Environment not found');
      }

      // Get real-time metrics from GCP/Kubernetes
      const metrics = await this.gcpService.getNamespaceMetrics(
        environment.infrastructure.project,
        environment.infrastructure.cluster || 'default',
        environment.infrastructure.namespace
      );

      const costs = await this.gcpService.getNamespaceCosts(
        environment.infrastructure.project,
        environment.infrastructure.namespace
      );

      return {
        cpu: {
          used: metrics.cpu.used,
          total: metrics.cpu.total,
          percentage: (metrics.cpu.used / metrics.cpu.total) * 100
        },
        memory: {
          used: metrics.memory.used,
          total: metrics.memory.total,
          percentage: (metrics.memory.used / metrics.memory.total) * 100
        },
        storage: {
          used: metrics.storage.used,
          total: metrics.storage.total,
          percentage: (metrics.storage.used / metrics.storage.total) * 100
        },
        pods: {
          running: metrics.pods.running,
          total: environment.infrastructure.resourceQuota.pods,
          percentage: (metrics.pods.running / environment.infrastructure.resourceQuota.pods) * 100
        },
        costs: {
          hourly: costs.hourly,
          daily: costs.daily,
          monthly: costs.monthly,
          currency: costs.currency
        }
      };
    } catch (error) {
      logger.error('Failed to get environment metrics', { error, environmentId });
      throw error;
    }
  }

  // Scale environment resources
  async scaleEnvironment(
    environmentId: string, 
    resourceUpdates: Partial<{
      cpu: string;
      memory: string;
      storage: string;
      pods: number;
    }>
  ): Promise<void> {
    try {
      const environment = await Environment.findById(environmentId);
      if (!environment) {
        throw new Error('Environment not found');
      }

      logger.info(`Scaling environment ${environment.name}`, { resourceUpdates });

      // Update resource quotas in Kubernetes
      const newQuota = {
        ...environment.infrastructure.resourceQuota,
        ...resourceUpdates
      };

      await this.gcpService.updateResourceQuota(
        environment.infrastructure.project,
        environment.infrastructure.cluster || 'default',
        environment.infrastructure.namespace,
        newQuota
      );

      // Update database record
      environment.infrastructure.resourceQuota = newQuota;
      environment.resources.limits = {
        cpu: this.parseCpuLimit(newQuota.cpu),
        memory: this.parseMemoryLimit(newQuota.memory),
        storage: this.parseStorageLimit(newQuota.storage),
        pods: newQuota.pods
      };

      await environment.save();

      logger.info(`Successfully scaled environment ${environment.name}`);
    } catch (error) {
      logger.error('Failed to scale environment', { error, environmentId, resourceUpdates });
      throw error;
    }
  }

  // Shutdown environment
  async shutdownEnvironment(environmentId: string, permanent: boolean = false): Promise<void> {
    try {
      const environment = await Environment.findById(environmentId);
      if (!environment) {
        throw new Error('Environment not found');
      }

      logger.info(`Shutting down environment ${environment.name}`, { permanent });

      if (permanent) {
        // Permanently delete environment
        await this.gcpService.deleteNamespace(
          environment.infrastructure.project,
          environment.infrastructure.cluster || 'default',
          environment.infrastructure.namespace
        );

        await Environment.findByIdAndDelete(environmentId);
      } else {
        // Temporarily shutdown (scale to zero)
        await this.gcpService.scaleNamespaceToZero(
          environment.infrastructure.project,
          environment.infrastructure.cluster || 'default',
          environment.infrastructure.namespace
        );

        environment.status = 'inactive';
        await environment.save();
      }

      logger.info(`Successfully shut down environment ${environment.name}`);
    } catch (error) {
      logger.error('Failed to shutdown environment', { error, environmentId, permanent });
      throw error;
    }
  }

  // Start environment (from shutdown state)
  async startEnvironment(environmentId: string): Promise<void> {
    try {
      const environment = await Environment.findById(environmentId);
      if (!environment) {
        throw new Error('Environment not found');
      }

      if (environment.status !== 'inactive') {
        throw new Error('Environment is not in inactive state');
      }

      logger.info(`Starting environment ${environment.name}`);

      // Restore resource quotas
      await this.gcpService.updateResourceQuota(
        environment.infrastructure.project,
        environment.infrastructure.cluster || 'default',
        environment.infrastructure.namespace,
        environment.infrastructure.resourceQuota
      );

      environment.status = 'active';
      await environment.save();

      logger.info(`Successfully started environment ${environment.name}`);
    } catch (error) {
      logger.error('Failed to start environment', { error, environmentId });
      throw error;
    }
  }

  // Helper methods
  private async updateEnvironmentStatus(environmentId: any, status: string): Promise<void> {
    await Environment.findByIdAndUpdate(environmentId, { status });
  }

  private async setupMonitoring(environment: IEnvironment): Promise<void> {
    // Implementation for setting up monitoring (Prometheus, Grafana, etc.)
    logger.info(`Setting up monitoring for environment ${environment.name}`);
  }

  private async applySecurityPolicies(environment: IEnvironment): Promise<void> {
    // Implementation for applying security policies
    logger.info(`Applying security policies for environment ${environment.name}`);
  }

  private async setupAutoShutdown(environment: IEnvironment): Promise<void> {
    // Implementation for setting up auto-shutdown schedules
    logger.info(`Setting up auto-shutdown for environment ${environment.name}`);
  }

  private parseCpuLimit(cpu: string): number {
    // Convert CPU string (e.g., "2", "2000m") to millicores
    if (cpu.endsWith('m')) {
      return parseInt(cpu.slice(0, -1));
    }
    return parseInt(cpu) * 1000;
  }

  private parseMemoryLimit(memory: string): number {
    // Convert memory string (e.g., "2Gi", "2048Mi") to MB
    if (memory.endsWith('Gi')) {
      return parseInt(memory.slice(0, -2)) * 1024;
    }
    if (memory.endsWith('Mi')) {
      return parseInt(memory.slice(0, -2));
    }
    return parseInt(memory);
  }

  private parseStorageLimit(storage: string): number {
    // Convert storage string (e.g., "10Gi", "10240Mi") to GB
    if (storage.endsWith('Gi')) {
      return parseInt(storage.slice(0, -2));
    }
    if (storage.endsWith('Mi')) {
      return parseInt(storage.slice(0, -2)) / 1024;
    }
    return parseInt(storage);
  }
}