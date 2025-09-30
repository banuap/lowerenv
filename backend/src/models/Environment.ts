import mongoose, { Schema, Document } from 'mongoose';

export interface IEnvironment extends Document {
  id?: string;
  name: string;
  type: 'development' | 'staging' | 'testing' | 'integration' | 'uat' | 'sandbox';
  description?: string;
  status: 'active' | 'inactive' | 'provisioning' | 'terminating' | 'error';
  
  // Infrastructure Configuration
  infrastructure: {
    provider: 'gcp' | 'aws' | 'azure' | 'on-premises';
    region: string;
    project: string;
    cluster?: string;
    namespace: string;
    resourceQuota: {
      cpu: string;
      memory: string;
      storage: string;
      pods: number;
    };
    networking: {
      vpcId?: string;
      subnetIds?: string[];
      ingressEnabled: boolean;
      loadBalancerEnabled: boolean;
    };
  };

  // Environment Configuration
  configuration: {
    autoShutdown: {
      enabled: boolean;
      schedule?: string; // cron expression
      idleTimeout?: number; // minutes
    };
    backup: {
      enabled: boolean;
      schedule?: string;
      retention: number; // days
    };
    monitoring: {
      enabled: boolean;
      alerting: boolean;
      logAggregation: boolean;
    };
    security: {
      networkPolicies: boolean;
      podSecurityPolicies: boolean;
      secretsEncryption: boolean;
    };
  };

  // Access Control
  access: {
    owners: string[]; // user IDs
    developers: string[];
    viewers: string[];
    serviceAccounts: string[];
  };

  // Environment Metadata
  metadata: {
    costCenter?: string;
    project?: string;
    team?: string;
    purpose?: string;
    tags: Map<string, string>;
    expiration?: Date; // for temporary environments
  };

  // Resource Usage
  resources: {
    currentUsage: {
      cpu: number;
      memory: number;
      storage: number;
      pods: number;
    };
    limits: {
      cpu: number;
      memory: number;
      storage: number;
      pods: number;
    };
    costs: {
      daily: number;
      monthly: number;
      currency: string;
    };
  };

  // Environment Health
  health: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    lastCheck: Date;
    uptime: number; // percentage
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      component: string;
      timestamp: Date;
    }>;
  };

  // Deployments in this environment
  deployments: string[]; // deployment IDs
  
  createdBy: string;
  lastModifiedBy: string;
}

const environmentSchema = new Schema<IEnvironment>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['development', 'staging', 'testing', 'integration', 'uat', 'sandbox']
  },
  description: String,
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'provisioning', 'terminating', 'error'],
    default: 'provisioning'
  },
  
  infrastructure: {
    provider: {
      type: String,
      required: true,
      enum: ['gcp', 'aws', 'azure', 'on-premises']
    },
    region: {
      type: String,
      required: true
    },
    project: {
      type: String,
      required: true
    },
    cluster: String,
    namespace: {
      type: String,
      required: true
    },
    resourceQuota: {
      cpu: String,
      memory: String,
      storage: String,
      pods: Number
    },
    networking: {
      vpcId: String,
      subnetIds: [String],
      ingressEnabled: Boolean,
      loadBalancerEnabled: Boolean
    }
  },

  configuration: {
    autoShutdown: {
      enabled: { type: Boolean, default: false },
      schedule: String,
      idleTimeout: Number
    },
    backup: {
      enabled: { type: Boolean, default: true },
      schedule: String,
      retention: { type: Number, default: 7 }
    },
    monitoring: {
      enabled: { type: Boolean, default: true },
      alerting: { type: Boolean, default: true },
      logAggregation: { type: Boolean, default: true }
    },
    security: {
      networkPolicies: { type: Boolean, default: true },
      podSecurityPolicies: { type: Boolean, default: true },
      secretsEncryption: { type: Boolean, default: true }
    }
  },

  access: {
    owners: [String],
    developers: [String],
    viewers: [String],
    serviceAccounts: [String]
  },

  metadata: {
    costCenter: String,
    project: String,
    team: String,
    purpose: String,
    tags: {
      type: Map,
      of: String
    },
    expiration: Date
  },

  resources: {
    currentUsage: {
      cpu: { type: Number, default: 0 },
      memory: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      pods: { type: Number, default: 0 }
    },
    limits: {
      cpu: Number,
      memory: Number,
      storage: Number,
      pods: Number
    },
    costs: {
      daily: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' }
    }
  },

  health: {
    status: {
      type: String,
      enum: ['healthy', 'warning', 'critical', 'unknown'],
      default: 'unknown'
    },
    lastCheck: Date,
    uptime: { type: Number, default: 0 },
    issues: [{
      type: {
        type: String,
        enum: ['error', 'warning', 'info']
      },
      message: String,
      component: String,
      timestamp: Date
    }]
  },

  deployments: [String],
  
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: String
}, {
  timestamps: true
});

// Indexes
environmentSchema.index({ name: 1 }, { unique: true });
environmentSchema.index({ type: 1 });
environmentSchema.index({ status: 1 });
environmentSchema.index({ 'infrastructure.provider': 1 });
environmentSchema.index({ 'infrastructure.project': 1 });
environmentSchema.index({ 'access.owners': 1 });
environmentSchema.index({ 'access.developers': 1 });
environmentSchema.index({ createdAt: -1 });

// Generate ID before saving
environmentSchema.pre('save', function(next: () => void) {
  if (this.isNew && !this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Environment = mongoose.model<IEnvironment>('Environment', environmentSchema);