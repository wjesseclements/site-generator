# Deployment Monitoring Feature

## Overview
Comprehensive monitoring dashboard providing real-time deployment status tracking, history management, and interactive deployment details. Integrates with WebSocket for live updates and database for persistent tracking.

## Core Functionality
- Real-time deployment status visualization
- Deployment history dashboard with filtering
- Interactive status indicators with progress tracking
- Error reporting and troubleshooting information
- Live log streaming during deployments
- Deployment details and output display

## Files
- `/frontend/app/deployments/page.tsx` - Main deployments dashboard
- `/frontend/components/deployment-status.tsx` - Real-time status component
- `/backend/api/get-deployments/index.ts` - Deployment listing API
- `/backend/api/get-deployment/index.ts` - Deployment details API

## Deployment Dashboard (`/deployments`)
```typescript
// Main dashboard showing all user deployments
export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DeploymentStatus | 'ALL'>('ALL')
  
  // Fetch deployments from API
  useEffect(() => {
    fetchDeployments()
  }, [])
  
  return (
    <div className="deployments-dashboard">
      <DeploymentFilters />
      <DeploymentList deployments={filteredDeployments} />
    </div>
  )
}
```

## Real-Time Status Component
```typescript
export function DeploymentStatus({ 
  deploymentId, 
  initialStatus = 'PENDING',
  websocketUrl 
}: DeploymentStatusProps) {
  const [status, setStatus] = useState(initialStatus)
  const [statusMessage, setStatusMessage] = useState('Preparing deployment...')
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null)
  
  useEffect(() => {
    // Initialize WebSocket connection for real-time updates
    const manager = new WebSocketManager()
    manager.connect(websocketUrl, deploymentId)
    
    manager.addListener(deploymentId, (update) => {
      setStatus(update.status)
      setStatusMessage(update.message)
      if (update.logs) setLogs(prev => [...prev, ...update.logs])
      if (update.progress) setProgress(update.progress)
    })
    
    setWsManager(manager)
    
    return () => manager.disconnect()
  }, [deploymentId, websocketUrl])
}
```

## Status Visualization
### Status Types and Colors
- `PENDING` - Gray (⏳ Queued)
- `INITIALIZING` - Blue (🔄 Setting up)
- `PLANNING` - Yellow (📋 Planning)
- `APPLYING` - Green (🚀 Deploying)
- `COMPLETED` - Green (✅ Success)
- `FAILED` - Red (❌ Failed)

### Progress Indicators
- Circular progress bars for active deployments
- Step-by-step progress tracking
- Time estimates based on template complexity
- Visual feedback for each deployment phase

## Deployment Details View
```typescript
interface DeploymentDetails {
  id: string
  name: string
  templateId: string
  status: DeploymentStatus
  parameters: Record<string, any>
  outputs?: {
    websiteUrl?: string
    apiEndpoint?: string
    databaseName?: string
  }
  createdAt: string
  updatedAt: string
  logs: string[]
  errorDetails?: string
}
```

## Live Log Streaming
- Real-time Terraform output display
- Syntax highlighting for log entries
- Automatic scrolling to latest entries
- Log filtering and search capabilities
- Export logs for troubleshooting

## Error Handling and Reporting
- Detailed error messages with context
- Troubleshooting suggestions
- Link to documentation and support
- Retry deployment functionality
- Error categorization (user error vs system error)

## API Integration
### Get All Deployments
```typescript
// GET /deployments
export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.claims?.sub || 'test-user'
  
  const result = await dynamodb.query({
    TableName: DEPLOYMENTS_TABLE,
    IndexName: 'UserIdIndex', 
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
    ScanIndexForward: false // Most recent first
  }).promise()

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      deployments: result.Items || []
    })
  }
}
```

## Performance Features
- Pagination for large deployment lists
- Lazy loading of deployment details
- Caching of static deployment data
- Optimistic UI updates
- Background refresh of stale data

## Integration Points
- Connects to WebSocket for real-time updates
- Queries DynamoDB for deployment history
- Displays template outputs and URLs
- Links to deployed website URLs
- Integrates with error reporting system