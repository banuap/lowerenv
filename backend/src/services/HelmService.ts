import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { HelmConfig } from '../../shared/types';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

export class HelmService {
  private workspaceDir = process.env.WORKSPACE_DIR || '/tmp/deployments';

  async deploy(config: any): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      // Authenticate with GKE cluster
      logs.push(`Connecting to GKE cluster: ${config.targetCluster}`);
      const authResult = await execAsync(`gcloud container clusters get-credentials ${config.targetCluster} --zone=us-central1-a`);
      logs.push(authResult.stdout);

      // Create namespace if it doesn't exist
      try {
        await execAsync(`kubectl create namespace ${config.targetNamespace}`);
        logs.push(`Created namespace: ${config.targetNamespace}`);
      } catch (error) {
        logs.push(`Namespace ${config.targetNamespace} already exists or creation failed`);
      }

      const workingDir = path.join(this.workspaceDir, config.chartPath);
      
      // Create values file if custom values provided
      if (config.values && Object.keys(config.values).length > 0) {
        const valuesContent = this.convertToYaml(config.values);
        const valuesFile = path.join(workingDir, 'custom-values.yaml');
        await fs.writeFile(valuesFile, valuesContent);
        logs.push('Created custom values file');
      }

      // Build helm command
      let helmCommand = `helm upgrade --install ${config.release} . --namespace ${config.targetNamespace}`;
      
      if (config.values && Object.keys(config.values).length > 0) {
        helmCommand += ' -f custom-values.yaml';
      }
      
      if (config.timeout) {
        helmCommand += ` --timeout ${config.timeout}s`;
      }

      // Run helm deployment
      logs.push(`Running helm deployment: ${helmCommand}`);
      const deployResult = await execAsync(helmCommand, { 
        cwd: workingDir,
        timeout: (config.timeout || 300) * 1000
      });
      
      logs.push(deployResult.stdout);
      if (deployResult.stderr) logs.push(`STDERR: ${deployResult.stderr}`);
      
      // Get deployment status
      const statusResult = await execAsync(`helm status ${config.release} -n ${config.targetNamespace}`);
      logs.push('Deployment Status:');
      logs.push(statusResult.stdout);
      
      logs.push('Helm deployment completed successfully');
      return logs;
    } catch (error: any) {
      logger.error('Helm deployment failed:', error);
      logs.push(`ERROR: ${error.message}`);
      if (error.stdout) logs.push(error.stdout);
      if (error.stderr) logs.push(`STDERR: ${error.stderr}`);
      throw new Error(`Helm deployment failed: ${error.message}`);
    }
  }

  async uninstall(releaseName: string, namespace: string): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      logs.push(`Uninstalling Helm release: ${releaseName}`);
      const result = await execAsync(`helm uninstall ${releaseName} -n ${namespace}`);
      
      logs.push(result.stdout);
      if (result.stderr) logs.push(`STDERR: ${result.stderr}`);
      
      logs.push('Helm uninstall completed successfully');
      return logs;
    } catch (error: any) {
      logger.error('Helm uninstall failed:', error);
      logs.push(`ERROR: ${error.message}`);
      throw new Error(`Helm uninstall failed: ${error.message}`);
    }
  }

  async getReleaseStatus(releaseName: string, namespace: string): Promise<any> {
    try {
      const result = await execAsync(`helm status ${releaseName} -n ${namespace} -o json`);
      return JSON.parse(result.stdout);
    } catch (error: any) {
      logger.error('Failed to get Helm release status:', error);
      return null;
    }
  }

  private convertToYaml(obj: any, indent: number = 0): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.convertToYaml(value, indent + 2);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          yaml += `${spaces}  - ${item}\n`;
        });
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
    
    return yaml;
  }
}