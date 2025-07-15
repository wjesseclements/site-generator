import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { handleError, createErrorResponse, createSuccessResponse, logInfo, logError, AuthenticationError, DatabaseError } from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logInfo('Processing get-deployments request')
    
    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      throw new AuthenticationError('Missing authentication token')
    }
    
    logInfo(`Querying deployments for user: ${userId}`)
    
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

    logInfo(`Found ${result.Items?.length || 0} deployments for user`)

    return createSuccessResponse({
      deployments: result.Items || []
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      logError('Authentication error in get-deployments', error)
      return createErrorResponse(401, error.message, 'AUTHENTICATION_ERROR')
    }
    
    logError('Database error in get-deployments', error)
    return handleError(error, new DatabaseError('Failed to fetch deployments'))
  }
}