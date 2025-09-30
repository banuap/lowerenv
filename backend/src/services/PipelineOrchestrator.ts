import { v4 as uuidv4 } from 'uuid';
import { DeploymentConfig, Pipeline, PipelineStep } from '../../shared/types';
import { Pipeline as PipelineModel } from '../models/Pipeline';
import { Deployment } from '../models/Deployment';
import { GitHubService } from './GitHubService';
import { TerraformService } from './TerraformService';
import { HelmService } from './HelmService';
import { AnsibleService } from './AnsibleService';
import { GCPService } from './GCPService';
import { logger } from '../config/logger';
import { io } from '../index';

export class PipelineOrchestrator {
  private githubService = new GitHubService();
  private terraformService = new TerraformService();
  private helmService = new HelmService();
  private ansibleService = new AnsibleService();
  private gcpService = new GCPService();

  async startPipeline(deploymentId: string, triggeredBy: string): Promise<string> {
    const pipelineId = uuidv4();
    
    try {
      const deployment = await Deployment.findById(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      // Update deployment status
      deployment.status = 'running';
      await deployment.save();

      // Create pipeline steps based on deployment configuration
      const steps = this.buildPipelineSteps(deployment);

      // Create pipeline record
      const pipeline = new PipelineModel({
        id: pipelineId,
        deploymentId,
        status: 'running',
        steps,
        startTime: new Date(),
        triggeredBy
      });

      await pipeline.save();

      // Start pipeline execution asynchronously
      this.executePipeline(pipeline).catch((error) => {
        logger.error(`Pipeline ${pipelineId} execution failed:`, error);
      });

      return pipelineId;
    } catch (error) {
      logger.error(`Failed to start pipeline for deployment ${deploymentId}:`, error);
      throw error;
    }
  }

  private buildPipelineSteps(deployment: DeploymentConfig): PipelineStep[] {
    const steps: PipelineStep[] = [];

    // Step 1: Clone repository
    steps.push({
      id: uuidv4(),
      name: 'Clone Repository',
      type: 'clone',
      status: 'pending',
      logs: [],
      dependencies: [],
      config: {
        repository: deployment.githubRepo,
        branch: deployment.branch
      }
    });

    // Step 2: Infrastructure steps
    if (deployment.config.terraform) {
      steps.push({
        id: uuidv4(),
        name: 'Terraform Plan',
        type: 'terraform-plan',
        status: 'pending',
        logs: [],
        dependencies: [steps[0].id],
        config: deployment.config.terraform
      });

      steps.push({
        id: uuidv4(),
        name: 'Terraform Apply',
        type: 'terraform-apply',
        status: 'pending',
        logs: [],
        dependencies: [steps[1].id],
        config: deployment.config.terraform
      });
    }

    // Step 3: Application deployment
    if (deployment.config.helm) {
      const helmStep = {
        id: uuidv4(),
        name: 'Helm Deploy',
        type: 'helm-deploy' as const,
        status: 'pending' as const,
        logs: [],
        dependencies: deployment.config.terraform ? [steps[2].id] : [steps[0].id],
        config: {
          ...deployment.config.helm,
          targetCluster: deployment.targetCluster,
          targetNamespace: deployment.targetNamespace
        }
      };
      steps.push(helmStep);
    }

    // Step 4: Post-deployment configuration
    if (deployment.config.ansible) {
      const ansibleStep = {
        id: uuidv4(),
        name: 'Ansible Configuration',
        type: 'ansible-run' as const,
        status: 'pending' as const,
        logs: [],
        dependencies: [steps[steps.length - 1].id],
        config: deployment.config.ansible
      };
      steps.push(ansibleStep);
    }

    return steps;
  }

  private async executePipeline(pipeline: any): Promise<void> {
    try {
      logger.info(`Starting pipeline execution: ${pipeline.id}`);

      for (const step of pipeline.steps) {
        // Check if all dependencies are completed
        if (!this.areDependenciesCompleted(step, pipeline.steps)) {
          step.status = 'skipped';
          continue;
        }

        await this.executeStep(step, pipeline);
        
        // Emit real-time updates
        io.to(`deployment-${pipeline.deploymentId}`).emit('pipeline-update', {
          pipelineId: pipeline.id,
          step: step
        });

        if (step.status === 'failed') {
          pipeline.status = 'failed';
          break;
        }
      }

      if (pipeline.status !== 'failed') {
        pipeline.status = 'completed';
        
        // Update deployment
        await Deployment.findByIdAndUpdate(pipeline.deploymentId, {
          status: 'completed',
          lastDeployedAt: new Date()
        });
      } else {
        await Deployment.findByIdAndUpdate(pipeline.deploymentId, {
          status: 'failed'
        });
      }

      pipeline.endTime = new Date();
      await pipeline.save();

      logger.info(`Pipeline ${pipeline.id} completed with status: ${pipeline.status}`);
    } catch (error) {
      logger.error(`Pipeline ${pipeline.id} execution error:`, error);
      pipeline.status = 'failed';
      pipeline.endTime = new Date();
      await pipeline.save();

      await Deployment.findByIdAndUpdate(pipeline.deploymentId, {
        status: 'failed'
      });
    }
  }

  private async executeStep(step: any, pipeline: any): Promise<void> {
    step.status = 'running';
    step.startTime = new Date();
    step.logs.push(`Starting step: ${step.name}`);

    try {
      switch (step.type) {
        case 'clone':
          await this.githubService.cloneRepository(
            step.config.repository,
            step.config.branch
          );
          break;
        
        case 'terraform-plan':
          const planOutput = await this.terraformService.plan(step.config);
          step.logs.push(...planOutput);
          break;
        
        case 'terraform-apply':
          const applyOutput = await this.terraformService.apply(step.config);
          step.logs.push(...applyOutput);
          break;
        
        case 'helm-deploy':
          const helmOutput = await this.helmService.deploy(step.config);
          step.logs.push(...helmOutput);
          break;
        
        case 'ansible-run':
          const ansibleOutput = await this.ansibleService.runPlaybook(step.config);
          step.logs.push(...ansibleOutput);
          break;
        
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      step.status = 'completed';
      step.logs.push(`Step completed successfully: ${step.name}`);
    } catch (error) {
      step.status = 'failed';
      step.logs.push(`Step failed: ${error.message}`);
      logger.error(`Step ${step.name} failed:`, error);
    } finally {
      step.endTime = new Date();
      await pipeline.save();
    }
  }

  private areDependenciesCompleted(step: any, allSteps: any[]): boolean {
    return step.dependencies.every((depId: string) => {
      const dep = allSteps.find(s => s.id === depId);
      return dep && dep.status === 'completed';
    });
  }

  async getPipeline(pipelineId: string): Promise<any> {
    return await PipelineModel.findOne({ id: pipelineId });
  }

  async getPipelinesByDeployment(deploymentId: string): Promise<any[]> {
    return await PipelineModel.find({ deploymentId }).sort({ createdAt: -1 });
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    const pipeline = await PipelineModel.findOne({ id: pipelineId });
    if (pipeline && pipeline.status === 'running') {
      pipeline.status = 'cancelled';
      pipeline.endTime = new Date();
      await pipeline.save();

      await Deployment.findByIdAndUpdate(pipeline.deploymentId, {
        status: 'cancelled'
      });

      logger.info(`Pipeline ${pipelineId} cancelled`);
    }
  }
}