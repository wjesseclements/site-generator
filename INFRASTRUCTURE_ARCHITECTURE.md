# Infrastructure Architecture

## Overview
The Site Generator Platform uses Infrastructure as Code (IaC) with Terraform to provision and manage AWS resources. This includes automated infrastructure provisioning, Step Functions orchestration, and environment management for both the platform itself and deployed website templates.

## Core Components
- **Terraform Infrastructure**: Complete AWS resource automation with modular architecture
- **Step Functions Orchestration**: Multi-stage deployment workflow management
- **Multi-Environment Support**: Dev, staging, and production configurations
- **Security & Compliance**: Best practices implementation across all resources

---

# Infrastructure Provisioning

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

---

# Deployment Orchestration

## Files
- `/backend/api/create-deployment/index.ts` - Deployment creation Lambda
- `/backend/orchestrator/terraform-runner/index.ts` - Terraform execution engine
- `/infrastructure/step-functions.tf` - Step Functions state machine definition
- `/infrastructure/lambda.tf` - Lambda function configurations

## Step Functions Workflow

AWS Step Functions orchestrates the multi-stage deployment process: INIT → PLAN → APPLY with automatic retry and error handling, real-time WebSocket status updates, and Terraform state management.

### Deployment Process Flow
1. **Create Deployment**: Store deployment record in DynamoDB
2. **Initialize Terraform**: Set up workspace and backend configuration  
3. **Generate Plan**: Create Terraform execution plan
4. **Apply Changes**: Execute infrastructure provisioning
5. **Update Status**: Store outputs and final deployment status

## Terraform Runner Implementation

### Lambda Handler Structure
```typescript
import { Handler } from 'aws-lambda'
import { execSync } from 'child_process'
import { S3, DynamoDB } from 'aws-sdk'

export const handler: Handler = async (event) => {
  const { operation, deploymentId, templateId, parameters } = event
  
  try {
    // Download template from S3
    await downloadTemplate(templateId)
    
    // Generate terraform.tfvars
    await generateTerraformVars(parameters, deploymentId)
    
    // Execute Terraform command
    const result = await executeTerraform(operation, deploymentId)
    
    // Update deployment status
    await updateDeploymentStatus(deploymentId, operation, result)
    
    return {
      statusCode: 200,
      operation,
      deploymentId,
      result
    }
  } catch (error) {
    await updateDeploymentStatus(deploymentId, operation, { error: error.message })
    throw error
  }
}
```

### Terraform Operations
```typescript
async function executeTerraform(operation: string, deploymentId: string) {
  const commands = {
    init: `terraform init -backend-config="key=${deploymentId}/terraform.tfstate"`,
    plan: `terraform plan -var-file="terraform.tfvars" -out="tfplan"`,
    apply: `terraform apply -auto-approve "tfplan"`,
    destroy: `terraform destroy -auto-approve -var-file="terraform.tfvars"`
  }
  
  const command = commands[operation]
  if (!command) {
    throw new Error(`Unknown operation: ${operation}`)
  }
  
  // Execute with proper error handling
  const output = execSync(command, { 
    cwd: '/tmp/terraform',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  })
  
  return { success: true, output }
}
```

## State Management

### S3 Backend Configuration
- **Bucket**: `site-generator-{env}-terraform-states`
- **Key Pattern**: `deployments/{deploymentId}/terraform.tfstate`
- **Encryption**: AES-256 server-side encryption
- **Versioning**: Enabled for state history

### DynamoDB State Locking
- **Table**: `site-generator-{env}-terraform-locks`
- **Lock ID**: Deployment ID for isolation
- **TTL**: Automatic cleanup after 1 hour

## Error Handling and Resilience

### Retry Configuration
```hcl
resource "aws_sfn_state_machine" "deployment_orchestrator" {
  definition = jsonencode({
    States = {
      "TerraformOperation" = {
        Type = "Task"
        Resource = "arn:aws:lambda:region:account:function:terraform-runner"
        Retry = [{
          ErrorEquals = ["States.TaskFailed"]
          IntervalSeconds = 2
          MaxAttempts = 3
          BackoffRate = 2.0
        }]
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next = "HandleFailure"
        }]
      }
    }
  })
}
```

### Error Categories
- **Transient Errors**: Network timeouts, temporary service unavailability
- **Configuration Errors**: Invalid parameters, missing resources
- **Permission Errors**: IAM policy issues, cross-account access
- **Resource Conflicts**: Naming conflicts, quota limits

## Monitoring and Observability

### CloudWatch Integration
```typescript
// Custom metrics for deployment tracking
await cloudwatch.putMetricData({
  Namespace: 'SiteGenerator/Deployments',
  MetricData: [{
    MetricName: 'DeploymentDuration',
    Value: duration,
    Unit: 'Seconds',
    Dimensions: [{
      Name: 'TemplateId',
      Value: templateId
    }]
  }]
}).promise()
```

### Status Updates
- **WebSocket Broadcasting**: Real-time status to connected clients
- **DynamoDB Updates**: Persistent deployment records
- **CloudWatch Logs**: Detailed execution logs for debugging

## Environment Variables
```typescript
interface TerraformRunnerConfig {
  TERRAFORM_BUCKET: string       // S3 bucket for state files
  DEPLOYMENTS_TABLE: string      // DynamoDB deployments table
  TERRAFORM_LOCKS_TABLE: string  // DynamoDB locks table
  CONNECTIONS_TABLE: string      // WebSocket connections
  WEBSOCKET_ENDPOINT: string     // WebSocket API URL
  AWS_REGION: string            // Deployment region
}
```

## Integration Points
- **Platform Infrastructure**: Deploys complete AWS stack for template hosting
- **Frontend Backend**: Provides API Gateway, Lambda, and database services
- **Template Deployment**: Enables user website infrastructure provisioning
- **Multi-Environment**: Supports dev, staging, and production deployments  
- **GitOps Integration**: Connects with GitHub Actions for enterprise workflows