import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    
    // Remove connection from DynamoDB
    await dynamodb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: {
        connectionId
      }
    }).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Disconnected successfully'
      })
    }
  } catch (error) {
    console.error('Error disconnecting:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to disconnect'
      })
    }
  }
}