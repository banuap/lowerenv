import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { AnsibleConfig } from '../../../shared/types';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

export class AnsibleService {
  private readonly workspaceDir = process.env.WORKSPACE_DIR || '/tmp/deployments';

  async runPlaybook(config: AnsibleConfig): Promise<string[]> {
    const logs: string[] = [];
    
    try {
      const workingDir = path.join(this.workspaceDir, path.dirname(config.playbookPath));
      const playbookFile = path.basename(config.playbookPath);

      // Create inventory file if provided as string
      let inventoryArg = '';
      if (config.inventory) {
        if (config.inventory.includes('\n') || config.inventory.includes('[')) {
          // Inventory content provided, create temporary file
          const inventoryFile = path.join(workingDir, 'inventory.ini');
          await fs.writeFile(inventoryFile, config.inventory);
          inventoryArg = `-i inventory.ini`;
          logs.push('Created temporary inventory file');
        } else {
          // Inventory file path provided
          inventoryArg = `-i ${config.inventory}`;
        }
      }

      // Create extra vars file if provided
      let extraVarsArg = '';
      if (config.variables && Object.keys(config.variables).length > 0) {
        const extraVarsFile = path.join(workingDir, 'extra_vars.json');
        await fs.writeFile(extraVarsFile, JSON.stringify(config.variables, null, 2));
        extraVarsArg = `--extra-vars @extra_vars.json`;
        logs.push('Created extra variables file');
      }

      // Build ansible-playbook command
      let ansibleCommand = `ansible-playbook ${playbookFile}`;
      
      if (inventoryArg) {
        ansibleCommand += ` ${inventoryArg}`;
      }
      
      if (extraVarsArg) {
        ansibleCommand += ` ${extraVarsArg}`;
      }

      // Add vault password file if provided
      if (config.vault?.passwordFile) {
        ansibleCommand += ` --vault-password-file ${config.vault.passwordFile}`;
      }

      // Add verbose output
      ansibleCommand += ' -v';

      logs.push(`Running Ansible playbook: ${ansibleCommand}`);
      
      const result = await execAsync(ansibleCommand, {
        cwd: workingDir,
        env: {
          ...process.env,
          ANSIBLE_HOST_KEY_CHECKING: 'False',
          ANSIBLE_STDOUT_CALLBACK: 'yaml'
        }
      });

      logs.push(result.stdout);
      if (result.stderr) logs.push(`STDERR: ${result.stderr}`);

      logs.push('Ansible playbook execution completed successfully');
      return logs;
    } catch (error: any) {
      logger.error('Ansible playbook execution failed:', error);
      logs.push(`ERROR: ${error.message}`);
      if (error.stdout) logs.push(error.stdout);
      if (error.stderr) logs.push(`STDERR: ${error.stderr}`);
      throw new Error(`Ansible playbook execution failed: ${error.message}`);
    }
  }

  async validatePlaybook(playbookPath: string): Promise<boolean> {
    try {
      const workingDir = path.join(this.workspaceDir, path.dirname(playbookPath));
      const playbookFile = path.basename(playbookPath);

      await execAsync(`ansible-playbook ${playbookFile} --syntax-check`, {
        cwd: workingDir
      });

      return true;
    } catch (error) {
      logger.error(`Ansible playbook validation failed for ${playbookPath}:`, error);
      return false;
    }
  }

  async listTasks(playbookPath: string): Promise<string[]> {
    try {
      const workingDir = path.join(this.workspaceDir, path.dirname(playbookPath));
      const playbookFile = path.basename(playbookPath);

      const result = await execAsync(`ansible-playbook ${playbookFile} --list-tasks`, {
        cwd: workingDir
      });

      return result.stdout.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      logger.error(`Failed to list tasks for ${playbookPath}:`, error);
      return [];
    }
  }
}