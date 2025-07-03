import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { Deployment } from '../../libs/types'

const dynamodb = new DynamoDB.DocumentClient()
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }

  try {
    // Get deployment ID from path parameters
    const deploymentId = event.pathParameters?.deploymentId
    
    if (!deploymentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Deployment ID is required'
        })
      }
    }

    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub || 'test-user'
    
    // Get deployment from DynamoDB
    const result = await dynamodb.get({
      TableName: DEPLOYMENTS_TABLE,
      Key: {
        id: deploymentId
      }
    }).promise()

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Deployment not found'
        })
      }
    }

    const deployment = result.Item as Deployment

    // Verify user owns this deployment
    if (deployment.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Access denied'
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        deployment
      })
    }
  } catch (error) {
    console.error('Error getting deployment:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get deployment'
      })
    }
  }
}