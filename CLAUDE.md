# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Site Generator is a self-service infrastructure provisioning platform that allows users to select pre-configured website templates and deploy them automatically on AWS. The platform follows enterprise GitOps patterns using GitHub Actions and Terraform for infrastructure deployment, with a serverless frontend and API layer.

## Repository Structure

This project uses a **two-repository architecture** to separate platform code from template deployments:

### **Main Platform Repository** (THIS REPOSITORY)
- **Purpose**: The Site Generator Platform application itself
- **Location**: `/Users/jc/dev/site-generator` (or your local path)
- **Contains**:
  - `frontend/` - Next.js platform interface (template selection, deployment status, user management)
  - `backend/` - AWS Lambda functions (APIs, WebSocket handlers, GitHub integration)
  - `infrastructure/` - Platform infrastructure (API Gateway, DynamoDB, Cognito, etc.)
  - `docs/` - Platform documentation and guides
- **Users**: Platform developers, administrators, and end users accessing the web interface
- **Deployment**: Deploys the Site Generator platform itself to AWS
- **Git commits**: Platform features, UI improvements, API changes, infrastructure updates

### **Templates Repository** (EXTERNAL GITOPS REPOSITORY)
- **Purpose**: GitOps repository for website template deployments
- **Location**: `https://github.com/wjesseclements/site-generator-infrastructure`
- **Contains**:
  - `templates/` - Terraform modules for each website template (data-explorer, company-pulse, etc.)
  - `.github/workflows/` - GitHub Actions for automated Terraform deployment
  - `environments/` - Environment-specific configurations
- **Users**: Triggered automatically by the platform when users deploy websites
- **Deployment**: Deploys individual websites for end users
- **Git commits**: Template updates, new website types, workflow improvements

### **Key Distinction**
- **Platform Repository**: Code changes to the Site Generator application
- **Templates Repository**: Website templates that users can deploy
- **GitOps Flow**: Platform → Repository Dispatch → Templates Repository → GitHub Actions → AWS

## Architecture

### Frontend (Next.js + TypeScript)
- **Location**: `/frontend`
- **Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Hosting**: Static export to S3 bucket
- **Auth**: AWS Cognito integration
- **Real-time**: WebSocket for deployment status updates

### Backend (AWS Lambda)
- **Location**: `/backend`
- **Functions**:
  - `api/create-deployment`: Creates deployment records and triggers Step Functions
  - `api/get-deployment`: Retrieves deployment details
  - `api/get-deployments`: Lists all deployments
  - `api/github-webhook`: Receives status updates from GitHub Actions
  - `orchestrator/github-dispatch`: Triggers GitHub repository dispatch events
  - `websocket/*`: Handles real-time connections

### Infrastructure Deployment (GitOps)
- **Platform Infrastructure**: `/infrastructure` - Core platform (API Gateway, Lambda, DynamoDB, etc.)
- **Website Templates**: External GitHub repository with Terraform templates
- **Deployment Method**: API triggers → Step Functions → GitHub Repository Dispatch → GitHub Actions → Terraform
- **State Management**: Remote state in S3 with DynamoDB locking
- **Security**: OIDC authentication, least privilege IAM roles, webhook verification

### Templates Architecture
- **Location**: External GitHub repository (`infrastructure-templates`)
- **Available**: Data Explorer, Company Pulse, PixelWorks, Team Polls
- **Format**: Terraform modules with parameterized inputs
- **Environments**: dev, staging, prod with proper governance

## Common Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server with Turbopack (port 3000)
npm run build        # Build for production (optimized static export)
npm run build:static # Build static export for S3
npm run lint         # Run ESLint (all checks pass)
npm run test         # Run Jest tests (8 tests passing)
npm run test:watch   # Run Jest in watch mode
```

### Backend Development
```bash
cd backend
# AWS Best Practice: S3-based Lambda deployment (recommended)
./build-production-s3.sh    # Build and upload all Lambda functions to S3
                            # Auto-discovers functions, uses standardized TypeScript compilation
                            # Uploads versioned artifacts to S3 with metadata
                            # Supports ARM64, X-Ray tracing, JSON logging
                            # Eliminates archive_file anti-pattern

