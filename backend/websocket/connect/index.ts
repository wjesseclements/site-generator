import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { 
  createWebSocketResponse, 
  logError, 
  logInfo,
  UnauthorizedError
} from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    
    logInfo('websocket-connect', 'Processing WebSocket connection request', { 
      connectionId,
      requestId: event.requestContext.requestId 
    })
    
    // For WebSocket connections, authentication info comes from query parameters
    const queryParams = event.queryStringParameters || {}
    const authToken = queryParams.token || queryParams.Authorization
    
    if (!authToken) {
      throw new UnauthorizedError('Missing authentication token')
    }
    
    // Extract userId from JWT token (simplified - in production, verify the token)
    let userId: string
    try {
      // Basic JWT payload extraction (without verification for now)
      const tokenParts = authToken.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format')
      }
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.sub || payload.userId || payload.username
      
      if (!userId) {
        throw new Error('No user ID in token')
      }
    } catch (error) {
      throw new UnauthorizedError('Invalid authentication token')
    }
    
    // Store connection in DynamoDB
    await dynamodb.put({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        userId,
        connectedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
      }
    }).promise()

    logInfo('websocket-connect', 'WebSocket connection established successfully', { 
      connectionId,
      userId
    })

    return createWebSocketResponse(200, 'Connected successfully')
  } catch (error) {
    logError('websocket-connect', error, { 
      connectionId: event.requestContext.connectionId,
      requestId: event.requestContext.requestId
    })
    
    // Return appropriate error response based on error type
    if (error instanceof UnauthorizedError) {
      return createWebSocketResponse(401, 'Unauthorized: ' + error.message)
    }
    
    // Default to internal server error
    return createWebSocketResponse(500, 'Failed to connect')
  }
}