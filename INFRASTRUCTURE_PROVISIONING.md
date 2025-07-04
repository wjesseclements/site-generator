# Infrastructure Provisioning Feature

## Overview
Terraform-based infrastructure as code system providing automated AWS resource provisioning, configuration management, and environment orchestration for the Site Generator Platform and deployed templates.

## Core Functionality
- Complete AWS infrastructure automation via Terraform
- Multi-service integration (Lambda, DynamoDB, S3, API Gateway, Cognito)
- Environment-specific configurations and variables
- Resource tagging for cost tracking and organization
- Security best practices implementation
- Modular architecture for reusability

## Files
- `/infrastructure/main.tf` - Provider and backend configuration
- `/infrastructure/variables.tf` - Input variables and defaults
- `/infrastructure/outputs.tf` - Deployment outputs and URLs
- `/infrastructure/terraform.tfvars` - Environment-specific values
- `/infrastructure/modules/lambda-function/` - Reusable Lambda module
- Individual service files: `api-gateway.tf`, `cognito.tf`, `dynamodb.tf`, etc.

## Platform Infrastructure Components

### Core Services
```hcl
# API Gateway REST and WebSocket APIs
module "api_gateway" {
  source = "./api-gateway.tf"
  # Handles all HTTP and WebSocket communication
}

# Lambda Functions for serverless compute
module "lambda_functions" {
  source = "./lambda.tf"
  # All backend business logic and API handlers
}

# DynamoDB for data persistence
module "database" {
  source = "./dynamodb.tf"
  # Deployment tracking, connections, state locking
}

# S3 for static hosting and storage
module "storage" {
  source = "./s3.tf"
  # Frontend hosting, state files, artifacts
}

# Cognito for authentication
module "auth" {
  source = "./cognito.tf"
  # User management and API authorization
}
```

### IAM and Security
```hcl
# Lambda execution roles with least privilege
resource "aws_iam_role" "lambda_execution" {
  name = "${local.resource_prefix}-lambda-execution"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# Cross-account deployment role
resource "aws_iam_role" "terraform_runner_execution" {
  name = "${local.resource_prefix}-terraform-runner-execution"
  # Enhanced permissions for infrastructure deployment
}
```

## Resource Organization
### Naming Convention
- Pattern: `${project_name}-${environment}-${resource_type}`
- Example: `site-generator-dev-lambda-execution`
- Consistent across all AWS resources

### Tagging Strategy
```hcl
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Infrastructure"
    CreatedBy   = "SiteGenerator"
  }
}
```

## Environment Configuration
### Variable Structure
```hcl
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "site-generator"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}
```

### Terraform Backend Configuration
```hcl
terraform {
  backend "s3" {
    bucket         = "site-generator-dev-terraform-states"
    key            = "platform/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "site-generator-dev-terraform-locks"
  }
}
```

## Modular Architecture
### Lambda Function Module
```hcl
module "create_deployment_lambda" {
  source = "./modules/lambda-function"
  
  function_name = "${local.resource_prefix}-create-deployment"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  source_path   = "../backend/api/create-deployment"
  role_arn      = aws_iam_role.lambda_execution.arn
  
  environment_variables = {
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    STEP_FUNCTION_ARN = aws_sfn_state_machine.deployment_orchestrator.arn
  }
  
  tags = local.common_tags
}
```

## Deployment Outputs
```hcl
output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}"
}

output "websocket_url" {
  description = "WebSocket API endpoint URL"
  value       = "wss://${aws_apigatewayv2_api.websocket.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}"
}

output "frontend_url" {
  description = "Frontend website URL"
  value       = "http://${aws_s3_bucket.frontend.bucket}.s3-website-${data.aws_region.current.name}.amazonaws.com"
}
```

## Security Implementation
- **Encryption**: All data encrypted at rest and in transit
- **IAM Policies**: Least privilege access for all resources
- **VPC Integration**: Lambda functions in private subnets (optional)
- **API Security**: Cognito authorizers and rate limiting
- **Resource Isolation**: Account-level separation for environments

## Cost Optimization
- **Pay-per-request**: DynamoDB and Lambda billing models
- **Storage Classes**: Appropriate S3 storage for different use cases
- **Reserved Capacity**: For predictable workloads in production
- **Resource Tagging**: Detailed cost allocation and tracking

## Integration Points
- Deploys platform infrastructure for template hosting
- Provides backend for frontend application
- Enables template deployment infrastructure
- Supports multi-environment deployments