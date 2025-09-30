import { Router } from 'express';
import { GitHubService } from '../services/GitHubService';
import { AuthenticatedRequest } from '../middleware/auth';
import { ApiResponse } from '../../../shared/types';
import { logger } from '../config/logger';

const router = Router();
const githubService = new GitHubService();

// POST /api/github/validate - Validate GitHub repository
router.post('/validate', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      res.status(400).json({
        success: false,
        error: 'Repository URL is required'
      });
      return;
    }

    const isValid = await githubService.validateRepository(repoUrl);

    const response: ApiResponse = {
      success: true,
      data: { isValid, repoUrl }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to validate GitHub repository:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate repository'
    });
  }
});

// POST /api/github/info - Get repository information
router.post('/info', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { repoUrl } = req.body;
    
    if (!repoUrl) {
      res.status(400).json({
        success: false,
        error: 'Repository URL is required'
      });
      return;
    }

    const repoInfo = await githubService.getRepositoryInfo(repoUrl);

    const response: ApiResponse = {
      success: true,
      data: repoInfo
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to get repository info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get repository information'
    });
  }
});

// POST /api/github/detect-type - Detect application type
router.post('/detect-type', async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { repoUrl, branch = 'main' } = req.body;
    
    if (!repoUrl) {
      res.status(400).json({
        success: false,
        error: 'Repository URL is required'
      });
      return;
    }

    const appType = await githubService.detectApplicationType(repoUrl, branch);

    const response: ApiResponse = {
      success: true,
      data: { applicationType: appType, repoUrl, branch }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to detect application type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect application type'
    });
  }
});

export default router;