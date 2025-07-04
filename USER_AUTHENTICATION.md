# User Authentication Feature

## Overview
AWS Cognito-based authentication system providing secure user management, session handling, and API authorization for the Site Generator Platform.

## Core Functionality
- User registration and login via Cognito User Pools
- JWT token-based API authorization
- Session management and token refresh
- Multi-account deployment support
- Hosted UI for authentication flows

## Files
- `/infrastructure/cognito.tf` - Cognito User Pool and Identity Pool configuration
- `/infrastructure/api-gateway.tf` - API Gateway Cognito authorizer setup
- `/infrastructure/iam.tf` - IAM roles for authenticated users

## Technical Implementation
- **User Pool**: `us-east-1_1Fu7LU09W` with email-based authentication
- **Hosted UI**: `https://site-generator-dev-050752625591.auth.us-east-1.amazoncognito.com`
- **Authorization**: Cognito authorizer attached to all protected API endpoints
- **Token Validation**: JWT tokens validated by API Gateway before Lambda execution

## Configuration
```hcl
# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${local.resource_prefix}-users"
  
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }
  
  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]
}
```

## Security Features
- Strong password policy enforcement
- Email verification required
- JWT token expiration and refresh
- Cross-origin request protection
- Rate limiting on authentication endpoints

## Integration Points
- Protects all API Gateway endpoints except OPTIONS
- Provides user identity context to Lambda functions
- Enables user-specific deployment tracking
- Supports future SSO integration