#!/bin/bash

# Simple test script to build and upload one Lambda function to S3
set -e

echo "🧪 Testing S3-based Lambda deployment (single function)"

# Configuration
PROJECT_NAME="site-generator"
ENVIRONMENT="dev"
AWS_REGION="us-east-1"
ARTIFACT_VERSION=$(date +%Y%m%d-%H%M%S)
S3_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-lambda-deployments"
FUNCTION_DIR="api/create-deployment"

echo "📦 Building ${FUNCTION_DIR}..."
echo "S3 Bucket: ${S3_BUCKET}"
echo "Artifact Version: ${ARTIFACT_VERSION}"

# Verify S3 bucket exists
if ! aws s3 ls "s3://${S3_BUCKET}" &> /dev/null; then
  echo "❌ Cannot access S3 bucket: ${S3_BUCKET}"
  echo "💡 Run: terraform apply -target=aws_s3_bucket.lambda_deployments"
  exit 1
fi

# Create temporary build directory
BUILD_DIR=$(mktemp -d)
trap "rm -rf ${BUILD_DIR}" EXIT

# Build the function
cd "$FUNCTION_DIR"
echo "📥 Installing dependencies..."
npm install --silent

echo "🔧 Compiling TypeScript..."
npx tsc

# Create deployment package
DEPLOY_DIR="${BUILD_DIR}/deploy"
mkdir -p "$DEPLOY_DIR"

# Copy compiled JavaScript
if [ -f "dist/index.js" ]; then
  cp dist/index.js "$DEPLOY_DIR/index.js"
else
  echo "❌ No compiled JavaScript found"
  exit 1
fi

# Create package.json with uuid dependency (for create-deployment)
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "create-deployment",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
EOF

# Install production dependencies
cd "$DEPLOY_DIR"
npm install --production --no-audit --no-fund --no-optional --silent

# Remove unnecessary files
find node_modules -name "*.md" -delete 2>/dev/null || true
find node_modules -name "LICENSE*" -delete 2>/dev/null || true
find node_modules -name "*.d.ts" -delete 2>/dev/null || true

# Create ZIP package
PACKAGE_NAME="api-create-deployment-${ARTIFACT_VERSION}.zip"
zip -rq "${BUILD_DIR}/${PACKAGE_NAME}" . > /dev/null

cd - > /dev/null

# Upload to S3
S3_KEY="api/create-deployment/${ARTIFACT_VERSION}.zip"
echo "☁️  Uploading to s3://${S3_BUCKET}/${S3_KEY}..."

if aws s3 cp "${BUILD_DIR}/${PACKAGE_NAME}" "s3://${S3_BUCKET}/${S3_KEY}" \
  --metadata "function=create-deployment,category=api,version=${ARTIFACT_VERSION}" \
  --storage-class STANDARD; then
  echo "✅ Upload successful!"
  
  # Also upload as 'latest'
  aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "s3://${S3_BUCKET}/api/create-deployment/latest.zip" > /dev/null
  echo "✅ Latest version updated"
  
  # Verify upload
  SIZE=$(aws s3api head-object --bucket "$S3_BUCKET" --key "$S3_KEY" --query 'ContentLength' --output text)
  SIZE_MB=$((SIZE / 1024 / 1024))
  echo "📊 Package size: ${SIZE_MB}MB"
  
  echo ""
  echo "🎉 Test deployment successful!"
  echo "📋 Next steps:"
  echo "  1. Update terraform.tfvars: lambda_artifact_version = \"${ARTIFACT_VERSION}\""
  echo "  2. Run: terraform apply"
  
else
  echo "❌ Upload failed"
  exit 1
fi