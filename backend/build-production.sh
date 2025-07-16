#!/bin/bash

# DEPRECATED: This script creates local ZIP files (archive_file anti-pattern)
# AWS Best Practice: Use build-production-s3.sh for S3-based deployments

set -e

echo "⚠️  DEPRECATED BUILD SCRIPT"
echo "🚀 For AWS best practices, use: ./build-production-s3.sh"
echo "📖 This script creates local ZIP files (Terraform archive_file anti-pattern)"
echo ""
echo "Continuing with legacy build for compatibility..."
echo ""

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

# Clean up old packages
rm -f ../infrastructure/modules/lambda-function/lambda-site-generator-dev-*.zip

# Build each function
for func in "${FUNCTIONS[@]}"; do
  echo "📦 Building $func..."
  
  cd "$func"
  
  # Clean start
  rm -rf node_modules dist build *.js package-lock.json
  
  # Install dependencies with TypeScript for compilation
  npm install
  
  # Compile TypeScript directly since we have typescript as devDependency
  npx tsc
  
  # Create deployment directory with minimal content
  mkdir -p deploy
  
  # Copy only the compiled JavaScript
  if [ -f "dist/index.js" ]; then
    cp dist/index.js deploy/index.js
  else
    echo "❌ No compiled JavaScript found for $func"
    cd - > /dev/null
    continue
  fi
  
  # Create minimal production package.json (NO dependencies except uuid for create-deployment)
  if [[ "$func" == "api/create-deployment" ]]; then
    cat > deploy/package.json << 'EOF'
{
  "name": "create-deployment",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
EOF
  else
    cat > deploy/package.json << 'EOF'
{
  "name": "lambda-function",
  "version": "1.0.0", 
  "main": "index.js",
  "dependencies": {}
}
EOF
  fi
  
  # Install only required production dependencies
  cd deploy
  if grep -q '"uuid"' package.json; then
    npm install --production --no-audit --no-fund --no-optional
    # Remove unnecessary files from uuid package
    find node_modules -name "*.md" -delete 2>/dev/null || true
    find node_modules -name "LICENSE*" -delete 2>/dev/null || true
    find node_modules -name "CHANGELOG*" -delete 2>/dev/null || true
    find node_modules -name "*.d.ts" -delete 2>/dev/null || true
    find node_modules -name "test*" -type d -exec rm -rf {} + 2>/dev/null || true
  fi
  cd ..
  
  # Create minimal deployment package
  PACKAGE_NAME="lambda-site-generator-dev-$(basename $(dirname $func))-$(basename $func).zip"
  cd deploy
  zip -rq "../../../infrastructure/modules/lambda-function/$PACKAGE_NAME" .
  cd ..
  
  # Get package size for verification
  PACKAGE_SIZE=$(du -h "../../../infrastructure/modules/lambda-function/$PACKAGE_NAME" | cut -f1)
  echo "✅ Created $PACKAGE_NAME ($PACKAGE_SIZE)"
  
  # Cleanup
  rm -rf deploy dist
  
  cd - > /dev/null
done

echo ""
echo "🎉 Build complete! Final package sizes:"
ls -lh ../infrastructure/modules/lambda-function/lambda-site-generator-dev-*.zip

echo ""
echo "📊 Package size verification:"
for zip_file in ../infrastructure/modules/lambda-function/lambda-site-generator-dev-*.zip; do
  size_mb=$(du -m "$zip_file" | cut -f1)
  filename=$(basename "$zip_file")
  if [ "$size_mb" -gt 50 ]; then
    echo "❌ $filename: ${size_mb}MB (EXCEEDS 50MB LIMIT)"
  elif [ "$size_mb" -gt 10 ]; then
    echo "⚠️  $filename: ${size_mb}MB (Warning: Large package)"
  else
    echo "✅ $filename: ${size_mb}MB (Optimal)"
  fi
done

echo ""
echo "✅ AWS Well-Architected Optimizations:"
echo "  📊 Performance Efficiency: Minimal packages for fastest cold starts"
echo "  💰 Cost Optimization: No AWS SDK = Lower execution time & memory"
echo "  🔧 Operational Excellence: Automated, reproducible builds"
echo "  🔒 Security: Only necessary runtime dependencies"