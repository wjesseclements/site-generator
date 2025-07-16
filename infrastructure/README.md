# Platform Infrastructure

This directory contains the Terraform configuration for the Site Generator Platform infrastructure.

## Components

- **S3**: Static website hosting for frontend
- **CloudFront**: CDN for frontend (optional)
- **API Gateway**: REST API endpoints
- **Lambda**: Backend functions
- **DynamoDB**: Deployment tracking
- **Cognito**: User authentication
- **IAM**: Roles and policies
- **Step Functions**: Deployment orchestration
- **Secrets Manager**: Secure GitHub token storage

## Directory Structure

```
infrastructure/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf          # Output values
├── versions.tf         # Provider versions
├── api-gateway.tf      # API Gateway configuration
├── lambda.tf           # Lambda functions
├── dynamodb.tf         # DynamoDB tables
├── s3.tf               # S3 buckets
├── cognito.tf          # Cognito user pool
├── iam.tf              # IAM roles and policies
├── step-functions.tf   # Step Functions
├── secrets.tf          # AWS Secrets Manager
└── modules/            # Reusable modules
    └── lambda-function/
```

## Prerequisites

- Terraform >= 1.5
- AWS CLI configured
- AWS account with appropriate permissions

## Usage

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan

# Destroy resources
terraform destroy
```

## Environment Variables

Set these before running Terraform:

```bash
export AWS_REGION=us-east-1
export TF_VAR_environment=dev
```

## Secrets Management

### GitHub Token Setup

The platform uses AWS Secrets Manager to securely store the GitHub personal access token. Follow these steps:

1. **Initial Deployment**: Add the token to `terraform.tfvars` for the first deployment:
   ```hcl
   github_token = "ghp_your_generated_token_here"
   ```

2. **After Deployment**: Remove the token from `terraform.tfvars` and manage it through Secrets Manager:
   ```bash
   # Update the secret value
   aws secretsmanager put-secret-value \
     --secret-id site-generator-dev-github-token \
     --secret-string '{"token":"ghp_your_token_here","repository":"wjesseclements/site-generator-infrastructure","created_at":"2025-01-01T00:00:00Z"}'
   ```

3. **Token Rotation**: Update the secret in Secrets Manager without redeploying infrastructure.

### Security Features

- Token is encrypted at rest in AWS Secrets Manager
- Lambda functions cache tokens for 5 minutes to reduce API calls
- IAM permissions follow principle of least privilege
- CloudTrail logs all secret access for auditing