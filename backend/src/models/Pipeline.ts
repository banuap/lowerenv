import mongoose, { Schema, Document } from 'mongoose';
import { Pipeline as PipelineType, PipelineStep } from '../../../shared/types';

export interface IPipeline extends Omit<PipelineType, 'id'>, Document {
  id?: string;
  metadata?: {
    commitSha?: string;
    branch?: string;
    author?: string;
    message?: string;
  };
}

const pipelineStepSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['clone', 'build', 'terraform', 'helm', 'ansible', 'notify']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  startTime: Date,
  endTime: Date,
  logs: [String],
  config: Schema.Types.Mixed
});

const pipelineSchema = new Schema<IPipeline>({
  deploymentId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  triggeredBy: {
    type: String,
    required: true
  },
  startTime: Date,
  endTime: Date,
  steps: [pipelineStepSchema],
  metadata: {
    commitSha: String,
    branch: String,
    author: String,
    message: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
pipelineSchema.index({ deploymentId: 1, createdAt: -1 });
pipelineSchema.index({ status: 1 });
pipelineSchema.index({ triggeredBy: 1 });

// Generate ID before saving
pipelineSchema.pre('save', function(next: () => void) {
  if (this.isNew && !this.id) {
    this.id = (this as any)._id.toString();
  }
  next();
});

export const PipelineModel = mongoose.model<IPipeline>('Pipeline', pipelineSchema);