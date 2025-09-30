# Lower Environment Deployment Platform

An automated deployment platform designed for lower environments (dev, staging, test) with support for Terraform, Helm, and Ansible deployments to Google Cloud Platform.

## Features

- 🚀 **Multi-Tool Support**: Terraform, Helm, and Ansible deployments
- ☁️ **GCP Integration**: Deploy to Google Kubernetes Engine clusters
- 📊 **Real-time Monitoring**: Live pipeline execution with WebSocket updates
- 🔄 **GitHub Integration**: Automatic deployments from repository changes
- 📈 **Metrics & Analytics**: Deployment success rates and performance tracking
- 🛡️ **Security**: JWT authentication and role-based access control
- 🎨 **Modern UI**: React-based dashboard with Tailwind CSS

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │────│   Express API    │────│   MongoDB       │
│   (Frontend)    │    │   (Backend)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐            │
         └──────────────│   Socket.IO      │────────────┘
                        │   (Real-time)    │
                        └──────────────────┘
                                 │
                    ┌─────────────────────────────┐
                    │     Pipeline Orchestrator   │
                    └─────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────────────┐ ┌─────────┐ ┌─────────────┐
        │   Terraform   │ │  Helm   │ │   Ansible   │
        └───────────────┘ └─────────┘ └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- MongoDB (or use Docker Compose)
- Google Cloud SDK (for GCP deployments)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lowerenv
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Configure environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start development environment**
   ```bash
   # Option 1: Local development
   npm run dev

   # Option 2: Docker development
   npm run docker:dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

### Production Deployment

```bash
# Build and start production environment
npm run docker:prod
```

## Configuration

### Backend Environment Variables

Key environment variables that need to be configured:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/deployment-platform

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key

# GitHub Integration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Google Cloud Platform
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-default-gcp-project

# Deployment Tools (optional)
TERRAFORM_PATH=/usr/local/bin/terraform
HELM_PATH=/usr/local/bin/helm
ANSIBLE_PATH=/usr/local/bin/ansible-playbook
```

### Required Tools Installation

The platform requires these deployment tools to be available:

- **Terraform**: Infrastructure as Code
- **Helm**: Kubernetes package manager
- **Ansible**: Configuration management
- **Google Cloud SDK**: GCP integration

## API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Deployments
```
GET    /api/deployments
POST   /api/deployments
GET    /api/deployments/:id
PUT    /api/deployments/:id
DELETE /api/deployments/:id
POST   /api/deployments/:id/trigger
```

### Pipelines
```
GET /api/pipelines/:deploymentId
GET /api/pipelines/details/:pipelineId
```

### Metrics
```
GET /api/metrics/dashboard
GET /api/metrics/deployments-by-environment
GET /api/metrics/recent-activity
```

## Usage Examples

### Creating a Terraform Deployment

```json
{
  "name": "my-infrastructure",
  "description": "Deploy GCP infrastructure",
  "sourceType": "vm",
  "githubRepo": "https://github.com/user/terraform-configs.git",
  "branch": "main",
  "environment": "dev",
  "deploymentType": "terraform",
  "targetGCPProject": "my-gcp-project",
  "targetCluster": "dev-cluster",
  "targetNamespace": "default",
  "config": {
    "terraform": {
      "workspaceDir": "terraform",
      "variables": {
        "environment": "dev",
        "project_id": "my-gcp-project"
      }
    }
  }
}
```

### Creating a Helm Deployment

```json
{
  "name": "my-app",
  "description": "Deploy application using Helm",
  "sourceType": "vm",
  "githubRepo": "https://github.com/user/my-app.git",
  "branch": "develop",
  "environment": "dev",
  "deploymentType": "helm",
  "targetGCPProject": "my-gcp-project",
  "targetCluster": "dev-cluster",
  "targetNamespace": "my-app",
  "config": {
    "helm": {
      "chartPath": "helm/my-app",
      "release": "my-app-dev",
      "values": {
        "image.tag": "latest",
        "replicas": 2
      }
    }
  }
}
```

## Development

### Project Structure

```
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── package.json
├── shared/                # Shared TypeScript types
├── docker/               # Docker configuration
├── k8s/                 # Kubernetes manifests
└── scripts/            # Setup and deployment scripts
```

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend
```

### Code Quality

```bash
# Run linters
npm run lint

# Format code
npm run format
```

## Deployment Pipeline

The platform supports automated deployment pipelines with these steps:

1. **Clone**: Fetch code from GitHub repository
2. **Build**: Build application artifacts (if needed)
3. **Deploy**: Execute deployment using selected tool:
   - **Terraform**: Apply infrastructure changes
   - **Helm**: Install/upgrade Kubernetes applications
   - **Ansible**: Run configuration playbooks
4. **Notify**: Send deployment status notifications

## Monitoring & Logging

- **Real-time Updates**: WebSocket connections for live pipeline monitoring
- **Deployment Metrics**: Success rates, deployment times, environment statistics
- **Logging**: Structured logging with configurable levels
- **Health Checks**: API endpoints for monitoring application health

## Security Considerations

- JWT-based authentication with secure token handling
- Environment variable management for sensitive configuration
- Docker security best practices with non-root users
- Network isolation using Docker networks
- HTTPS support in production configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation and API reference
- Review the troubleshooting guide

---

**Note**: This platform is designed for lower environments (dev, staging, test) and should be properly secured and configured before use in production environments.