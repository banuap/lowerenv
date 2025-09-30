import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '@shared/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // Dynamically determine the API base URL based on current hostname
    const getBaseURL = () => {
      const hostname = window.location.hostname;
      const port = '5001';
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://localhost:${port}/api`;
      } else {
        // Use the same IP/hostname as the frontend for the backend
        return `http://${hostname}:${port}/api`;
      }
    };

    this.api = axios.create({
      baseURL: getBaseURL(),
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic API methods
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.get(url);
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.delete(url);
    return response.data;
  }
}

export const apiService = new ApiService();

// Dashboard-specific API methods for Lower Environment Management
export const dashboardApi = {
  // Get overall environment and deployment statistics
  async getEnvironmentStats(): Promise<ApiResponse<{
    totalEnvironments: number;
    activeEnvironments: number;
    inactiveEnvironments: number;
    provisioningEnvironments: number;
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    runningDeployments: number;
    averageDeploymentTime: number;
    successRate: number;
    deploymentTrend: number;
    totalMonthlyCost: number;
    costTrend: number;
  }>> {
    return apiService.get('/dashboard/stats');
  },

  // Get environment type distribution data
  async getEnvironmentDistribution(): Promise<ApiResponse<Array<{
    type: 'development' | 'staging' | 'testing' | 'integration' | 'uat' | 'sandbox';
    count: number;
    activeCount: number;
    totalCost: number;
    percentage: number;
  }>>> {
    return apiService.get('/dashboard/environment-distribution');
  },

  // Get resource utilization across all environments
  async getResourceUtilization(): Promise<ApiResponse<{
    cpu: {
      used: number;
      total: number;
      percentage: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    storage: {
      used: number;
      total: number;
      percentage: number;
    };
    pods: {
      running: number;
      total: number;
      percentage: number;
    };
    environments: Array<{
      name: string;
      type: string;
      cpuUsage: number;
      memoryUsage: number;
      cost: number;
    }>;
  }>> {
    return apiService.get('/dashboard/resource-utilization');
  },

  // Get recent environment and deployment activity
  async getRecentActivity(limit: number = 10): Promise<ApiResponse<Array<{
    id: string;
    type: 'environment' | 'deployment';
    action: 'created' | 'started' | 'stopped' | 'deployed' | 'failed' | 'scaled';
    name: string;
    environment?: string;
    status: 'running' | 'completed' | 'failed' | 'pending';
    timestamp: string;
    user: string;
    duration?: number;
  }>>> {
    return apiService.get(`/dashboard/activity?limit=${limit}`);
  },

  // Get cost trends and breakdown
  async getCostTrends(days: number = 30): Promise<ApiResponse<{
    daily: Array<{
      date: string;
      cost: number;
      environments: number;
    }>;
    breakdown: {
      development: number;
      staging: number;
      testing: number;
      integration: number;
      uat: number;
      sandbox: number;
    };
    topSpenders: Array<{
      name: string;
      type: string;
      cost: number;
    }>;
  }>> {
    return apiService.get(`/dashboard/costs?days=${days}`);
  },

  // Get environment health overview
  async getEnvironmentHealth(): Promise<ApiResponse<{
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
    issues: Array<{
      environmentName: string;
      type: 'error' | 'warning' | 'info';
      message: string;
      timestamp: string;
    }>;
    uptime: {
      average: number;
      environments: Array<{
        name: string;
        uptime: number;
      }>;
    };
  }>> {
    return apiService.get('/dashboard/health');
  },

  // Get auto-scaling and optimization recommendations
  async getOptimizationRecommendations(): Promise<ApiResponse<Array<{
    environmentName: string;
    type: 'cost' | 'performance' | 'security';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    potentialSavings?: number;
    action: string;
  }>>> {
    return apiService.get('/dashboard/recommendations');
  }
};