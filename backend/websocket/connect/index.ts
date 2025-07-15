import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    const userId = event.requestContext.authorizer?.principalId
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized: Missing authentication'
        })
      }
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Connected successfully'
      })
    }
  } catch (error) {
    console.error('Error connecting:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to connect'
      })
    }
  }
}