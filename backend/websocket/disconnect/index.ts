import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { handleError, createWebSocketResponse, logInfo, logError, DatabaseError } from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    
    logInfo(`Disconnecting WebSocket connection: ${connectionId}`)
    
    // Remove connection from DynamoDB
    await dynamodb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: {
        connectionId
      }
    }).promise()

    logInfo(`Successfully disconnected connection: ${connectionId}`)

    return createWebSocketResponse(200, {
      message: 'Disconnected successfully'
    })
  } catch (error) {
    logError('Error disconnecting WebSocket', error)
    return handleError(error, new DatabaseError('Failed to disconnect'))
  }
}