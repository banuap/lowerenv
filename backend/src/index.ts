import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import deploymentRoutes from './routes/deployment';
import pipelineRoutes from './routes/pipeline';
import metricsRoutes from './routes/metrics';

// Import middleware
import { auth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './config/logger';
import { seedDatabase } from './seed';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:5173",
      "http://192.168.1.200:3000",
      "http://192.168.1.200:5173"
    ],
    methods: ["GET", "POST"]
  }
});

// Make io available globally for real-time updates
declare global {
  var io: Server;
}
global.io = io;

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deployment-platform';

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:5173",
    "http://192.168.1.200:3000",
    "http://192.168.1.200:5173"
  ],
  credentials: true
}));
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/deployments', auth, deploymentRoutes);
app.use('/api/pipelines', auth, pipelineRoutes);
app.use('/api/metrics', auth, metricsRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-deployment', (deploymentId: string) => {
    socket.join(`deployment-${deploymentId}`);
    logger.info(`Client ${socket.id} joined deployment room: ${deploymentId}`);
  });

  socket.on('leave-deployment', (deploymentId: string) => {
    socket.leave(`deployment-${deploymentId}`);
    logger.info(`Client ${socket.id} left deployment room: ${deploymentId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB successfully');
    
    // Seed database with demo users
    await seedDatabase();

    // Create necessary directories for logs
    const fs = require('fs');
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
  });
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  gracefulShutdown('SIGINT');
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Bind to all network interfaces (0.0.0.0) so it can accept connections from other devices
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Server accessible at:`);
      logger.info(`  Local: http://localhost:${PORT}`);
      logger.info(`  Network: http://192.168.1.200:${PORT}`);
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();