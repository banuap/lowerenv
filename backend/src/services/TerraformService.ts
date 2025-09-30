import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { TerraformConfig } from '../../../shared/types';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

export class TerraformService {
  private readonly workspaceDir = process.env.WORKSPACE_DIR || '/tmp/deployments';

  async plan(config: TerraformConfig): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      const workingDir = path.join(this.workspaceDir, config.workspaceDir);
      
      // Initialize Terraform
      logs.push('Initializing Terraform...');
      const initResult = await execAsync('terraform init', { cwd: workingDir });
      logs.push(initResult.stdout);
      if (initResult.stderr) logs.push(`STDERR: ${initResult.stderr}`);

      // Create terraform.tfvars file
      if (config.variables && Object.keys(config.variables).length > 0) {
        const tfvarsContent = Object.entries(config.variables)
          .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
          .join('\n');
        
        await fs.writeFile(path.join(workingDir, 'terraform.tfvars'), tfvarsContent);
        logs.push('Created terraform.tfvars file');
      }

      // Run terraform plan
      logs.push('Running terraform plan...');
      const planResult = await execAsync('terraform plan -detailed-exitcode -out=tfplan', { 
        cwd: workingDir,
        env: { ...process.env, TF_IN_AUTOMATION: 'true' }
      });
      
      logs.push(planResult.stdout);
      if (planResult.stderr) logs.push(`STDERR: ${planResult.stderr}`);
      
      logs.push('Terraform plan completed successfully');
      return logs;
    } catch (error: any) {
      logger.error('Terraform plan failed:', error);
      logs.push(`ERROR: ${error.message}`);
      if (error.stdout) logs.push(error.stdout);
      if (error.stderr) logs.push(`STDERR: ${error.stderr}`);
      throw new Error(`Terraform plan failed: ${error.message}`);
    }
  }

  async apply(config: TerraformConfig): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      const workingDir = path.join(this.workspaceDir, config.workspaceDir);
      
      // Run terraform apply
      logs.push('Running terraform apply...');
      const applyResult = await execAsync('terraform apply -auto-approve tfplan', { 
        cwd: workingDir,
        env: { ...process.env, TF_IN_AUTOMATION: 'true' }
      });
      
      logs.push(applyResult.stdout);
      if (applyResult.stderr) logs.push(`STDERR: ${applyResult.stderr}`);
      
      logs.push('Terraform apply completed successfully');
      return logs;
    } catch (error: any) {
      logger.error('Terraform apply failed:', error);
      logs.push(`ERROR: ${error.message}`);
      if (error.stdout) logs.push(error.stdout);
      if (error.stderr) logs.push(`STDERR: ${error.stderr}`);
      throw new Error(`Terraform apply failed: ${error.message}`);
    }
  }

  async destroy(config: TerraformConfig): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      const workingDir = path.join(this.workspaceDir, config.workspaceDir);
      
      logs.push('Running terraform destroy...');
      const destroyResult = await execAsync('terraform destroy -auto-approve', { 
        cwd: workingDir,
        env: { ...process.env, TF_IN_AUTOMATION: 'true' }
      });
      
      logs.push(destroyResult.stdout);
      if (destroyResult.stderr) logs.push(`STDERR: ${destroyResult.stderr}`);
      
      logs.push('Terraform destroy completed successfully');
      return logs;
    } catch (error: any) {
      logger.error('Terraform destroy failed:', error);
      logs.push(`ERROR: ${error.message}`);
      if (error.stdout) logs.push(error.stdout);
      if (error.stderr) logs.push(`STDERR: ${error.stderr}`);
      throw new Error(`Terraform destroy failed: ${error.message}`);
    }
  }

  async getOutputs(config: TerraformConfig): Promise<Record<string, any>> {
    try {
      const workingDir = path.join(this.workspaceDir, config.workspaceDir);
      const result = await execAsync('terraform output -json', { cwd: workingDir });
      return JSON.parse(result.stdout);
    } catch (error: any) {
      logger.error('Failed to get terraform outputs:', error);
      return {};
    }
  }
}