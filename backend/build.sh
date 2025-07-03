#!/bin/bash

# Build script for Lambda functions

set -e

echo "Building Lambda functions..."

# Function directories
FUNCTIONS=(
  "api/create-deployment"
  "api/get-deployment"
  "api/get-deployments"
  "websocket/connect"
  "websocket/disconnect"
  "websocket/status"
  "orchestrator/terraform-runner"
)

# Build each function
for func in "${FUNCTIONS[@]}"; do
  echo "Building $func..."
  
  cd "$func"
  
  # Install dependencies
  npm install --production
  
  # Compile TypeScript
  npx tsc index.ts --outDir . --module commonjs --target es2018
  
  # Create deployment package
  zip -r "../../../dist/$(basename $(dirname $func))-$(basename $func).zip" . -x "*.ts" -x "tsconfig.json"
  
  cd - > /dev/null
done

echo "Build complete! Deployment packages are in the dist/ directory."