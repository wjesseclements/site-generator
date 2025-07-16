import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { Deployment } from '../../libs/types'
import { 
  ErrorResponses, 
  createSuccessResponse, 
  logError, 
  logInfo,
  ValidationError,
  UnauthorizedError,
  NotFoundError
} from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logInfo('get-deployment', 'Processing get deployment request', { 
      requestId: event.requestContext.requestId 
    })

    // Get deployment ID from path parameters
    const deploymentId = event.pathParameters?.deploymentId
    if (!deploymentId) {
      throw new ValidationError('Deployment ID is required')
    }

    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      throw new UnauthorizedError('Missing authentication token')
    }
    
    // Get deployment from DynamoDB
    const result = await dynamodb.get({
      TableName: DEPLOYMENTS_TABLE,
      Key: {
        id: deploymentId
      }
    }).promise()

    if (!result.Item) {
      throw new NotFoundError('Deployment not found')
    }

    const deployment = result.Item as Deployment

    // Verify user owns this deployment
    if (deployment.userId !== userId) {
      return ErrorResponses.forbidden('Access denied to this deployment')
    }

    logInfo('get-deployment', 'Deployment retrieved successfully', { 
      deploymentId: deployment.id,
      userId: deployment.userId,
      status: deployment.status
    })

    return createSuccessResponse(200, { deployment })
  } catch (error) {
    logError('get-deployment', error, { 
      requestId: event.requestContext.requestId,
      userId: event.requestContext.authorizer?.claims?.sub,
      deploymentId: event.pathParameters?.deploymentId
    })
    
    // Return appropriate error response based on error type
    if (error instanceof ValidationError) {
      return ErrorResponses.badRequest(error.message, error.details)
    }
    
    if (error instanceof UnauthorizedError) {
      return ErrorResponses.unauthorized(error.message)
    }
    
    if (error instanceof NotFoundError) {
      return ErrorResponses.notFound(error.message)
    }
    
    // Default to internal server error
    return ErrorResponses.internalError('Failed to get deployment')
  }
}