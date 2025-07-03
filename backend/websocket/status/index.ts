import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB, ApiGatewayManagementApi } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { deploymentId } = JSON.parse(event.body || '{}')
    const connectionId = event.requestContext.connectionId!
    
    if (!deploymentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Deployment ID is required'
        })
      }
    }

    // Get deployment status
    const result = await dynamodb.get({
      TableName: DEPLOYMENTS_TABLE,
      Key: {
        id: deploymentId
      }
    }).promise()

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Deployment not found'
        })
      }
    }

    // Create API Gateway Management API client
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
    })

    // Send deployment status to connection
    await apigwManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify({
        action: 'status',
        deployment: result.Item
      })
    }).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Status sent successfully'
      })
    }
  } catch (error) {
    console.error('Error sending status:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send status'
      })
    }
  }
}