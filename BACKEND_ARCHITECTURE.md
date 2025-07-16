# Backend Architecture

## Overview
The Site Generator Platform backend is built on a serverless architecture using AWS Lambda, API Gateway, DynamoDB, and WebSocket APIs. This architecture provides scalable, cost-effective execution with automatic scaling, comprehensive error handling, and real-time communication capabilities.

## Core Components
- **API Gateway**: RESTful API endpoints and WebSocket communication
- **Lambda Functions**: Serverless compute for all backend operations
- **DynamoDB**: NoSQL database for data persistence and state management
- **WebSocket API**: Real-time bidirectional communication system

---

# API Gateway Integration

## REST API Endpoints

### API Structure (`https://yiz8smdafc.execute-api.us-east-1.amazonaws.com/dev`)
- `POST /deployments` - Create new deployment (protected)
- `GET /deployments` - List user deployments (protected)
- `GET /deployments/{id}` - Get deployment details (protected)
- `OPTIONS /deployments` - CORS preflight (public)

### Authentication Configuration
```hcl
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${local.resource_prefix}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}
```

## WebSocket API

### WebSocket Endpoints (`wss://zcj3sqcy3d.execute-api.us-east-1.amazonaws.com/dev`)
- `$connect` - Handle new WebSocket connections
- `$disconnect` - Clean up disconnected sessions
- `status` - Receive deployment status updates

### Route Configuration
```hcl
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}
```

## Configuration Details
- **CORS**: `*` origins, `GET/OPTIONS/POST` methods, 24-hour preflight caching
- **Rate Limiting**: 100 requests/second, 200 burst limit
- **Monitoring**: CloudWatch access logs, X-Ray tracing, custom metrics
- **Security**: JWT token validation, IAM-based permissions, input sanitization

---

# Lambda Function Architecture

## Lambda Functions Overview

### API Functions
1. **Create Deployment** (`site-generator-dev-create-deployment`)
   - Purpose: Process new deployment requests
   - Triggers: API Gateway POST /deployments

2. **Get Deployments** (`site-generator-dev-get-deployments`)
   - Purpose: Retrieve user's deployment list
   - Triggers: API Gateway GET /deployments

3. **Get Deployment** (`site-generator-dev-get-deployment`)
   - Purpose: Fetch specific deployment details
   - Triggers: API Gateway GET /deployments/{id}

### WebSocket Functions
4. **WebSocket Connect** (`site-generator-dev-websocket-connect`)
   - Purpose: Handle new WebSocket connections
   - Triggers: WebSocket $connect route

5. **WebSocket Disconnect** (`site-generator-dev-websocket-disconnect`)
   - Purpose: Clean up disconnected sessions
   - Triggers: WebSocket $disconnect route

6. **WebSocket Status** (`site-generator-dev-websocket-status`)
   - Purpose: Broadcast status updates
   - Triggers: WebSocket status route

### Orchestration Functions
7. **Terraform Runner** (`site-generator-dev-terraform-runner`)
   - Purpose: Execute Terraform infrastructure commands
   - Triggers: Step Functions state machine

## Function Specifications
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB (configurable)
- **Timeout**: 300 seconds (5 minutes)
- **Architecture**: x86_64

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

## Implementation Patterns

### API Handler Pattern
```typescript
import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.requestContext.authorizer?.claims?.sub
    const body = JSON.parse(event.body || '{}')
    const result = await processDeployment(userId, body)
    
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
export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  const apiGateway = new ApiGatewayManagementApi({
    endpoint: process.env.WEBSOCKET_ENDPOINT
  })
  
  try {
    const message = JSON.parse(event.body || '{}')
    
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({ status: 'received' })
    }).promise()
    
    return { statusCode: 200, body: 'Success' }
  } catch (error) {
    if (error.statusCode === 410) {
      await cleanupConnection(connectionId)
    }
    throw error
  }
}
```

---

# Database Operations

## Database Schema

