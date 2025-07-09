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
./build.sh           # Build all Lambda functions with optimized packages
                     # Creates 6.6-6.7MB deployment packages
                     # Includes AWS SDK (required for Node.js 18.x runtime)
                     # TypeScript compilation with proper error handling
                     # Builds: API endpoints, WebSocket handlers, GitHub integration
```

### Infrastructure Deployment
```bash
cd infrastructure
terraform init
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan
# Note: Requires GitHub token and webhook secret in terraform.tfvars
# After apply, use terraform output to get GitHub repository secrets
```

## Key Implementation Details

### Frontend Considerations
- **Next.js 15 + React 19** with security updates applied
- **Tailwind CSS v4** with inline styles for optimal performance
- **Static export** configuration for S3 hosting in `next.config.ts`
- **Template definitions** in `lib/templates.ts` with 4 available templates
- **Dark theme UI** with gradient backgrounds and smooth animations
- **AWS Amplify v6** for Cognito authentication integration
- **Jest testing framework** with React Testing Library (8 tests passing)
- **Turbopack** for fast development builds and hot reloading

### Backend Lambda Pattern
All Lambda functions follow this structure:
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

### Backend Build Process
- **Optimized build** via `build.sh` script following AWS Well-Architected Framework
- **TypeScript compilation** for each Lambda function with proper type checking
- **AWS SDK included** in deployment packages (required for Node.js 18.x runtime)
- **Enterprise dependencies** - complete AWS SDK and essential packages
- **6.6-6.7MB packages** for optimal compatibility and reliability
- **Functions built**: API endpoints, WebSocket handlers, GitHub dispatch trigger, webhook receiver

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

## Development Workflow

1. **Frontend Changes**: Run `npm run dev` in `/frontend`, make changes, test locally
2. **Backend API Changes**: Update Lambda code in `/backend/api/*`, rebuild and deploy
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

## Important Notes

- **Testing framework** implemented with Jest and React Testing Library (8 tests passing)
- **Frontend** uses static export for S3 hosting (no SSR) with CloudFront distribution
- **Infrastructure** assumes AWS us-east-1 region by default with multi-region capability
- **WebSocket connections** properly configured with CORS and authentication
- **GitOps deployments** follow enterprise patterns with GitHub Actions and Terraform
- **Backend functions** use optimized TypeScript compilation (6.6-6.7MB packages with full AWS SDK)
- **AWS SDK** included in Lambda packages (required for Node.js 18.x runtime)
- **Security** - all endpoints require JWT authentication via Cognito, webhook signatures verified
- **State Management** - Remote Terraform state with S3 backend and DynamoDB locking
- **OIDC Integration** - Secure GitHub Actions authentication without long-lived credentials
- **GitHub Integration** - Repository dispatch events trigger GitOps workflows with status callbacks