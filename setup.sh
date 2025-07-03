#!/bin/bash

# Setup script for Site Generator

echo "🔧 Setting up Site Generator Platform"
echo "===================================="

# Install frontend dependencies
echo "→ Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies (for TypeScript compilation)
echo "→ Setting up backend..."
cd backend
for func in api/create-deployment api/get-deployment api/get-deployments websocket/connect websocket/disconnect websocket/status orchestrator/terraform-runner; do
    echo "  Installing dependencies for $func..."
    cd $func
    npm install --production 2>/dev/null || true
    cd - > /dev/null
done
cd ..

echo "✅ Setup complete! Run ./deploy.sh to deploy the platform."