# API Gateway Integration Feature

## Overview
AWS API Gateway providing RESTful API endpoints and WebSocket communication for the Site Generator Platform. Includes authentication, CORS, rate limiting, and comprehensive logging.

## Core Functionality
- RESTful API for deployment management
- WebSocket API for real-time communication
- Cognito-based authentication and authorization
- CORS configuration for frontend access
- Rate limiting and throttling
- CloudWatch logging and monitoring

## Files
- `/infrastructure/api-gateway.tf` - Complete API Gateway configuration
- `/backend/api/` - Lambda function handlers for API endpoints

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

## CORS Configuration
- **Allowed Origins**: `*` (configurable for production)
- **Allowed Methods**: `GET, OPTIONS, POST`
- **Allowed Headers**: `Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token`
- **Preflight Caching**: 24 hours

## Rate Limiting and Throttling
- **Rate Limit**: 100 requests per second
- **Burst Limit**: 200 requests
- **Per-route throttling**: Configurable based on endpoint sensitivity
- **User-based quotas**: Available for enterprise features

## Monitoring and Logging
- **CloudWatch Access Logs**: Detailed request/response logging
- **X-Ray Tracing**: Distributed tracing for performance analysis
- **Custom Metrics**: Business metrics for monitoring
- **Error Tracking**: 4xx/5xx error rates and patterns

## Lambda Integration
```hcl
resource "aws_api_gateway_integration" "create_deployment" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.deployments.id
  http_method = aws_api_gateway_method.create_deployment.http_method
  
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = module.create_deployment_lambda.invoke_arn
}
```

## Security Features
- JWT token validation via Cognito authorizer
- IAM-based Lambda execution permissions
- VPC integration for private resources
- Request/response data validation
- Input sanitization and validation

## Integration Points
- Connects frontend to backend Lambda functions
- Enables real-time WebSocket communication
- Provides authentication layer for all operations
- Logs all API activity for monitoring and debugging