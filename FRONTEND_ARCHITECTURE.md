# Frontend Architecture

## Overview
The Site Generator Platform frontend is built with Next.js 15 and React 19, deployed as a static site on S3. The architecture emphasizes security, performance, and user experience with AWS Cognito authentication and real-time WebSocket communication.

## Core Components
- **S3 Static Hosting**: Scalable, cost-effective web hosting with automatic configuration
- **AWS Cognito Authentication**: Secure user management and JWT-based API authorization
- **Next.js Frontend**: Modern React application with static export and Turbopack
- **Real-time Updates**: WebSocket integration for live deployment status

---

# S3 Static Hosting

## Files
- `/infrastructure/s3.tf` - S3 bucket configurations
- `/templates/data-explorer/main.tf` - Template-specific S3 setup
- `/frontend/out/` - Built static website files

## S3 Buckets

### Frontend Hosting (`site-generator-dev-frontend`)
```hcl
resource "aws_s3_bucket" "frontend" {
  bucket = "${local.resource_prefix}-frontend"
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "404.html"
  }
}
```

### Public Access Configuration
```hcl
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}
```

### Terraform State Storage (`site-generator-dev-terraform-states`)
```hcl
resource "aws_s3_bucket" "terraform_states" {
  bucket = "${local.resource_prefix}-terraform-states"
}

resource "aws_s3_bucket_versioning" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### Lambda Deployments (`site-generator-dev-lambda-deployments`)
- Stores deployment packages and artifacts
- Template files and configurations
- Lambda function ZIP files

## Website Configuration
- **Index Document**: `index.html` for main entry point
- **Error Document**: `404.html` for not found pages
- **Public Read Policy**: Allows public access to website content
- **CORS Configuration**: Enables cross-origin requests from frontend

## Frontend Build Process

### Next.js Static Export Configuration
```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  }
}

export default nextConfig
```

### Build Commands
```json
{
  "scripts": {
    "build": "next build",
    "build:static": "next build && next export"
  }
}
```

## Frontend Deployment Process
1. **Build**: Next.js static export generates optimized files
2. **Upload**: AWS CLI syncs files to S3 bucket
3. **Configure**: Website hosting settings applied automatically
4. **Access**: Public URL provides immediate access

```bash
# Deployment command
npm run build:static
aws s3 sync out/ s3://site-generator-dev-frontend/ --delete
```

## Template Website Hosting
Each deployed template creates its own S3 bucket:
- Unique bucket name with deployment ID
- Template-specific website files
- Automatic DNS and routing configuration
- Cost tracking via resource tags

### Template Bucket Configuration
```hcl
resource "aws_s3_bucket" "template_website" {
  bucket = "${var.deployment_id}-website"
  
  tags = merge(var.tags, {
    DeploymentId = var.deployment_id
    Purpose      = "TemplateWebsite"
  })
}

resource "aws_s3_bucket_website_configuration" "template_website" {
  bucket = aws_s3_bucket.template_website.id
  
  index_document {
    suffix = "index.html"
  }
}
```

## Security Features
- Bucket-level encryption for sensitive data
- IAM policies for least-privilege access
- Public read-only access for website content
- Private access for state files and artifacts
- Server access logging for audit trails

## Performance Optimization
- **Static Export**: Pre-rendered pages for fast loading
- **CDN Ready**: Compatible with CloudFront distribution
- **Gzip Compression**: Automatic compression for text files
- **Cache Headers**: Optimized caching strategies

---

# User Authentication

## Files
- `/infrastructure/cognito.tf` - Cognito User Pool and Identity Pool configuration
- `/infrastructure/api-gateway.tf` - API Gateway Cognito authorizer setup
- `/infrastructure/iam.tf` - IAM roles for authenticated users

## Cognito Configuration

### User Pool Setup
```hcl
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
  
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Site Generator - Verify your email"
    email_message        = "Your verification code is {####}"
  }
  
  tags = local.common_tags
}
```

### User Pool Client Configuration
```hcl
resource "aws_cognito_user_pool_client" "main" {
  name         = "${local.resource_prefix}-client"
  user_pool_id = aws_cognito_user_pool.main.id
  
  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
  
  supported_identity_providers = ["COGNITO"]
  
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
  
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30
}
```

### Identity Pool for AWS API Access
```hcl
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${local.resource_prefix}-identity"
  allow_unauthenticated_identities = false
  
  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
  
  tags = local.common_tags
}
```

## API Gateway Integration

### Cognito Authorizer
```hcl
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${local.resource_prefix}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.main.arn]
  identity_source = "method.request.header.Authorization"
}
```

### Protected Endpoint Configuration
```hcl
resource "aws_api_gateway_method" "protected_endpoint" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.deployments.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}
```

## Frontend Authentication Integration

### AWS Amplify Configuration
```typescript
// lib/aws-config.ts
import { Amplify } from 'aws-amplify'

const awsConfig = {
  Auth: {
    region: process.env.NEXT_PUBLIC_REGION,
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
  },
  API: {
    endpoints: [
      {
        name: 'SiteGeneratorAPI',
        endpoint: process.env.NEXT_PUBLIC_API_URL,
        region: process.env.NEXT_PUBLIC_REGION
      }
    ]
  }
}

Amplify.configure(awsConfig)
```

### Authentication Context
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, signOut } from 'aws-amplify/auth'

interface AuthContextType {
  user: any
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    checkAuthState()
  }, [])
  
  async function checkAuthState() {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function handleSignOut() {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }
  
  return (
    <AuthContext.Provider value={{ user, isLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Protected Routes
```typescript
// components/ProtectedRoute.tsx
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  if (!user) {
    return null
  }
  
  return <>{children}</>
}
```

## Implementation Summary
- **Authentication**: Email-based login with strong password policy and verification
- **Authorization**: JWT tokens validated by API Gateway Cognito authorizer
- **Token Management**: 1-hour access/ID tokens, 30-day refresh tokens with automatic refresh
- **Security**: Cross-origin protection, rate limiting, and user-specific deployment tracking
- **Integration**: Protects all API endpoints and provides seamless frontend experience