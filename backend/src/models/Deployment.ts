import mongoose, { Schema, Document } from 'mongoose';
import { DeploymentConfig } from '../../../shared/types';

export interface IDeployment extends Omit<DeploymentConfig, 'id'>, Document {
  id?: string;
}

const deploymentSchema = new Schema<IDeployment>({
  name: {
    type: String,
    required: true
  },
  description: String,
  sourceType: {
    type: String,
    required: true,
    enum: ['pcf', 'vm', 'baremetal', 'gke', 'gce']
  },
  githubRepo: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  targetGCPProject: {
    type: String,
    required: true
  },
  targetCluster: {
    type: String,
    required: true
  },
  targetNamespace: {
    type: String,
    required: true
  },
  environment: {
    type: String,
    required: true,
    enum: ['dev', 'staging', 'test']
  },
  deploymentType: {
    type: String,
    required: true,
    enum: ['terraform', 'helm', 'ansible', 'hybrid', 'kubectl', 'kustomize', 'gke-autopilot', 'gce-instance', 'cloud-deployment-manager']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  createdBy: {
    type: String,
    required: true
  },
  lastDeployedAt: Date,
  config: {
    terraform: {
      workspaceDir: String,
      variables: Schema.Types.Mixed,
      backend: {
        type: String,
        bucket: String,
        prefix: String
      }
    },
    helm: {
      chartPath: String,
      values: Schema.Types.Mixed,
      release: String,
      namespace: String,
      timeout: Number
    },
    ansible: {
      playbookPath: String,
      inventory: String,
      variables: Schema.Types.Mixed,
      vault: {
        passwordFile: String
      }
    },
    kubectl: {
      manifestsPath: String,
      applyOrder: [String],
      namespace: String,
      kubeconfig: String,
      dryRun: Boolean,
      waitForCompletion: Boolean,
      timeout: Number
    },
    kustomize: {
      kustomizationPath: String,
      overlayPath: String,
      namespace: String,
      kubeconfig: String,
      buildArgs: Schema.Types.Mixed,
      images: [{
        name: String,
        newTag: String
      }]
    },
    gkeAutopilot: {
      cluster: String,
      region: String,
      manifestsPath: String,
      namespace: String,
      resourceLimits: {
        cpu: String,
        memory: String
      },
      autopilotFeatures: {
        verticalPodAutoscaling: Boolean,
        horizontalPodAutoscaling: Boolean,
        nodeAutoProvisioning: Boolean
      }
    },
    gceInstance: {
      instanceTemplate: String,
      zone: String,
      machineType: String,
      diskConfig: {
        bootDisk: {
          image: String,
          sizeGb: Number,
          type: {
            type: String,
            enum: ['pd-standard', 'pd-ssd', 'pd-balanced']
          }
        },
        additionalDisks: [{
          name: String,
          sizeGb: Number,
          type: String
        }]
      },
      networkConfig: {
        network: String,
        subnet: String,
        externalIP: Boolean,
        tags: [String]
      },
      metadata: Schema.Types.Mixed,
      serviceAccount: {
        email: String,
        scopes: [String]
      },
      startupScript: String
    },
    cloudDeploymentManager: {
      templatePath: String,
      deploymentName: String,
      properties: Schema.Types.Mixed,
      imports: [String],
      createPolicy: {
        type: String,
        enum: ['CREATE_OR_ACQUIRE', 'ACQUIRE']
      },
      deletePolicy: {
        type: String,
        enum: ['DELETE', 'ABANDON']
      },
      preview: Boolean
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
deploymentSchema.index({ name: 1, environment: 1 }, { unique: true });
deploymentSchema.index({ status: 1 });
deploymentSchema.index({ environment: 1 });
deploymentSchema.index({ createdBy: 1 });
deploymentSchema.index({ createdAt: -1 });

// Generate ID before saving
deploymentSchema.pre('save', function(next: () => void) {
  if (this.isNew && !this.id) {
    this.id = this._id.toString();
  }
  next();
});

export const Deployment = mongoose.model<IDeployment>('Deployment', deploymentSchema);