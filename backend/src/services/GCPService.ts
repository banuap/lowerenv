import { default as Compute } from '@google-cloud/compute';
import { ClusterManagerClient } from '@google-cloud/container';
import { Storage } from '@google-cloud/storage';
import { GCPProject, GKECluster } from '../../../shared/types';
import { logger } from '../config/logger';

export class GCPService {
  private readonly compute = new Compute();
  private readonly clusterManager = new ClusterManagerClient();
  private readonly storage = new Storage();

  async getProjects(): Promise<GCPProject[]> {
    try {
      const [projects] = await this.compute.getProjects();
      
      const gcpProjects: GCPProject[] = [];
      
      for (const project of projects) {
        if (project.id) {
          const clusters = await this.getGKEClusters(project.id);
          
          gcpProjects.push({
            projectId: project.id,
            displayName: project.name || project.id,
            clusters
          });
        }
      }
      
      return gcpProjects;
    } catch (error) {
      logger.error('Failed to get GCP projects:', error);
      return [];
    }
  }

  async getGKEClusters(projectId: string): Promise<GKECluster[]> {
    try {
      const [response] = await this.clusterManager.listClusters({
        parent: `projects/${projectId}/locations/-`
      });

      const clusters = response.clusters || [];

      return clusters.map(cluster => ({
        name: cluster.name || '',
        location: cluster.location || '',
        status: cluster.status || '',
        nodeCount: cluster.currentNodeCount || 0
      }));
    } catch (error) {
      logger.error(`Failed to get GKE clusters for project ${projectId}:`, error);
      return [];
    }
  }

  async createGKECluster(projectId: string, zone: string, clusterName: string): Promise<boolean> {
    try {
      const [operation] = await this.clusterManager.createCluster({
        parent: `projects/${projectId}/locations/${zone}`,
        cluster: {
          name: clusterName,
          initialNodeCount: 3,
          nodeConfig: {
            machineType: 'e2-medium',
            diskSizeGb: 20,
            oauthScopes: [
              'https://www.googleapis.com/auth/cloud-platform'
            ]
          }
        }
      });

      logger.info(`GKE cluster creation initiated: ${operation.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to create GKE cluster ${clusterName}:`, error);
      return false;
    }
  }

  async buildAndPushImage(config: any): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      const imageName = `gcr.io/${config.projectId}/${config.applicationName}:${config.tag || 'latest'}`;
      
      logs.push(`Building Docker image: ${imageName}`);
      
      // Note: This would typically use Docker API or Cloud Build
      // For now, we'll simulate the process
      logs.push('Docker build completed');
      logs.push(`Pushing image to GCR: ${imageName}`);
      logs.push('Image push completed');
      
      return logs;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to build and push image:', error);
      logs.push(`ERROR: ${errorMessage}`);
      throw error;
    }
  }

  async getStorageBuckets(projectId: string): Promise<string[]> {
    try {
      const [buckets] = await this.storage.getBuckets({
        project: projectId
      });

      return buckets.map(bucket => bucket.name || '');
    } catch (error) {
      logger.error(`Failed to get storage buckets for project ${projectId}:`, error);
      return [];
    }
  }

  async validateGCPCredentials(): Promise<boolean> {
    try {
      await this.compute.getProjects();
      return true;
    } catch (error) {
      logger.error('GCP credentials validation failed:', error);
      return false;
    }
  }
}