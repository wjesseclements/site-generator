#!/bin/bash

# Site Generator Deployment Script with IAM Role
# This script assumes an IAM role for deployment instead of using temporary credentials

set -e

echo "🚀 Site Generator Platform Deployment (with IAM Role)"
echo "==================================================="

# Configuration
ROLE_NAME="site-generator-terraform-deploy"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-site-generator}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Check if AWS CLI is configured
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

# Check if we need to create the deployment role
ROLE_ARN="arn:aws:iam::$CURRENT_ACCOUNT:role/$ROLE_NAME"
if ! aws iam get-role --role-name $ROLE_NAME &>/dev/null; then
    echo ""
    echo "⚠️  Deployment role not found. Creating it now..."
    
    # First, deploy just the IAM setup
    cd infrastructure
    terraform init
    terraform apply -target=aws_iam_role.terraform_deploy -target=aws_iam_role_policy.terraform_deploy -var-file=terraform.tfvars -auto-approve
    cd ..
    
    echo "✅ Deployment role created: $ROLE_ARN"
fi

# Assume the deployment role
echo ""
echo "🔐 Assuming deployment role..."
CREDS=$(aws sts assume-role --role-arn $ROLE_ARN --role-session-name deployment-$(date +%s))

# Export credentials
export AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo $CREDS | jq -r '.Credentials.SessionToken')

echo "✅ Successfully assumed deployment role"

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
FRONTEND_BUCKET=$(echo $(terraform output -raw frontend_url) | sed 's|http://||' | sed 's|\.s3-website.*||')

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
        
        # Compile TypeScript if tsconfig exists
        if [ -f "tsconfig.json" ]; then
            npx tsc 2>/dev/null || true
        fi
        
        zip -rq ../../../dist/$(echo $func | tr '/' '-').zip . -x "*.ts" -x "tsconfig.json" -x "node_modules/*"
        cd - > /dev/null
    fi
done

echo "→ Uploading Lambda functions..."
LAMBDA_BUCKET="${DEPLOYMENT_NAME}-${ENVIRONMENT}-lambda-deployments"

for func in "${FUNCTIONS[@]}"; do
    ZIP_FILE="dist/$(echo $func | tr '/' '-').zip"
    if [ -f "$ZIP_FILE" ]; then
        FUNCTION_NAME="${DEPLOYMENT_NAME}-${ENVIRONMENT}-$(echo $func | tr '/' '-')"
        echo "  Updating $FUNCTION_NAME..."
        
        # Upload to S3 first
        aws s3 cp $ZIP_FILE s3://$LAMBDA_BUCKET/
        
        # Update function code
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --s3-bucket $LAMBDA_BUCKET \
            --s3-key $(basename $ZIP_FILE) \
            --region $AWS_REGION 2>/dev/null || echo "    (Function will be created by Terraform)"
    fi
done

echo "✅ Lambda functions built and deployed"

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
NEXT_PUBLIC_REGION=$AWS_REGION
EOF

# Build frontend
echo "→ Building frontend application..."
npm run build:static

# Deploy to S3
echo "→ Deploying frontend to S3..."
aws s3 sync out/ s3://$FRONTEND_BUCKET/ --delete

# Set proper content types
aws s3 cp s3://$FRONTEND_BUCKET/ s3://$FRONTEND_BUCKET/ \
    --exclude "*" \
    --include "*.html" \
    --recursive \
    --metadata-directive REPLACE \
    --content-type "text/html"

aws s3 cp s3://$FRONTEND_BUCKET/ s3://$FRONTEND_BUCKET/ \
    --exclude "*" \
    --include "*.js" \
    --recursive \
    --metadata-directive REPLACE \
    --content-type "application/javascript"

aws s3 cp s3://$FRONTEND_BUCKET/ s3://$FRONTEND_BUCKET/ \
    --exclude "*" \
    --include "*.css" \
    --recursive \
    --metadata-directive REPLACE \
    --content-type "text/css"

cd ..

# Step 4: Update Infrastructure with Frontend URL
echo ""
echo "🔧 Step 4: Updating CORS Configuration"
echo "-------------------------------------"
cd infrastructure

# Update CORS to include the actual frontend URL
terraform apply -var-file=terraform.tfvars -auto-approve \
    -var "allowed_origins=[\"http://localhost:3000\",\"http://localhost:3001\",\"$FRONTEND_URL\"]" \
    -target=aws_api_gateway_deployment.main \
    -target=aws_apigatewayv2_deployment.websocket

cd ..

# Summary
echo ""
echo "✅ Deployment Complete!"
echo "====================="
echo ""
echo "🌐 Frontend URL: $FRONTEND_URL"
echo "🔌 API Gateway: $API_URL"
echo "🔄 WebSocket: $WEBSOCKET_URL"
echo "👤 User Pool ID: $USER_POOL_ID"
echo ""
echo "📝 Next Steps:"
echo "1. Create a test user:"
echo "   aws cognito-idp admin-create-user \\"
echo "     --user-pool-id $USER_POOL_ID \\"
echo "     --username testuser@example.com \\"
echo "     --user-attributes Name=email,Value=testuser@example.com \\"
echo "     --temporary-password TempPass123!"
echo ""
echo "2. Visit the frontend URL: $FRONTEND_URL"
echo "3. Sign in with the test user credentials"
echo "4. Deploy your first template!"
echo ""
echo "🔒 Security Notes:"
echo "- The deployment role has broad permissions"
echo "- Consider restricting S3 bucket access to corporate IPs"
echo "- Enable MFA for production use"
echo ""
echo "🎉 Your Site Generator Platform is ready!"