#!/bin/bash

# Site Generator Deployment Script

set -e

echo "🚀 Site Generator Platform Deployment"
echo "===================================="

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_SESSION_TOKEN" ]; then
    echo "❌ AWS credentials not found. Please set:"
    echo "   export AWS_ACCESS_KEY_ID='your-key'"
    echo "   export AWS_SECRET_ACCESS_KEY='your-secret'"
    echo "   export AWS_SESSION_TOKEN='your-token'"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Using AWS Account: $AWS_ACCOUNT_ID"

# Step 1: Deploy Infrastructure
echo ""
echo "📦 Step 1: Deploying Infrastructure with Terraform"
echo "-------------------------------------------------"
cd infrastructure

# Initialize Terraform
echo "→ Initializing Terraform..."
terraform init

# Plan deployment
echo "→ Planning infrastructure deployment..."
terraform plan -var-file=terraform.tfvars -out=tfplan

# Ask for confirmation
echo ""
read -p "Do you want to apply these changes? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Apply Terraform
echo "→ Applying infrastructure changes..."
terraform apply tfplan

# Capture outputs
echo "→ Capturing deployment outputs..."
API_URL=$(terraform output -raw api_gateway_url)
WEBSOCKET_URL=$(terraform output -raw websocket_url)
FRONTEND_URL=$(terraform output -raw frontend_url)
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
USER_POOL_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)
IDENTITY_POOL_ID=$(terraform output -raw cognito_identity_pool_id)
FRONTEND_BUCKET=$(terraform output -raw lambda_deployment_bucket | sed 's/-lambda-deployments//')

cd ..

# Step 2: Build and Deploy Lambda Functions
echo ""
echo "🔧 Step 2: Building Lambda Functions"
echo "-----------------------------------"
cd backend

# Create dist directory
mkdir -p dist

# Build each Lambda function
echo "→ Building Lambda functions..."
for func in api/create-deployment api/get-deployment api/get-deployments websocket/connect websocket/disconnect websocket/status orchestrator/terraform-runner; do
    echo "  Building $func..."
    cd $func
    npm install --production 2>/dev/null || true
    zip -rq ../../../dist/$(echo $func | tr '/' '-').zip . -x "*.ts" -x "tsconfig.json"
    cd - > /dev/null
done

echo "✅ Lambda functions built successfully"

cd ..

# Step 3: Deploy Frontend
echo ""
echo "🌐 Step 3: Deploying Frontend"
echo "----------------------------"
cd frontend

# Create .env.local with actual values
echo "→ Creating frontend configuration..."
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=$API_URL
NEXT_PUBLIC_WEBSOCKET_URL=$WEBSOCKET_URL
NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
NEXT_PUBLIC_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
NEXT_PUBLIC_REGION=us-east-1
EOF

# Build frontend
echo "→ Building frontend application..."
npm run build:static

# Deploy to S3
echo "→ Deploying frontend to S3..."
aws s3 sync out/ s3://$FRONTEND_BUCKET-frontend/ --delete

cd ..

# Step 4: Update CORS
echo ""
echo "🔧 Step 4: Updating CORS Configuration"
echo "-------------------------------------"
cd infrastructure

# Update terraform.tfvars with actual frontend URL
echo "→ Updating CORS origins..."
cat > terraform.tfvars.tmp << EOF
# Site Generator Platform Configuration

# Project configuration
project_name = "site-generator"
environment  = "dev"
aws_region   = "us-east-1"

# CORS configuration
allowed_origins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "$FRONTEND_URL"
]

# Resource configuration
log_retention_days = 7
lambda_memory_size = 512
lambda_timeout     = 300

# DynamoDB configuration
dynamodb_billing_mode = "PAY_PER_REQUEST"

# Security
enable_deletion_protection = false

# Tags for cost tracking
tags = {
  Team       = "Platform"
  CostCenter = "Engineering"
  Owner      = "jc"
  Project    = "SiteGenerator"
}
EOF

mv terraform.tfvars.tmp terraform.tfvars

# Apply CORS update
echo "→ Applying CORS configuration..."
terraform apply -var-file=terraform.tfvars -auto-approve -target=aws_api_gateway_deployment.main

cd ..

# Summary
echo ""
echo "✅ Deployment Complete!"
echo "====================="
echo ""
echo "🌐 Frontend URL: $FRONTEND_URL"
echo "🔌 API Gateway: $API_URL"
echo "🔄 WebSocket: $WEBSOCKET_URL"
echo ""
echo "📝 Next Steps:"
echo "1. Visit the frontend URL to access your Site Generator"
echo "2. Create a test user in Cognito User Pool: $USER_POOL_ID"
echo "3. Deploy your first template!"
echo ""
echo "⚠️  Note: Your AWS session token will expire. For production, use permanent credentials or IAM roles."