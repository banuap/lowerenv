import express from 'express';
import { auth } from '../middleware/auth';
import { Environment } from '../models/Environment';
import { EnvironmentManagementService, EnvironmentProvisioningRequest } from '../services/EnvironmentManagementService';
import { logger } from '../config/logger';

const router = express.Router();
const environmentService = new EnvironmentManagementService();

// Get all environments (with filtering and pagination)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      type, 
      status, 
      team, 
      owner,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter: any = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (team) filter['metadata.team'] = team;
    if (owner) filter['access.owners'] = owner;

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const [environments, total] = await Promise.all([
      Environment.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .populate('deployments'),
      Environment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        environments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch environments', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch environments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get environment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id).populate('deployments');
    
    if (!environment) {
      return res.status(404).json({
        success: false,
        message: 'Environment not found'
      });
    }

    res.json({
      success: true,
      data: environment
    });
  } catch (error) {
    logger.error('Failed to fetch environment', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new environment
router.post('/', auth, async (req, res) => {
  try {
    const provisioningRequest: EnvironmentProvisioningRequest = {
      ...req.body,
      createdBy: req.user.id
    };

    // Validate required fields
    const requiredFields = ['name', 'type', 'infrastructure'];
    for (const field of requiredFields) {
      if (!provisioningRequest[field as keyof EnvironmentProvisioningRequest]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`
        });
      }
    }

    // Check if environment name already exists
    const existingEnv = await Environment.findOne({ name: provisioningRequest.name });
    if (existingEnv) {
      return res.status(409).json({
        success: false,
        message: 'Environment with this name already exists'
      });
    }

    const environment = await environmentService.createEnvironment(provisioningRequest);

    res.status(201).json({
      success: true,
      message: 'Environment creation started',
      data: environment
    });
  } catch (error) {
    logger.error('Failed to create environment', { error, body: req.body });
    res.status(500).json({
      success: false,
      message: 'Failed to create environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update environment configuration
router.put('/:id', auth, async (req, res) => {
  try {
    const { configuration, metadata, access } = req.body;
    const updateData: any = { lastModifiedBy: req.user.id };

    if (configuration) updateData.configuration = configuration;
    if (metadata) updateData.metadata = metadata;
    if (access) updateData.access = access;

    const environment = await Environment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!environment) {
      return res.status(404).json({
        success: false,
        message: 'Environment not found'
      });
    }

    res.json({
      success: true,
      message: 'Environment updated successfully',
      data: environment
    });
  } catch (error) {
    logger.error('Failed to update environment', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get environment metrics and health
router.get('/:id/metrics', auth, async (req, res) => {
  try {
    const metrics = await environmentService.getEnvironmentMetrics(req.params.id);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get environment metrics', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to get environment metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Scale environment resources
router.post('/:id/scale', auth, async (req, res) => {
  try {
    const { cpu, memory, storage, pods } = req.body;
    
    if (!cpu && !memory && !storage && !pods) {
      return res.status(400).json({
        success: false,
        message: 'At least one resource parameter must be provided'
      });
    }

    await environmentService.scaleEnvironment(req.params.id, {
      cpu,
      memory,
      storage,
      pods
    });

    res.json({
      success: true,
      message: 'Environment scaling initiated'
    });
  } catch (error) {
    logger.error('Failed to scale environment', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to scale environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start environment
router.post('/:id/start', auth, async (req, res) => {
  try {
    await environmentService.startEnvironment(req.params.id);

    res.json({
      success: true,
      message: 'Environment start initiated'
    });
  } catch (error) {
    logger.error('Failed to start environment', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to start environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Shutdown environment
router.post('/:id/shutdown', auth, async (req, res) => {
  try {
    const { permanent = false } = req.body;

    await environmentService.shutdownEnvironment(req.params.id, permanent);

    res.json({
      success: true,
      message: permanent ? 'Environment deletion initiated' : 'Environment shutdown initiated'
    });
  } catch (error) {
    logger.error('Failed to shutdown environment', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to shutdown environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get environment costs and usage trends
router.get('/:id/costs', auth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const environment = await Environment.findById(req.params.id);
    if (!environment) {
      return res.status(404).json({
        success: false,
        message: 'Environment not found'
      });
    }

    // This would integrate with your cloud provider's billing API
    const costs = {
      current: {
        daily: environment.resources.costs.daily,
        monthly: environment.resources.costs.monthly,
        currency: environment.resources.costs.currency
      },
      trend: [
        // Mock data - replace with actual cost trend data
        { date: '2024-09-19', cost: 12.50 },
        { date: '2024-09-20', cost: 13.20 },
        { date: '2024-09-21', cost: 11.80 },
        { date: '2024-09-22', cost: 14.10 },
        { date: '2024-09-23', cost: 13.90 },
        { date: '2024-09-24', cost: 12.30 },
        { date: '2024-09-25', cost: 13.50 }
      ],
      breakdown: {
        compute: 8.50,
        storage: 2.30,
        networking: 1.20,
        monitoring: 0.80,
        other: 0.70
      }
    };

    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    logger.error('Failed to get environment costs', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to get environment costs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get environment access logs
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const { type = 'access', limit = 50 } = req.query;
    
    // This would integrate with your logging system
    const logs = [
      {
        timestamp: new Date(),
        type: 'access',
        user: 'john.doe@company.com',
        action: 'environment.view',
        details: 'Viewed environment dashboard'
      },
      {
        timestamp: new Date(Date.now() - 3600000),
        type: 'deployment',
        user: 'jane.smith@company.com',
        action: 'deployment.create',
        details: 'Created new deployment: web-api-v2'
      }
      // More logs...
    ];

    res.json({
      success: true,
      data: {
        logs: logs.slice(0, Number(limit)),
        total: logs.length
      }
    });
  } catch (error) {
    logger.error('Failed to get environment logs', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to get environment logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete environment (permanent)
router.delete('/:id', auth, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id);
    if (!environment) {
      return res.status(404).json({
        success: false,
        message: 'Environment not found'
      });
    }

    // Check if user has permission to delete
    if (!environment.access.owners.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete environment'
      });
    }

    await environmentService.shutdownEnvironment(req.params.id, true);

    res.json({
      success: true,
      message: 'Environment deletion initiated'
    });
  } catch (error) {
    logger.error('Failed to delete environment', { error, environmentId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to delete environment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as environmentRoutes };