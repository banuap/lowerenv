import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { GitHubRepository } from '../../shared/types';
import { logger } from '../config/logger';

export class GitHubService {
  private workspaceDir = process.env.WORKSPACE_DIR || '/tmp/deployments';

  async cloneRepository(repoUrl: string, branch: string = 'main'): Promise<string> {
    const repoName = this.extractRepoName(repoUrl);
    const localPath = path.join(this.workspaceDir, repoName);

    try {
      // Ensure workspace directory exists
      await fs.mkdir(this.workspaceDir, { recursive: true });

      // Remove existing directory if it exists
      try {
        await fs.rm(localPath, { recursive: true, force: true });
      } catch (error) {
        // Directory doesn't exist, continue
      }

      const git: SimpleGit = simpleGit();
      
      logger.info(`Cloning repository: ${repoUrl} (branch: ${branch})`);
      await git.clone(repoUrl, localPath, ['--branch', branch, '--single-branch']);
      
      logger.info(`Repository cloned successfully to: ${localPath}`);
      return localPath;
    } catch (error) {
      logger.error(`Failed to clone repository ${repoUrl}:`, error);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  async getRepositoryInfo(repoUrl: string): Promise<GitHubRepository> {
    const localPath = await this.cloneRepository(repoUrl);
    const git: SimpleGit = simpleGit(localPath);

    try {
      const branches = await git.branch(['-r']);
      const remoteUrl = await git.listRemote(['--get-url']);
      
      const branchNames = branches.all
        .filter(branch => branch.startsWith('origin/'))
        .map(branch => branch.replace('origin/', ''));

      const defaultBranch = branches.current || 'main';

      return {
        name: this.extractRepoName(repoUrl),
        fullName: repoUrl,
        url: remoteUrl.trim(),
        branches: branchNames,
        defaultBranch
      };
    } catch (error) {
      logger.error(`Failed to get repository info for ${repoUrl}:`, error);
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }

  async validateRepository(repoUrl: string): Promise<boolean> {
    try {
      const git: SimpleGit = simpleGit();
      await git.listRemote([repoUrl]);
      return true;
    } catch (error) {
      logger.warn(`Repository validation failed for ${repoUrl}:`, error);
      return false;
    }
  }

  async getFileContent(repoUrl: string, filePath: string, branch: string = 'main'): Promise<string> {
    const localPath = await this.cloneRepository(repoUrl, branch);
    const fullPath = path.join(localPath, filePath);

    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to read file ${filePath} from ${repoUrl}:`, error);
      throw new Error(`File not found: ${filePath}`);
    }
  }

  async detectApplicationType(repoUrl: string, branch: string = 'main'): Promise<string> {
    const localPath = await this.cloneRepository(repoUrl, branch);

    try {
      const files = await fs.readdir(localPath);
      
      // Check for common application indicators
      if (files.includes('package.json')) {
        const packageJson = JSON.parse(await fs.readFile(path.join(localPath, 'package.json'), 'utf-8'));
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          return 'react';
        }
        if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
          return 'vue';
        }
        if (packageJson.dependencies?.express) {
          return 'nodejs';
        }
        return 'nodejs';
      }

      if (files.includes('pom.xml') || files.includes('build.gradle')) {
        return 'java';
      }

      if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('Pipfile')) {
        return 'python';
      }

      if (files.includes('go.mod')) {
        return 'golang';
      }

      if (files.includes('Dockerfile')) {
        return 'docker';
      }

      return 'unknown';
    } catch (error) {
      logger.error(`Failed to detect application type for ${repoUrl}:`, error);
      return 'unknown';
    }
  }

  private extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/\/([^\/]+)\.git$/);
    if (match) {
      return match[1];
    }
    
    // Fallback for URLs without .git suffix
    const parts = repoUrl.split('/');
    return parts[parts.length - 1];
  }
}