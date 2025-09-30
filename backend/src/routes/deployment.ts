import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Deployment } from '../models/Deployment';
import { PipelineModel } from '../models/Pipeline';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all deployments
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { environment, status, page = 1, limit = 10 } = req.query;
    
    const filter: any = {};
    if (environment) filter.environment = environment;
    if (status) filter.status = status;

    const deployments = await Deployment.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .exec();

    const total = await Deployment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        deployments,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / Number(limit)),
          count: deployments.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployments'
    });
  }
});

// Get single deployment
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deployment = await Deployment.findOne({ id: req.params.id });

    if (!deployment) {
      res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
      return;
    }

    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    logger.error('Error fetching deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deployment'
    });
  }
});

// Create new deployment
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deploymentData = {
      ...req.body,
      id: uuidv4(),
      createdBy: req.user?.email || 'unknown',
      status: 'pending'
    };

    const deployment = new Deployment(deploymentData);
    await deployment.save();

    logger.info(`Deployment created: ${deployment.name} by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: deployment
    });
  } catch (error: any) {
    logger.error('Error creating deployment:', error);
    if (error?.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create deployment'
    });
  }
});

// Update deployment
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deployment = await Deployment.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!deployment) {
      res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
      return;
    }

    logger.info(`Deployment updated: ${deployment.name} by ${req.user?.email}`);

    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    logger.error('Error updating deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update deployment'
    });
  }
});

// Delete deployment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deployment = await Deployment.findOneAndDelete({ id: req.params.id });

    if (!deployment) {
      res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
      return;
    }

    // Also delete associated pipelines
    await PipelineModel.deleteMany({ deploymentId: req.params.id });

    logger.info(`Deployment deleted: ${req.params.id} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Deployment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete deployment'
    });
  }
});

// Trigger deployment
router.post('/:id/trigger', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const deployment = await Deployment.findOne({ id: req.params.id });

    if (!deployment) {
      res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
      return;
    }

    if (deployment.status === 'running') {
      res.status(400).json({
        success: false,
        error: 'Deployment is already running'
      });
      return;
    }

    // Create new pipeline
    const pipeline = new PipelineModel({
      id: uuidv4(),
      deploymentId: deployment.id,
      status: 'pending',
      triggeredBy: req.user?.email || 'unknown',
      startTime: new Date(),
      steps: [
        {
          id: uuidv4(),
          name: 'Clone Repository',
          type: 'clone',
          status: 'pending'
        },
        {
          id: uuidv4(),
          name: 'Build Application',
          type: 'build',
          status: 'pending'
        },
        {
          id: uuidv4(),
          name: `Deploy with ${deployment.deploymentType}`,
          type: deployment.deploymentType,
          status: 'pending'
        },
        {
          id: uuidv4(),
          name: 'Send Notifications',
          type: 'notify',
          status: 'pending'
        }
      ]
    });

    await pipeline.save();

    // Update deployment status
    deployment.status = 'running';
    deployment.lastDeployedAt = new Date();
    await deployment.save();

    logger.info(`Deployment triggered: ${deployment.name} by ${req.user?.email}`);

    // In a real implementation, this would trigger the actual pipeline execution
    // For now, we'll simulate it by updating the pipeline status after a delay
    setTimeout(async () => {
      try {
        pipeline.status = 'completed';
        pipeline.endTime = new Date();
        pipeline.steps = pipeline.steps?.map(step => ({
          ...step,
          status: 'completed',
          startTime: new Date(Date.now() - 30000),
          endTime: new Date(),
          logs: [`${step.name} completed successfully`]
        }));
        await pipeline.save();

        deployment.status = 'completed';
        await deployment.save();

        // Emit real-time update
        if (global.io) {
          global.io.to(`deployment-${deployment.id}`).emit('pipeline-update', {
            pipelineId: pipeline.id,
            status: 'completed'
          });
        }
      } catch (error) {
        logger.error('Error updating pipeline status:', error);
      }
    }, 5000);

    res.json({
      success: true,
      data: {
        message: 'Deployment triggered successfully',
        pipelineId: pipeline.id
      }
    });
  } catch (error) {
    logger.error('Error triggering deployment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger deployment'
    });
  }
});

export default router;