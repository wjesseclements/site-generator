# DynamoDB Table Schemas

## Deployments Table

**Table Name**: `site-generator-deployments`

### Primary Key
- **Partition Key**: `id` (String) - Deployment ID

### Global Secondary Indexes

1. **UserIdIndex**
   - **Partition Key**: `userId` (String)
   - **Sort Key**: `createdAt` (String)
   - **Projection**: ALL

2. **StatusIndex**
   - **Partition Key**: `status` (String)
   - **Sort Key**: `updatedAt` (String)
   - **Projection**: ALL

### Attributes
- `id`: String - Unique deployment ID
- `userId`: String - User ID from Cognito
- `templateId`: String - Template identifier
- `templateName`: String - Human-readable template name
- `siteName`: String - User-provided site name
- `parameters`: Map - Template parameters
- `status`: String - Deployment status
- `targetAccount`: String (optional) - AWS account ID
- `outputs`: Map (optional) - Deployment outputs
- `cost`: Map (optional) - Cost estimate
- `createdAt`: String - ISO timestamp
- `updatedAt`: String - ISO timestamp
- `completedAt`: String (optional) - ISO timestamp
- `error`: String (optional) - Error message
- `tags`: Map - Resource tags

## WebSocket Connections Table

**Table Name**: `site-generator-connections`

### Primary Key
- **Partition Key**: `connectionId` (String) - WebSocket connection ID

### Global Secondary Indexes

1. **UserIdIndex**
   - **Partition Key**: `userId` (String)
   - **Projection**: ALL

2. **DeploymentIdIndex**
   - **Partition Key**: `deploymentId` (String)
   - **Projection**: ALL

### Attributes
- `connectionId`: String - WebSocket connection ID
- `userId`: String - User ID
- `deploymentId`: String (optional) - Associated deployment
- `connectedAt`: String - ISO timestamp

### TTL
- `ttl`: Number - Set to 24 hours after connection