# Legacy build (still available)
./build-production.sh       # Build all Lambda functions locally
                            # Creates optimized deployment packages
                            # TypeScript compilation with proper error handling

# Test individual Lambda functions
cd api/create-deployment && npm test        # Run Jest tests for specific function
cd api/create-deployment && npm run build   # Build specific function
```

### Infrastructure Deployment
```bash
cd infrastructure
terraform init
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan

# S3-based Lambda deployment workflow
# 1. Build and upload Lambda functions: ./build-production-s3.sh
# 2. Update terraform.tfvars with lambda_artifact_version from build output
# 3. Apply infrastructure with new artifacts: terraform apply

# Note: Requires GitHub token and webhook secret in terraform.tfvars
# After apply, use terraform output to get GitHub repository secrets
```

## Key Implementation Details

### Frontend Architecture (Next.js Static Export)
- **Next.js 15 + React 19** with static export for S3 hosting (no SSR)
- **AuthProvider wrapper required** in `app/layout.tsx` for `useAuth()` hook usage
- **Environment variables** in `.env.local` must be prefixed with `NEXT_PUBLIC_`
- **Template definitions** in `lib/templates.ts` with 4 available templates
- **AWS Amplify v6** configuration in `lib/auth.ts` with client-side initialization check
- **Client-side components** must use `'use client'` directive
- **Turbopack** enabled by default for development (`npm run dev`)

### Backend Lambda Patterns

**Function Structure**: All Lambda functions follow this structure:
```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // CORS headers required for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json'
  };
  // Implementation
};
```

**Function Organization**:
- `api/` - REST API endpoints (create-deployment, get-deployment, get-deployments, github-webhook)
- `websocket/` - WebSocket handlers (connect, disconnect, status)
- `orchestrator/` - Workflow coordination (github-dispatch)
- `libs/` - Shared libraries (types, DynamoDB helpers)

**Development Pattern**:
- Each function has its own `package.json`, `tsconfig.json`, and test files
- Shared types and utilities in `/libs` directory
- Auto-discovery build system finds all functions with `index.ts`
- Standardized TypeScript compilation via `lambda-tsconfig.json`

### Backend Build Process (esbuild Bundling)
- **S3-based deployment** via `build-production-s3.sh` following AWS Well-Architected Framework
- **esbuild bundling** resolves shared TypeScript imports (`libs/types`) into single files
- **Auto-discovery** of Lambda functions by scanning for `index.ts` files
- **Shared libraries** in `/libs` directory bundled inline, not copied separately
- **Versioned artifacts** uploaded to S3 with metadata and intelligent tiering
- **ARM64 architecture** support for Node.js 20.x runtime
- **Critical**: Update `lambda_artifact_version` in `terraform.tfvars` after S3 build

### DynamoDB Tables
- **deployments**: Stores deployment records with GitHub Actions correlation IDs
- **connections**: WebSocket connection management for real-time updates
- **terraform-locks**: External state locking (used by GitHub Actions Terraform)

### Enterprise Deployment Flow (GitOps Pattern)
1. User selects template and parameters in frontend
2. POST to `/deployments` creates record in DynamoDB with PENDING status
3. Step Functions orchestrates deployment by invoking GitHub dispatch Lambda
4. GitHub dispatch Lambda triggers GitHub Repository Dispatch event with deployment parameters
5. GitHub Actions workflow receives event and executes Terraform deployment
6. GitHub Actions posts status updates back via webhook during execution
7. WebSocket sends real-time status updates to frontend
8. Terraform deploys infrastructure using remote state and enterprise security patterns

## Environment Configuration

### Frontend Environment Variables
```bash
NEXT_PUBLIC_API_URL=<API Gateway URL>
NEXT_PUBLIC_WEBSOCKET_URL=<WebSocket API URL>
NEXT_PUBLIC_USER_POOL_ID=<Cognito User Pool ID>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<Cognito Client ID>
NEXT_PUBLIC_IDENTITY_POOL_ID=<Cognito Identity Pool ID>
NEXT_PUBLIC_REGION=us-east-1
```

### Terraform Variables
Copy `infrastructure/terraform.tfvars.example` to `terraform.tfvars` and configure:
- `project_name`: Site generator instance name
- `environment`: dev/staging/prod
- `allowed_origins`: CORS configuration
- `tags`: Cost tracking tags
- `github_token`: GitHub personal access token with 'repo' scope
- `github_repo_owner`: GitHub username for infrastructure templates repository
- `github_repo_name`: Repository name for infrastructure templates (default: site-generator-infrastructure)
- `github_webhook_secret`: Secure random string for webhook verification (generate with: openssl rand -hex 32)
- `lambda_artifact_version`: Version timestamp from S3 build (updated by build script)
- `enable_lambda_tracing`: Enable X-Ray tracing (default: true)
- `lambda_log_level`: Log level for Lambda functions (default: INFO)
- `enable_code_signing`: Enable Lambda code signing (optional security enhancement)

## Development Workflow

1. **Frontend Changes**: Run `npm run dev` in `/frontend`, make changes, test locally
2. **Backend API Changes**: 
   - Update Lambda code in `/backend/api/*` or `/backend/websocket/*`
   - Test with `npm test` in specific function directory
   - Build and deploy with `./build-production-s3.sh`
   - Update `lambda_artifact_version` in `terraform.tfvars`
   - Apply infrastructure changes with `terraform apply`
3. **Platform Infrastructure Changes**: Modify Terraform in `/infrastructure`, run plan before apply
4. **Template Changes**: Update templates in external `infrastructure-templates` GitHub repository
5. **GitOps Workflow**: All template deployments flow through GitHub Actions for proper governance

## Major Features

### Core Platform Features
- **[Template Management](TEMPLATE_MANAGEMENT.md)** - Interactive template gallery with 4 pre-built website templates
- **[User Authentication](USER_AUTHENTICATION.md)** - AWS Cognito-based authentication with JWT authorization
- **[GitOps Deployment](DEPLOYMENT_ORCHESTRATION.md)** - GitHub Actions workflow for enterprise Terraform execution
- **[WebSocket Communication](WEBSOCKET_COMMUNICATION.md)** - Real-time deployment status updates and monitoring
- **[Deployment Monitoring](WEBSOCKET_COMMUNICATION.md)** - Comprehensive dashboard for deployment history and status

### Infrastructure Features
- **[Infrastructure Provisioning](INFRASTRUCTURE_PROVISIONING.md)** - Complete AWS infrastructure automation via Terraform
- **[Lambda Architecture](LAMBDA_ARCHITECTURE.md)** - Serverless compute for all backend operations
- **[Database Operations](DATABASE_OPERATIONS.md)** - DynamoDB-based data persistence and WebSocket connection management
- **[S3 Hosting](S3_HOSTING.md)** - Static website hosting and artifact storage
- **[API Gateway Integration](API_GATEWAY_INTEGRATION.md)** - RESTful API and WebSocket communication endpoints
- **[WebSocket Communication](WEBSOCKET_COMMUNICATION.md)** - Real-time bidirectional communication system

## GitOps Architecture Details

### Repository Structure
```
infrastructure-templates/                    # External GitHub repository
├── .github/
│   └── workflows/
│       ├── deploy.yml                      # Main deployment workflow
│       ├── plan.yml                        # Terraform plan on PR
│       └── destroy.yml                     # Environment cleanup
├── templates/
│   ├── data-explorer/
│   │   ├── main.tf                         # Terraform infrastructure
│   │   ├── variables.tf                    # Parameterized inputs
│   │   ├── outputs.tf                      # Deployment outputs
│   │   └── versions.tf                     # Provider requirements
│   ├── company-pulse/
│   ├── pixelworks/
│   └── team-polls/
├── environments/
│   ├── dev/
│   │   └── terraform.tfvars                # Environment-specific values
│   ├── staging/
│   └── prod/
└── shared/
    ├── modules/                            # Reusable Terraform modules
    └── policies/                           # IAM and security policies
```

### GitHub Actions Workflow Integration
- **Repository Dispatch Events**: API triggers GitHub workflows with deployment parameters
- **OIDC Authentication**: Secure, temporary AWS credentials without stored secrets
- **Remote State Management**: S3 backend with DynamoDB locking for consistency
- **Environment Promotion**: Automated promotion from dev → staging → prod
- **Status Callbacks**: Real-time updates back to the platform via webhooks

### Security & Compliance
- **Least Privilege IAM**: OIDC roles with minimal required permissions
- **Audit Trail**: Complete deployment history in GitHub Actions logs
- **State Encryption**: Terraform state encrypted at rest in S3
- **Secret Management**: GitHub secrets for sensitive configuration
- **Branch Protection**: Required reviews for infrastructure changes

### Enterprise Features
- **Multi-Environment Support**: Separate AWS accounts for dev/staging/prod
- **Template Versioning**: Git tags for template releases and rollbacks
- **Drift Detection**: Automated detection of infrastructure changes
- **Cost Management**: Resource tagging and cost allocation
- **Compliance**: Integration with AWS Config and Security Hub

## Critical Technical Notes

### Lambda Development
- **esbuild bundling required** - shared imports in `/libs` must be bundled, not copied
- **S3 deployment workflow**: Build → Upload → Update `terraform.tfvars` → Apply
- **CORS headers required** on all API responses for frontend compatibility
- **JWT authentication** required on all API endpoints except webhooks (signature verification)

### Frontend Development  
- **AuthProvider wrapper mandatory** in layout.tsx - missing causes client-side exceptions
- **Static export limitations** - no SSR, server-side functions, or dynamic routes
- **Environment variables** must be `NEXT_PUBLIC_` prefixed and defined in `.env.local`
- **Cognito initialization** client-side only (`typeof window !== 'undefined'` checks)

### Infrastructure Dependencies
- **Two-repository architecture** - platform code (this repo) + GitOps templates (external)
- **GitHub tokens and webhook secrets** required in `terraform.tfvars` for deployment flow
- **DynamoDB correlation table** enables Step Functions callback pattern for async workflows
- **Remote state locking** prevents concurrent Terraform operations via DynamoDB

### Testing and Deployment
- **Jest tests**: Run `npm test` in individual function directories
- **Live platform**: http://site-generator-dev-frontend.s3-website-us-east-1.amazonaws.com
- **Template deployment flow**: Frontend → API → Step Functions → GitHub Actions → Terraform
- **Real-time updates**: WebSocket connections provide deployment status via GitHub webhooks

## Common Issues and Solutions

### Lambda Import Errors
**Problem**: `Runtime.ImportModuleError: Error: Cannot find module '../../libs/types'`
**Solution**: Use esbuild bundling in `build-production-s3.sh`, not file copying

### Frontend "Application Error" 
**Problem**: Client-side exception on page load
**Solution**: Ensure `AuthProvider` wrapper exists in `app/layout.tsx`

### DynamoDB Access Denied
**Problem**: `AccessDeniedException: User is not authorized to perform: dynamodb:PutItem`
**Solution**: Remove overly restrictive IAM conditions like `${aws:userid}` from Lambda execution role

### Lambda Testing with AWS CLI
**Problem**: `Invalid base64` errors when invoking Lambda functions
**Solution**: Use `--cli-binary-format raw-in-base64-out` flag with JSON payloads