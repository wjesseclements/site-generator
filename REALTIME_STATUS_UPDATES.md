# Real-Time Status Updates Feature

## Overview
WebSocket-based real-time communication system providing live deployment progress tracking, status updates, and log streaming to users during infrastructure provisioning.

## Core Functionality
- WebSocket API Gateway for bidirectional communication
- Live deployment progress tracking
- Real-time log streaming
- Connection management with automatic cleanup
- Automatic reconnection on disconnection
- Status broadcasting to connected clients

## Files
- `/frontend/lib/websocket.ts` - WebSocket client manager class
- `/frontend/components/deployment-status.tsx` - Status UI component
- `/backend/websocket/connect/index.ts` - Connection handler
- `/backend/websocket/disconnect/index.ts` - Disconnection cleanup
- `/backend/websocket/status/index.ts` - Status broadcast handler
- `/infrastructure/api-gateway.tf` - WebSocket API configuration

## Technical Implementation
- **WebSocket API**: `wss://zcj3sqcy3d.execute-api.us-east-1.amazonaws.com/dev`
- **Connection Storage**: DynamoDB with TTL for automatic cleanup
- **Message Broadcasting**: Lambda functions send updates to all connected clients
- **Client Management**: Automatic reconnection with exponential backoff

## WebSocket Routes
- `$connect` - Handle new WebSocket connections
- `$disconnect` - Clean up disconnected sessions
- `status` - Broadcast deployment status updates

## Client-Side Implementation
```typescript
export class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 5
  
  connect(url: string, deploymentId: string) {
    this.ws = new WebSocket(url)
    this.setupEventHandlers()
  }
  
  private handleReconnect() {
    // Exponential backoff reconnection logic
  }
}
```

## Status Update Types
- `PENDING` - Deployment queued
- `INITIALIZING` - Setting up Terraform workspace
- `PLANNING` - Generating infrastructure plan
- `APPLYING` - Provisioning resources
- `COMPLETED` - Deployment successful
- `FAILED` - Deployment failed with error details

## Integration Points
- Triggered by deployment orchestration engine
- Updates deployment status UI in real-time
- Provides live feedback during template deployment
- Enables responsive user experience during long-running operations