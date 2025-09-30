import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PipelineModel } from '../models/Pipeline';
import { Deployment } from '../models/Deployment';
import { logger } from '../config/logger';
import { PipelineStepStatus } from '../../../shared/types';

const router = express.Router();

// Get pipelines for a deployment
router.get('/:deploymentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pipelines = await PipelineModel.find({ deploymentId: req.params.deploymentId })
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .exec();

    const total = await PipelineModel.countDocuments({ deploymentId: req.params.deploymentId });

    res.json({
      success: true,
      data: {
        pipelines,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / Number(limit)),
          count: pipelines.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching pipelines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipelines'
    });
  }
});

// Get pipeline details
router.get('/details/:pipelineId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await PipelineModel.findOne({ id: req.params.pipelineId })
      .populate('deploymentId');

    if (!pipeline) {
      res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
      return;
    }

    res.json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    logger.error('Error fetching pipeline details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline details'
    });
  }
});

// Cancel pipeline
router.post('/details/:pipelineId/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const pipeline = await PipelineModel.findOne({ id: req.params.pipelineId });

    if (!pipeline) {
      res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
      return;
    }

    if (pipeline.status !== 'running' && pipeline.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel pipeline that is not running or pending'
      });
      return;
    }

    // Update pipeline status
    pipeline.status = 'cancelled';
    pipeline.endTime = new Date();
    
    // Update any running steps to cancelled
    if (pipeline.steps) {
      pipeline.steps = pipeline.steps.map(step => ({
        ...step,
        status: step.status === 'running' || step.status === 'pending' ? 'cancelled' as PipelineStepStatus : step.status,
        endTime: step.status === 'running' ? new Date() : step.endTime
      }));
    }

    await pipeline.save();

    // Update associated deployment status
    const deployment = await Deployment.findOne({ id: pipeline.deploymentId });
    if (deployment && deployment.status === 'running') {
      deployment.status = 'cancelled';
      await deployment.save();
    }

    logger.info(`Pipeline cancelled: ${pipeline.id} by ${req.user?.email}`);

    // Emit real-time update
    if (global.io) {
      global.io.to(`deployment-${pipeline.deploymentId}`).emit('pipeline-update', {
        pipelineId: pipeline.id,
        status: 'cancelled'
      });
    }

    res.json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    logger.error('Error cancelling pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel pipeline'
    });
  }
});

export default router;