### Deployments Table (`site-generator-dev-deployments`)
```typescript
interface Deployment {
  id: string                    // Primary key
  userId: string               // User identifier
  templateId: string           // Template identifier
  name: string                 // Deployment name
  status: DeploymentStatus     // Current status
  parameters: Record<string, any> // Template parameters
  outputs?: Record<string, any>   // Terraform outputs
  createdAt: string            // ISO timestamp
  updatedAt: string            // ISO timestamp
  tags: Record<string, string> // Resource tags
}
```

### Connections Table (`site-generator-dev-connections`)
```typescript
interface Connection {
  connectionId: string         // Primary key (WebSocket connection ID)
  userId: string              // User identifier
  deploymentId?: string       // Associated deployment
  connectedAt: string         // ISO timestamp
  ttl: number                 // TTL for automatic cleanup
}
```

### Terraform Locks Table (`site-generator-dev-terraform-locks`)
```typescript
interface TerraformLock {
  lockId: string              // Primary key (deployment ID)
  lockedBy: string            // Process/user holding lock
  lockedAt: string            // ISO timestamp
  operation: string           // Terraform operation (plan/apply)
}
```

## Access Patterns and Indexes
- **Deployments by User**: GSI on userId for user's deployment history
- **Deployments by Status**: GSI on status for monitoring and cleanup
- **Connections by User**: GSI on userId for user-specific broadcasts
- **Active Locks**: Query by lockId to check operation status

## Performance Optimizations
- Pay-per-request billing for cost efficiency
- TTL attributes for automatic cleanup
- Appropriate data types and indexes
- Batch operations where applicable
- Connection pooling in Lambda functions

---

# WebSocket Communication

## Real-Time Communication Flow

### Connection Handlers

#### Connection Handler (`$connect`)
```typescript
export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  const userId = getUserIdFromToken(event)
  
  await dynamodb.putItem({
    TableName: process.env.CONNECTIONS_TABLE!,
    Item: {
      connectionId: { S: connectionId },
      userId: { S: userId },
      connectedAt: { S: new Date().toISOString() },
      ttl: { N: (Date.now() / 1000 + 3600).toString() } // 1 hour TTL
    }
  }).promise()
  
  return { statusCode: 200, body: 'Connected' }
}
```

#### Status Update Broadcasting
```typescript
export const handler = async (event: DeploymentStatusEvent) => {
  const { deploymentId, status, message, logs } = event
  
  const connections = await getConnectionsForDeployment(deploymentId)
  
  await Promise.all(connections.map(conn => 
    broadcastMessage(conn.connectionId, {
      type: 'deployment_status',
      deploymentId,
      status,
      message,
      logs,
      timestamp: new Date().toISOString()
    })
  ))
}
```

## Client-Side Integration

### WebSocket Manager
```typescript
export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 5
  
  connect(url: string, deploymentId: string) {
    this.url = `${url}?deploymentId=${deploymentId}`
    this.ws = new WebSocket(this.url)
    this.setupEventHandlers()
  }
  
  private handleReconnect() {
    if (this.currentAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.currentAttempts++
        this.connect(this.url.split('?')[0], '')
      }, this.reconnectInterval * Math.pow(2, this.currentAttempts))
    }
  }
}
```

## Message Types
```typescript
interface DeploymentStatusUpdate {
  type: 'deployment_status'
  deploymentId: string
  status: 'PENDING' | 'INITIALIZING' | 'PLANNING' | 'APPLYING' | 'COMPLETED' | 'FAILED'
  message: string
  logs?: string[]
  timestamp: string
  progress?: number
}
```

## Connection Management
- **Storage**: DynamoDB with connectionId as primary key
- **TTL**: 1-hour automatic cleanup for stale connections
- **Error Handling**: Automatic reconnection with exponential backoff
- **Rate Limiting**: Protection against message flooding

---

# Security & Monitoring

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

## Monitoring and Logging
- **CloudWatch Logs**: Automatic log group creation with 7-day retention
- **Metrics**: Duration, errors, invocations, throttles
- **X-Ray Tracing**: Distributed tracing for performance analysis
- **Custom Alarms**: Error rate and duration thresholds

## Performance Features
- **Cold Start Mitigation**: Minimal dependencies, optimized packaging
- **Memory Tuning**: Right-sized based on function requirements
- **Connection Pooling**: Reuse database connections across invocations
- **Caching**: In-memory caching for frequently accessed data