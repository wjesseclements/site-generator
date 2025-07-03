#!/bin/bash

# Setup IAM roles for Site Generator Platform

set -e

echo "🔐 Setting up IAM roles for Site Generator Platform"
echo "================================================="

# Get AWS account information
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CURRENT_USER=$(aws sts get-caller-identity --query Arn --output text)

echo "📋 AWS Account: $ACCOUNT_ID"
echo "👤 Current User: $CURRENT_USER"
echo ""

# Option 1: Create deployment role for local development
echo "1️⃣ Creating Terraform deployment role..."

# Create trust policy
cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "$CURRENT_USER"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name site-generator-terraform-deploy \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "Role for deploying Site Generator infrastructure" 2>/dev/null || echo "   Role already exists"

# Attach PowerUserAccess policy (you can restrict this later)
aws iam attach-role-policy \
  --role-name site-generator-terraform-deploy \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess 2>/dev/null || echo "   Policy already attached"

# Also attach IAMFullAccess to allow creating other roles
aws iam attach-role-policy \
  --role-name site-generator-terraform-deploy \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess 2>/dev/null || echo "   IAM policy already attached"

echo "✅ Terraform deployment role created"
echo "   ARN: arn:aws:iam::$ACCOUNT_ID:role/site-generator-terraform-deploy"

# Option 2: Setup GitHub Actions (optional)
echo ""
read -p "Do you want to set up GitHub Actions deployment? (yes/no): " setup_github

if [ "$setup_github" = "yes" ]; then
  echo ""
  echo "2️⃣ Setting up GitHub Actions..."
  
  # Update terraform.tfvars to enable GitHub Actions
  cd infrastructure
  
  # Backup current tfvars
  cp terraform.tfvars terraform.tfvars.backup 2>/dev/null || true
  
  # Add GitHub Actions configuration
  cat >> terraform.tfvars << EOF

# GitHub Actions Configuration
enable_github_actions = true
github_repository     = "wjesseclements/site-generator"
EOF
  
  echo ""
  echo "📝 To complete GitHub Actions setup:"
  echo "   1. Deploy the infrastructure with: ./deploy-with-role.sh"
  echo "   2. Add the following secret to your GitHub repository:"
  echo "      AWS_ACCOUNT_ID = $ACCOUNT_ID"
  echo "   3. The OIDC provider and role will be created automatically"
  
  cd ..
fi

# Option 3: Create cross-account role template
echo ""
echo "3️⃣ Cross-Account Deployment Role Template"
echo "----------------------------------------"
echo "If you want to deploy to other AWS accounts, create this role in each target account:"
echo ""
cat << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::$ACCOUNT_ID:role/site-generator-dev-terraform-runner-lambda"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "site-generator-deployment"
        }
      }
    }
  ]
}
EOF
echo ""
echo "Attach the PowerUserAccess policy to this role in the target account."

# Summary
echo ""
echo "✅ IAM Setup Complete!"
echo "===================="
echo ""
echo "🚀 Next Steps:"
echo "   1. Run: ./deploy-with-role.sh"
echo "   2. The script will automatically assume the deployment role"
echo "   3. All resources will be created with proper permissions"
echo ""
echo "🔒 Security Notes:"
echo "   - The deployment role has PowerUserAccess + IAMFullAccess"
echo "   - Consider creating a custom policy with minimal permissions for production"
echo "   - Enable MFA for role assumption in production"
echo ""
echo "Ready to deploy? Run: ./deploy-with-role.sh"

# Cleanup
rm -f /tmp/trust-policy.json