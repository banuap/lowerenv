import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Deployment } from '../models/Deployment';
import { PipelineModel } from '../models/Pipeline';
import { logger } from '../config/logger';

const router = express.Router();

// Dashboard metrics
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get basic counts
    const [
      totalDeployments,
      activeDeployments,
      completedDeployments,
      failedDeployments,
      recentPipelines
    ] = await Promise.all([
      Deployment.countDocuments(),
      Deployment.countDocuments({ status: 'running' }),
      Deployment.countDocuments({ status: 'completed' }),
      Deployment.countDocuments({ status: 'failed' }),
      PipelineModel.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('deploymentId')
    ]);

    // Calculate success rate
    const totalPipelines = await PipelineModel.countDocuments();
    const successfulPipelines = await PipelineModel.countDocuments({ status: 'completed' });
    const successRate = totalPipelines > 0 ? Math.round((successfulPipelines / totalPipelines) * 100) : 0;

    // Get deployment counts by environment
    const environmentCounts = await Deployment.aggregate([
      {
        $group: {
          _id: '$environment',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await PipelineModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          deployments: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalDeployments,
          activeDeployments,
          completedDeployments,
          failedDeployments,
          successRate
        },
        environmentCounts: environmentCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentActivity: recentActivity.map(item => ({
          date: item._id.date,
          deployments: item.deployments,
          successful: item.successful,
          failed: item.failed
        })),
        recentPipelines: recentPipelines.slice(0, 5)
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

// Deployments by environment
router.get('/deployments-by-environment', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const environmentStats = await Deployment.aggregate([
      {
        $group: {
          _id: '$environment',
          total: { $sum: 1 },
          running: {
            $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: environmentStats.map(env => ({
        environment: env._id,
        total: env.total,
        running: env.running,
        completed: env.completed,
        failed: env.failed,
        pending: env.pending,
        successRate: env.total > 0 ? Math.round((env.completed / env.total) * 100) : 0
      }))
    });
  } catch (error) {
    logger.error('Error fetching environment metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environment metrics'
    });
  }
});

// Recent activity
router.get('/recent-activity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const activity = await PipelineModel.find({
      createdAt: { $gte: startDate }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('deploymentId', 'name environment');

    const dailyStats = await PipelineModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        activity,
        dailyStats: dailyStats.map(stat => ({
          date: stat._id.date,
          total: stat.total,
          successful: stat.successful,
          failed: stat.failed,
          successRate: stat.total > 0 ? Math.round((stat.successful / stat.total) * 100) : 0
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
});

export default router;