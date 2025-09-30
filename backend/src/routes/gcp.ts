import { Router } from 'express';
import { GCPService } from '../services/GCPService';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';
import { logger } from '../config/logger';

const router = Router();
const gcpService = new GCPService();

// GET /api/gcp/projects - Get GCP projects
router.get('/projects', async (req: AuthenticatedRequest, res) => {
  try {
    const projects = await gcpService.getProjects();

    const response: ApiResponse = {
      success: true,
      data: projects
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to get GCP projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve GCP projects'
    });
  }
});

// GET /api/gcp/clusters/:projectId - Get GKE clusters for project
router.get('/clusters/:projectId', async (req: AuthenticatedRequest, res) => {
  try {
    const clusters = await gcpService.getGKEClusters(req.params.projectId);

    const response: ApiResponse = {
      success: true,
      data: clusters
    };

    res.json(response);
  } catch (error: any) {
    logger.error(`Failed to get GKE clusters for project ${req.params.projectId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve GKE clusters'
    });
  }
});

// GET /api/gcp/validate - Validate GCP credentials
router.get('/validate', async (req: AuthenticatedRequest, res) => {
  try {
    const isValid = await gcpService.validateGCPCredentials();

    const response: ApiResponse = {
      success: true,
      data: { isValid }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to validate GCP credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate GCP credentials'
    });
  }
});

export default router;