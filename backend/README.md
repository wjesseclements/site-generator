# Backend Services

This directory contains all Lambda functions and backend services for the Site Generator Platform.

## Structure

```
backend/
├── api/                    # API Lambda functions
│   ├── create-deployment/  # Create new deployment
│   ├── get-deployments/    # List user deployments
│   └── get-deployment/     # Get deployment status
├── orchestrator/          # Step Functions workflow
│   └── terraform-runner/  # Terraform execution
├── libs/                  # Shared libraries
│   ├── dynamodb/         # DynamoDB utilities
│   └── terraform/        # Terraform helpers
└── websocket/            # WebSocket handlers
    ├── connect/          # Connection handler
    ├── disconnect/       # Disconnection handler
    └── status/          # Status update handler
```

## Lambda Functions

### API Functions

- **create-deployment**: Initiates a new deployment request
- **get-deployments**: Returns list of user's deployments
- **get-deployment**: Returns status of specific deployment

### Orchestrator Functions

- **terraform-runner**: Executes Terraform commands in isolated environment

### WebSocket Functions

- **connect**: Handles WebSocket connections
- **disconnect**: Cleans up disconnected clients
- **status**: Broadcasts deployment status updates

## Environment Variables

- `DEPLOYMENTS_TABLE`: DynamoDB table for deployment records
- `CONNECTIONS_TABLE`: DynamoDB table for WebSocket connections
- `TERRAFORM_BUCKET`: S3 bucket for Terraform state files
- `CROSS_ACCOUNT_ROLE_PREFIX`: Prefix for cross-account IAM roles