# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Site Generator is a self-service infrastructure provisioning platform that allows users to select pre-configured website templates and deploy them automatically on AWS. The platform uses a serverless architecture with static frontend hosting in S3.

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
  - `api/create-deployment`: Creates new deployments
  - `api/get-deployment`: Retrieves deployment details
  - `api/get-deployments`: Lists all deployments
  - `orchestrator/terraform-runner`: Executes Terraform commands
  - `websocket/*`: Handles real-time connections

### Infrastructure (Terraform)
- **Location**: `/infrastructure`
- **Resources**: S3, Lambda, API Gateway, DynamoDB, Cognito, Step Functions
- **Multi-account**: Cross-account IAM roles for deployments

### Templates
- **Location**: `/templates`
- **Available**: Data Explorer, Company Pulse, PixelWorks, Team Polls

## Common Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run build:static # Build static export for S3
npm run lint         # Run ESLint
```

### Infrastructure Deployment
```bash
cd infrastructure
terraform init
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan
```

## Key Implementation Details

### Frontend Considerations
- Uses inline styles instead of Tailwind classes due to Next.js 15 + Tailwind v4 compatibility issues
- Static export configuration in `next.config.ts` (currently commented out for development)
- Template definitions in `lib/templates.ts`
- Dark theme UI with gradient backgrounds and animations

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

### DynamoDB Tables
- **deployments**: Stores deployment records with status tracking
- **connections**: WebSocket connection management
- **terraform-locks**: State locking for concurrent operations

### Deployment Flow
1. User selects template and parameters in frontend
2. POST to `/deployments` creates record in DynamoDB
3. Step Functions state machine orchestrates Terraform execution
4. WebSocket sends real-time status updates to frontend
5. Terraform deploys resources to target AWS account

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

## Development Workflow

1. **Frontend Changes**: Run `npm run dev` in `/frontend`, make changes, test locally
2. **Backend Changes**: Update Lambda code in `/backend/api/*`, no local testing setup
3. **Infrastructure Changes**: Modify Terraform in `/infrastructure`, run plan before apply
4. **Template Changes**: Add new templates in `/templates` as Terraform modules

## Important Notes

- No test suite currently implemented
- Frontend uses static export for S3 hosting (no SSR)
- All infrastructure assumes AWS us-east-1 region by default
- WebSocket connections require proper CORS configuration
- Cross-account deployments need pre-configured IAM roles