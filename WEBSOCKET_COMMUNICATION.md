# WebSocket Communication Feature

## Overview
Real-time bidirectional communication system using AWS API Gateway WebSocket API. Enables live deployment status updates, connection management, and instant user feedback during infrastructure provisioning.

## Core Functionality
- Persistent WebSocket connections for real-time updates
- Connection lifecycle management (connect/disconnect)
- Message broadcasting to specific users or all connections
- Automatic connection cleanup with TTL
- Error handling and reconnection logic
- Status update routing and delivery

## Files
- `/backend/websocket/connect/index.ts` - Connection establishment handler
- `/backend/websocket/disconnect/index.ts` - Connection cleanup handler
- `/backend/websocket/status/index.ts` - Status message broadcasting
- `/frontend/lib/websocket.ts` - Client-side WebSocket manager

## WebSocket Handlers

### Connection Handler (`$connect`)
```typescript
export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  const userId = getUserIdFromToken(event) // Extract from JWT
  
  // Store connection in DynamoDB
  await dynamodb.putItem({
    TableName: process.env.CONNECTIONS_TABLE!,
    Item: {
      connectionId: { S: connectionId },
      userId: { S: userId },
      connectedAt: { S: new Date().toISOString() },
      ttl: { N: (Date.now() / 1000 + 3600).toString() } // 1 hour TTL
    }
  }).promise()
  
  return { statusCode: 200, body: 'Connected' }
}
```

### Disconnect Handler (`$disconnect`)
```typescript
export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  
  // Remove connection from DynamoDB
  await dynamodb.deleteItem({
    TableName: process.env.CONNECTIONS_TABLE!,
    Key: { connectionId: { S: connectionId } }
  }).promise()
  
  return { statusCode: 200, body: 'Disconnected' }
}
```

### Status Update Handler
```typescript
export const handler = async (event: DeploymentStatusEvent) => {
  const { deploymentId, status, message, logs } = event
  
  // Get all connections for the user
  const connections = await getConnectionsForDeployment(deploymentId)
  
  // Broadcast to all connected clients
  await Promise.all(connections.map(conn => 
    broadcastMessage(conn.connectionId, {
      type: 'deployment_status',
      deploymentId,
      status,
      message,
      logs,
      timestamp: new Date().toISOString()
    })
  ))
}
```

## Client-Side WebSocket Manager
```typescript
export class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 5
  private currentAttempts: number = 0
  
  connect(url: string, deploymentId: string) {
    this.url = `${url}?deploymentId=${deploymentId}`
    this.ws = new WebSocket(this.url)
    this.setupEventHandlers()
  }
  
  private setupEventHandlers() {
    this.ws!.onopen = () => {
      console.log('WebSocket connected')
      this.currentAttempts = 0
    }
    
    this.ws!.onmessage = (event) => {
      const update = JSON.parse(event.data)
      this.notifyListeners(update)
    }
    
    this.ws!.onclose = () => {
      console.log('WebSocket disconnected')
      this.handleReconnect()
    }
    
    this.ws!.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }
  
  private handleReconnect() {
    if (this.currentAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.currentAttempts++
        this.connect(this.url.split('?')[0], '')
      }, this.reconnectInterval * Math.pow(2, this.currentAttempts))
    }
  }
}
```

## Message Types
```typescript
interface DeploymentStatusUpdate {
  type: 'deployment_status'
  deploymentId: string
  status: 'PENDING' | 'INITIALIZING' | 'PLANNING' | 'APPLYING' | 'COMPLETED' | 'FAILED'
  message: string
  logs?: string[]
  timestamp: string
  progress?: number
}

interface ErrorMessage {
  type: 'error'
  message: string
  code: string
  timestamp: string
}
```

## Connection Management
- **Storage**: DynamoDB with connectionId as primary key
- **TTL**: 1-hour automatic cleanup for stale connections
- **User Association**: Links connections to user ID for targeted messaging
- **Deployment Tracking**: Associates connections with specific deployments

## Error Handling
- **Connection Failures**: Automatic reconnection with exponential backoff
- **Message Delivery**: Retry logic for failed message broadcasts
- **Stale Connections**: Automatic cleanup of disconnected clients
- **Rate Limiting**: Protection against message flooding

## Integration Points
- Triggered by deployment orchestration engine
- Updates sent during Terraform execution phases
- Connects to deployment status UI components
- Provides real-time feedback for user experience