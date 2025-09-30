FROM node:18-alpine AS base

# Install system dependencies including deployment tools
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    py3-pip \
    openssh-client \
    && pip3 install ansible

# Install Terraform
ARG TERRAFORM_VERSION=1.5.7
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    && unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    && mv terraform /usr/local/bin/ \
    && rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Google Cloud SDK
RUN curl -sSL https://sdk.cloud.google.com | bash
ENV PATH $PATH:/root/google-cloud-sdk/bin

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Development stage
FROM base AS development
RUN npm ci
RUN cd backend && npm ci
RUN cd frontend && npm ci
COPY . .
EXPOSE 3000 5000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS build
RUN npm ci --only=production
RUN cd backend && npm ci --only=production
RUN cd frontend && npm ci
COPY . .
RUN cd frontend && npm run build
RUN cd backend && npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    python3 \
    py3-pip \
    openssh-client \
    && pip3 install ansible

# Install Terraform
ARG TERRAFORM_VERSION=1.5.7
RUN wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    && unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
    && mv terraform /usr/local/bin/ \
    && rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Google Cloud SDK
RUN curl -sSL https://sdk.cloud.google.com | bash
ENV PATH $PATH:/root/google-cloud-sdk/bin

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=build --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=build --chown=nodejs:nodejs /app/backend/package*.json ./backend/

USER nodejs

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]