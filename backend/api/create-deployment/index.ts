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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Missing required fields: templateId and parameters'
        })
      }
    }

    // Get user ID from Cognito authorizer
    const userId = event.requestContext.authorizer?.claims?.sub || 'test-user'
    
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
        'CreatedDate': new Date().toISOString().split('T')[0]
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to create deployment'
      })
    }
  }
}

function getTemplateName(templateId: string): string {
  const templates: Record<string, string> = {
    'data-explorer': 'Data Explorer',
    'company-pulse': 'Company Pulse',
    'pixelworks': 'PixelWorks',
    'team-polls': 'Team Polls'
  }
  return templates[templateId] || templateId
}