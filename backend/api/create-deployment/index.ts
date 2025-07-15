import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { StepFunctions } from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'
import { Deployment, DeploymentStatus, CreateDeploymentRequest } from '../../libs/types'

const dynamodb = new DynamoDB.DocumentClient()
const stepfunctions = new StepFunctions()

const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse request body
    const request: CreateDeploymentRequest = JSON.parse(event.body || '{}')
    
    // Validate request
    if (!request.templateId || !request.parameters) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Missing required fields: templateId and parameters'
        })
      }
    }

    // Validate required TestTag
    if (!request.tags?.TestTag) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'TestTag is required for tracking and cleanup purposes'
        })
      }
    }

    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Unauthorized: Missing authentication token'
        })
      }
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

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deployment
      })
    }
  } catch (error) {
    console.error('Error creating deployment:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to create deployment'
      })
    }
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