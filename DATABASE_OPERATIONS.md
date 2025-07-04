# Database Operations Feature

## Overview
DynamoDB-based data persistence layer providing deployment tracking, WebSocket connection management, and Terraform state locking. Supports efficient querying, real-time updates, and automatic cleanup.

## Core Functionality
- Deployment record storage and retrieval
- WebSocket connection session management
- Terraform state locking for concurrent operations
- Global secondary indexes for efficient querying
- TTL-based automatic cleanup
- Point-in-time recovery capabilities

## Files
- `/infrastructure/dynamodb.tf` - Database schema definitions
- `/backend/libs/dynamodb/schemas.md` - Schema documentation
- `/backend/libs/types.ts` - TypeScript data models and interfaces

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

## Indexes and Access Patterns
- **Deployments by User**: GSI on userId for user's deployment history
- **Deployments by Status**: GSI on status for monitoring and cleanup
- **Connections by User**: GSI on userId for user-specific broadcasts
- **Active Locks**: Query by lockId to check operation status

## Data Operations
- **Create Deployment**: Store new deployment with PENDING status
- **Update Status**: Atomic updates to deployment status and outputs
- **Query User Deployments**: Efficient retrieval via GSI
- **Manage Connections**: Store/remove WebSocket connections with TTL
- **Lock Management**: Prevent concurrent Terraform operations

## Performance Optimizations
- Pay-per-request billing for cost efficiency
- TTL attributes for automatic cleanup
- Appropriate data types and indexes
- Batch operations where applicable
- Connection pooling in Lambda functions

## Integration Points
- Stores deployment records from API endpoints
- Tracks WebSocket connections for real-time updates
- Prevents concurrent Terraform operations via locking
- Provides data for deployment status dashboard