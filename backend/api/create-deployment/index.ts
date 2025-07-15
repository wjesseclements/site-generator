import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { StepFunctions } from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'
import { Deployment, DeploymentStatus, CreateDeploymentRequest } from '../../libs/types'
import { 
  ErrorResponses, 
  createSuccessResponse, 
  logError, 
  logInfo,
  ValidationError,
  UnauthorizedError
} from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const stepfunctions = new StepFunctions()

const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logInfo('create-deployment', 'Processing deployment request', { 
      requestId: event.requestContext.requestId 
    })

    // Parse request body
    let request: CreateDeploymentRequest
    try {
      request = JSON.parse(event.body || '{}')
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body')
    }
    
    // Validate request
    if (!request.templateId || !request.parameters) {
      throw new ValidationError('Missing required fields: templateId and parameters')
    }

    // Validate required TestTag
    if (!request.tags?.TestTag) {
      throw new ValidationError('TestTag is required for tracking and cleanup purposes')
    }

    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      throw new UnauthorizedError('Missing authentication token')
    }
    
    // Create deployment record
    const deployment: Deployment = {
      id: uuidv4(),
      userId,
      templateId: request.templateId,
      templateName: getTemplateName(request.templateId),
      siteName: request.parameters.siteName,
      parameters: request.parameters,
      status: DeploymentStatus.PENDING,
      targetAccount: request.targetAccount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: {
        'Project': request.parameters.siteName,
        'Template': request.templateId,
        'Owner': userId,
        'CreatedBy': 'site-generator',
        'CreatedDate': new Date().toISOString().split('T')[0],
        'TestTag': request.tags.TestTag,
        ...request.tags // Include any additional tags from frontend
      }
    }

    // Save to DynamoDB
    await dynamodb.put({
      TableName: DEPLOYMENTS_TABLE,
      Item: deployment
    }).promise()

    // Start Step Functions execution
    await stepfunctions.startExecution({
      stateMachineArn: STATE_MACHINE_ARN,
      name: `deployment-${deployment.id}`,
      input: JSON.stringify(deployment)
    }).promise()

    logInfo('create-deployment', 'Deployment created successfully', { 
      deploymentId: deployment.id,
      userId: deployment.userId,
      templateId: deployment.templateId
    })

    return createSuccessResponse(201, { deployment })
  } catch (error) {
    logError('create-deployment', error, { 
      requestId: event.requestContext.requestId,
      userId: event.requestContext.authorizer?.claims?.sub
    })
    
    // Return appropriate error response based on error type
    if (error instanceof ValidationError) {
      return ErrorResponses.badRequest(error.message, error.details)
    }
    
    if (error instanceof UnauthorizedError) {
      return ErrorResponses.unauthorized(error.message)
    }
    
    // Default to internal server error
    return ErrorResponses.internalError('Failed to create deployment')
  }
}

function getTemplateName(templateId: string): string {
  // Use environment variable for template mapping if available
  const templateMappingEnv = process.env.TEMPLATE_MAPPING
  if (templateMappingEnv) {
    try {
      const templates = JSON.parse(templateMappingEnv)
      return templates[templateId] || templateId
    } catch (error) {
      console.warn('Failed to parse TEMPLATE_MAPPING environment variable:', error)
    }
  }
  
  // Default templates as fallback
  const templates: Record<string, string> = {
    'data-explorer': 'Data Explorer',
    'company-pulse': 'Company Pulse',
    'pixelworks': 'PixelWorks',
    'team-polls': 'Team Polls'
  }
  return templates[templateId] || templateId
}