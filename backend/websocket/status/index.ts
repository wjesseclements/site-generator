import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB, ApiGatewayManagementApi } from 'aws-sdk'
import { handleError, createWebSocketResponse, logInfo, logError, ValidationError, DatabaseError, NotFoundError } from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { deploymentId } = JSON.parse(event.body || '{}')
    const connectionId = event.requestContext.connectionId!
    
    logInfo(`Processing WebSocket status request for deployment: ${deploymentId}`)
    
    if (!deploymentId) {
      throw new ValidationError('Deployment ID is required')
    }

    // Get deployment status
    const result = await dynamodb.get({
      TableName: DEPLOYMENTS_TABLE,
      Key: {
        id: deploymentId
      }
    }).promise()

    if (!result.Item) {
      throw new NotFoundError('Deployment not found')
    }

    // Create API Gateway Management API client
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
    })

    logInfo(`Sending deployment status to connection: ${connectionId}`)

    // Send deployment status to connection
    await apigwManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        action: 'status',
        deployment: result.Item
      })
    }).promise()

    logInfo(`Successfully sent status for deployment: ${deploymentId}`)

    return createWebSocketResponse(200, {
      message: 'Status sent successfully'
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      logError('Validation error in WebSocket status', error)
      return createWebSocketResponse(400, { error: error.message })
    }
    
    if (error instanceof NotFoundError) {
      logError('Deployment not found in WebSocket status', error)
      return createWebSocketResponse(404, { error: error.message })
    }
    
    logError('Error sending WebSocket status', error)
    return handleError(error, new DatabaseError('Failed to send status'))
  }
}