import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub || 'test-user'
    
    // Query deployments for user
    const result = await dynamodb.query({
      TableName: DEPLOYMENTS_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
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
  } catch (error) {
    console.error('Error fetching deployments:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to fetch deployments'
      })
    }
  }
}