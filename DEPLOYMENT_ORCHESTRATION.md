# Deployment Orchestration Feature

## Overview
Automated deployment workflow using AWS Step Functions to orchestrate Terraform infrastructure provisioning. Handles multi-stage deployment process with error handling and state management.

## Core Functionality
- Step Functions state machine orchestration
- Multi-stage deployment: INIT → PLAN → APPLY
- Terraform state management with S3 backend
- Cross-account deployment support
- Automatic retry and error handling
- Real-time status updates via WebSocket

## Files
- `/backend/api/create-deployment/index.ts` - Deployment creation Lambda
- `/backend/orchestrator/terraform-runner/index.ts` - Terraform execution engine
- `/infrastructure/step-functions.tf` - Step Functions state machine definition
- `/infrastructure/lambda.tf` - Lambda function configurations

## Deployment Workflow
1. **Create Deployment**: Store deployment record in DynamoDB
2. **Initialize Terraform**: Set up workspace and backend configuration
3. **Generate Plan**: Create Terraform execution plan
4. **Apply Changes**: Execute infrastructure provisioning
5. **Update Status**: Store outputs and final deployment status

## Technical Implementation
- **State Machine**: AWS Step Functions with proper error handling
- **Terraform Runner**: Node.js Lambda executing Terraform commands
- **State Storage**: S3 backend with DynamoDB locking
- **Parameter Injection**: Dynamic variable file generation
- **Resource Tagging**: Automatic cost tracking and organization

## Error Handling
- Retry logic for transient failures
- Dead letter queues for failed deployments
- Detailed error logging and reporting
- Rollback procedures for failed deployments
- Circuit breaker patterns for external dependencies

## Environment Variables
```typescript
const config = {
  TERRAFORM_BUCKET: process.env.TERRAFORM_BUCKET,
  DEPLOYMENTS_TABLE: process.env.DEPLOYMENTS_TABLE,
  TERRAFORM_LOCKS_TABLE: process.env.TERRAFORM_LOCKS_TABLE,
  CONNECTIONS_TABLE: process.env.CONNECTIONS_TABLE
}
```

## Integration Points
- Triggered by template selection in frontend
- Updates deployment status in real-time via WebSocket
- Stores deployment records in DynamoDB
- Manages Terraform state files in S3