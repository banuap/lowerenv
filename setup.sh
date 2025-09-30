#!/bin/bash

# Lower Environment Management Platform - Team Setup Script
# This script helps new team members set up their development environment

echo "🚀 Setting up Lower Environment Management Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB not found. Please install MongoDB or use Docker."
    echo "   Docker option: docker run -d -p 27017:27017 --name mongodb mongo:6.0"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "📦 Installing backend dependencies..."
cd backend && npm install

echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install
cd ..

# Copy environment files
echo "⚙️  Setting up environment configuration..."
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from template"
    echo "⚠️  Please edit backend/.env with your specific configuration"
else
    echo "✅ backend/.env already exists"
fi

# Create logs directory
mkdir -p backend/logs
echo "✅ Created logs directory"

# Check if MongoDB is accessible
echo "🔍 Checking MongoDB connection..."
if mongosh --eval "db.runCommand({ping: 1})" &> /dev/null; then
    echo "✅ MongoDB is accessible"
else
    echo "⚠️  MongoDB connection failed. Make sure MongoDB is running on localhost:27017"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Edit backend/.env with your configuration"
echo "2. Start the development environment:"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo ""
echo "📚 For more information, see:"
echo "   - README.md for full documentation"
echo "   - CONTRIBUTING.md for development guidelines"
echo ""