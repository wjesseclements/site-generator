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