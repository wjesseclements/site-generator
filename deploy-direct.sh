#!/bin/bash

# Direct deployment without IAM role assumption
# Use this if you have PowerUserAccess but not IAMFullAccess

set -e

echo "🚀 Site Generator Platform Direct Deployment"
echo "=========================================="

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Get current AWS identity
CURRENT_IDENTITY=$(aws sts get-caller-identity)
CURRENT_ACCOUNT=$(echo $CURRENT_IDENTITY | jq -r '.Account')
CURRENT_ARN=$(echo $CURRENT_IDENTITY | jq -r '.Arn')

echo "📋 Current AWS Identity:"
echo "   Account: $CURRENT_ACCOUNT"
echo "   ARN: $CURRENT_ARN"
echo ""
echo "⚠️  Note: This deployment requires PowerUserAccess permissions"
echo "   Some resources (IAM roles) will need to be created manually"
echo ""

# Step 1: Deploy Infrastructure (excluding IAM)
echo "📦 Step 1: Deploying Infrastructure with Terraform"
echo "-------------------------------------------------"
cd infrastructure

# Comment out IAM-related resources temporarily
if [ -f "iam-setup.tf" ]; then
    echo "→ Temporarily disabling IAM setup..."
    mv iam-setup.tf iam-setup.tf.disabled
fi

# Initialize Terraform
echo "→ Initializing Terraform..."
terraform init

# Plan deployment
echo "→ Planning infrastructure deployment..."
terraform plan -var-file=terraform.tfvars -out=tfplan

# Ask for confirmation
echo ""
echo "⚠️  WARNING: This will create AWS resources that cost money"
read -p "Do you want to apply these changes? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    # Restore IAM setup file
    [ -f "iam-setup.tf.disabled" ] && mv iam-setup.tf.disabled iam-setup.tf
    exit 0
fi

# Apply Terraform
echo "→ Applying infrastructure changes..."
terraform apply tfplan

# Capture outputs
echo "→ Capturing deployment outputs..."
API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
WEBSOCKET_URL=$(terraform output -raw websocket_url 2>/dev/null || echo "")
FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "")
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
USER_POOL_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id 2>/dev/null || echo "")
IDENTITY_POOL_ID=$(terraform output -raw cognito_identity_pool_id 2>/dev/null || echo "")
FRONTEND_BUCKET=$(echo $FRONTEND_URL | sed 's|http://||' | sed 's|\.s3-website.*||')

# Restore IAM setup file
[ -f "iam-setup.tf.disabled" ] && mv iam-setup.tf.disabled iam-setup.tf

cd ..

# Step 2: Build Lambda Functions
echo ""
echo "🔧 Step 2: Building Lambda Functions"
echo "-----------------------------------"
cd backend

# Create dist directory
mkdir -p dist

# Build each Lambda function
echo "→ Building Lambda functions..."
FUNCTIONS=(
    "api/create-deployment"
    "api/get-deployment"
    "api/get-deployments"
    "websocket/connect"
    "websocket/disconnect"
    "websocket/status"
    "orchestrator/terraform-runner"
)

for func in "${FUNCTIONS[@]}"; do
    echo "  Building $func..."
    if [ -d "$func" ]; then
        cd $func
        npm install --production 2>/dev/null || true
        zip -rq ../../../dist/$(echo $func | tr '/' '-').zip . -x "*.ts" -x "tsconfig.json"
        cd - > /dev/null
    fi
done

echo "✅ Lambda functions built"

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

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "→ Installing frontend dependencies..."
    npm install
fi

# Build frontend
echo "→ Building frontend application..."
npm run build:static

# Deploy to S3
echo "→ Deploying frontend to S3..."
aws s3 sync out/ s3://$FRONTEND_BUCKET/ --delete

cd ..

# Summary
echo ""
echo "✅ Deployment Complete!"
echo "====================="
echo ""
if [ -n "$FRONTEND_URL" ]; then
    echo "🌐 Frontend URL: $FRONTEND_URL"
fi
if [ -n "$API_URL" ]; then
    echo "🔌 API Gateway: $API_URL"
fi
if [ -n "$WEBSOCKET_URL" ]; then
    echo "🔄 WebSocket: $WEBSOCKET_URL"
fi
if [ -n "$USER_POOL_ID" ]; then
    echo "👤 User Pool ID: $USER_POOL_ID"
fi
echo ""
echo "📝 Manual Steps Required:"
echo "1. Ask your AWS administrator to create the missing IAM roles"
echo "2. Create a test user in Cognito:"
echo "   aws cognito-idp admin-create-user \\"
echo "     --user-pool-id $USER_POOL_ID \\"
echo "     --username testuser@example.com \\"
echo "     --user-attributes Name=email,Value=testuser@example.com"
echo ""
echo "3. Visit: $FRONTEND_URL"
echo ""
echo "⚠️  Note: Some features may not work until IAM roles are created"