# Lambda Function Architecture Feature

## Overview
Serverless compute architecture using AWS Lambda for all backend operations. Provides scalable, cost-effective execution of API handlers, WebSocket operations, and infrastructure deployment tasks.

## Core Functionality
- RESTful API endpoint handlers
- WebSocket connection management
- Terraform infrastructure execution
- Event-driven processing
- Automatic scaling and cost optimization
- Comprehensive error handling and logging

## Files
- `/infrastructure/lambda.tf` - Lambda function configurations
- `/infrastructure/modules/lambda-function/` - Reusable Lambda module
- `/backend/api/` - API endpoint implementations
- `/backend/websocket/` - WebSocket handlers
- `/backend/orchestrator/` - Infrastructure deployment logic

## Lambda Functions Overview

### API Functions
1. **Create Deployment** (`site-generator-dev-create-deployment`)
   - Handler: `backend/api/create-deployment/index.ts`
   - Purpose: Process new deployment requests
   - Triggers: API Gateway POST /deployments

2. **Get Deployments** (`site-generator-dev-get-deployments`)
   - Handler: `backend/api/get-deployments/index.ts`
   - Purpose: Retrieve user's deployment list
   - Triggers: API Gateway GET /deployments

3. **Get Deployment** (`site-generator-dev-get-deployment`)
   - Handler: `backend/api/get-deployment/index.ts`
   - Purpose: Fetch specific deployment details
   - Triggers: API Gateway GET /deployments/{id}

### WebSocket Functions
4. **WebSocket Connect** (`site-generator-dev-websocket-connect`)
   - Handler: `backend/websocket/connect/index.ts`
   - Purpose: Handle new WebSocket connections
   - Triggers: WebSocket $connect route

5. **WebSocket Disconnect** (`site-generator-dev-websocket-disconnect`)
   - Handler: `backend/websocket/disconnect/index.ts`
   - Purpose: Clean up disconnected sessions
   - Triggers: WebSocket $disconnect route

6. **WebSocket Status** (`site-generator-dev-websocket-status`)
   - Handler: `backend/websocket/status/index.ts`
   - Purpose: Broadcast status updates
   - Triggers: WebSocket status route

### Orchestration Functions
7. **Terraform Runner** (`site-generator-dev-terraform-runner`)
   - Handler: `backend/orchestrator/terraform-runner/index.ts`
   - Purpose: Execute Terraform infrastructure commands
   - Triggers: Step Functions state machine

## Lambda Module Configuration
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
    DEPLOYMENTS_TABLE    = aws_dynamodb_table.deployments.name
    STEP_FUNCTION_ARN    = aws_sfn_state_machine.deployment_orchestrator.arn
    WEBSOCKET_ENDPOINT   = aws_apigatewayv2_stage.websocket.invoke_url
  }
  
  tags = local.common_tags
}
```

## Function Specifications
### Runtime Configuration
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB (configurable)
- **Timeout**: 300 seconds (5 minutes)
- **Architecture**: x86_64
- **Reserved Concurrency**: -1 (unlimited)

### Environment Variables
```typescript
interface LambdaEnvironment {
  DEPLOYMENTS_TABLE: string      // DynamoDB table for deployments
  CONNECTIONS_TABLE: string      // WebSocket connections
  TERRAFORM_LOCKS_TABLE: string  // State locking
  TERRAFORM_BUCKET: string       // S3 bucket for state files
  STEP_FUNCTION_ARN: string      // Orchestration workflow
  WEBSOCKET_ENDPOINT: string     // WebSocket API URL
}
```

## IAM Permissions
### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/site-generator-*"
    }
  ]
}
```

### Terraform Runner Enhanced Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:*",
    "dynamodb:*",
    "lambda:*",
    "apigateway:*",
    "iam:*",
    "cloudfront:*",
    "route53:*"
  ],
  "Resource": "*"
}
```

## Function Implementation Examples
### API Handler Pattern
```typescript
import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Extract user ID from Cognito JWT
    const userId = event.requestContext.authorizer?.claims?.sub
    
    // Parse request body
    const body = JSON.parse(event.body || '{}')
    
    // Process business logic
    const result = await processDeployment(userId, body)
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
```

### WebSocket Handler Pattern
```typescript
import { APIGatewayProxyHandler } from 'aws-lambda'
import { ApiGatewayManagementApi } from 'aws-sdk'

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  const apiGateway = new ApiGatewayManagementApi({
    endpoint: process.env.WEBSOCKET_ENDPOINT
  })
  
  try {
    // Handle WebSocket message
    const message = JSON.parse(event.body || '{}')
    
    // Process and broadcast
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({ status: 'received' })
    }).promise()
    
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    if (error.statusCode === 410) {
      // Connection is stale, remove from database
      await cleanupConnection(connectionId)
    }
    throw error
  }
}
```

## Monitoring and Logging
- **CloudWatch Logs**: Automatic log group creation
- **Retention**: 7 days for development, configurable for production
- **Metrics**: Duration, errors, invocations, throttles
- **Tracing**: X-Ray integration for distributed tracing
- **Alarms**: Error rate and duration thresholds

## Deployment Process
1. **Code Packaging**: Terraform archive_file data source
2. **Deployment**: Automatic via Terraform apply
3. **Versioning**: Source code hash triggers updates
4. **Rollback**: Terraform state management for quick rollbacks

## Performance Optimization
- **Cold Start Mitigation**: Minimal dependencies, code splitting
- **Memory Tuning**: Right-sized based on function requirements
- **Connection Pooling**: Reuse database connections
- **Caching**: In-memory caching for frequently accessed data

## Integration Points
- API Gateway triggers for REST endpoints
- WebSocket API triggers for real-time communication
- Step Functions orchestration for complex workflows
- DynamoDB for data persistence
- S3 for artifact storage and retrieval