import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda'
import { DynamoDB, ApiGatewayManagementApi, StepFunctions } from 'aws-sdk'
import * as crypto from 'crypto'
import { 
  createSuccessResponse, 
  logError, 
  logInfo,
  ErrorResponses,
  ValidationError
} from '../../libs/error-handler'

const dynamodb = new DynamoDB.DocumentClient()
const stepfunctions = new StepFunctions()

const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const CORRELATION_TABLE = process.env.CORRELATION_TABLE!
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT!

type DeploymentStatus = 'PENDING' | 'INITIALIZING' | 'PLANNING' | 'DEPLOYING' | 'COMPLETED' | 'FAILED' | 'DESTROYING' | 'DESTROYED'

interface WebhookPayload {
  deploymentId: string
  status: DeploymentStatus
  message: string
  step?: string
  outputs?: Record<string, any>
  error?: string
  terraformOutput?: string
}

export const handler: Handler<APIGatewayProxyEvent> = async (event): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Hub-Signature-256',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
  }
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    }
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }
  
  try {
    // Verify webhook signature
    const signature = event.headers['X-Hub-Signature-256'] || event.headers['x-hub-signature-256']
    if (!signature) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Missing signature' })
      }
    }
    
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(event.body || '')
      .digest('hex')
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      }
    }
    
    // Parse webhook payload
    const payload: WebhookPayload = JSON.parse(event.body || '{}')
    
    if (!payload.deploymentId || !payload.status) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: deploymentId, status' })
      }
    }
    
    console.log(`Received webhook for deployment ${payload.deploymentId}: ${payload.status}`)
    
    // Update deployment status in DynamoDB
    await updateDeploymentStatus(payload)
    
    // Handle Step Functions callback for final states
    if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
      await handleStepFunctionsCallback(payload)
    }
    
    // Notify WebSocket connections
    await notifyConnections(payload)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Webhook processed successfully',
        deploymentId: payload.deploymentId,
        status: payload.status
      })
    }
    
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

async function updateDeploymentStatus(payload: WebhookPayload) {
  const updateExpression = ['SET #status = :status', 'updatedAt = :updatedAt']
  const expressionAttributeValues: any = {
    ':status': payload.status,
    ':updatedAt': new Date().toISOString()
  }
  const expressionAttributeNames: any = {
    '#status': 'status'
  }
  
  if (payload.message) {
    updateExpression.push('statusMessage = :message')
    expressionAttributeValues[':message'] = payload.message
  }
  
  if (payload.outputs) {
    updateExpression.push('outputs = :outputs')
    expressionAttributeValues[':outputs'] = payload.outputs
  }
  
  if (payload.error) {
    updateExpression.push('errorMessage = :error')
    expressionAttributeValues[':error'] = payload.error
  }
  
  if (payload.terraformOutput) {
    updateExpression.push('terraformOutput = :terraformOutput')
    expressionAttributeValues[':terraformOutput'] = payload.terraformOutput
  }
  
  if (payload.status === 'COMPLETED') {
    updateExpression.push('completedAt = :completedAt')
    expressionAttributeValues[':completedAt'] = new Date().toISOString()
  }
  
  await dynamodb.update({
    TableName: DEPLOYMENTS_TABLE,
    Key: { id: payload.deploymentId },
    UpdateExpression: updateExpression.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }).promise()
}

async function notifyConnections(payload: WebhookPayload) {
  try {
    // Get all active connections
    const connections = await dynamodb.scan({
      TableName: CONNECTIONS_TABLE
    }).promise()
    
    if (!connections.Items || connections.Items.length === 0) {
      console.log('No active WebSocket connections')
      return
    }
    
    // Create API Gateway Management API client
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: WEBSOCKET_ENDPOINT
    })
    
    // Send to all connections
    const postCalls = connections.Items.map(async ({ connectionId }) => {
      try {
        await apigwManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            deploymentId: payload.deploymentId,
            status: payload.status,
            message: payload.message,
            step: payload.step,
            outputs: payload.outputs,
            error: payload.error,
            terraformOutput: payload.terraformOutput?.substring(0, 1000) // Truncate for WebSocket
          })
        }).promise()
      } catch (error: any) {
        if (error.statusCode === 410) {
          // Connection is stale, remove it
          await dynamodb.delete({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId }
          }).promise()
        }
        console.error(`Error sending to connection ${connectionId}:`, error)
      }
    })
    
    await Promise.all(postCalls)
    console.log(`Notified ${connections.Items.length} WebSocket connections`)
  } catch (error) {
    console.error('Error notifying connections:', error)
    // Don't fail the webhook if notifications fail
  }
}

async function handleStepFunctionsCallback(payload: WebhookPayload) {
  try {
    // Get correlation data for this deployment
    const correlationResult = await dynamodb.get({
      TableName: CORRELATION_TABLE,
      Key: { deploymentId: payload.deploymentId }
    }).promise()
    
    if (!correlationResult.Item) {
      console.log(`No correlation data found for deployment ${payload.deploymentId}`)
      return
    }
    
    const { taskToken } = correlationResult.Item
    console.log(`Found correlation data for deployment ${payload.deploymentId}`)
    
    // Send success or failure to Step Functions
    if (payload.status === 'COMPLETED') {
      await stepfunctions.sendTaskSuccess({
        taskToken: taskToken,
        output: JSON.stringify({
          deploymentId: payload.deploymentId,
          status: payload.status,
          message: payload.message,
          outputs: payload.outputs,
          terraformOutput: payload.terraformOutput
        })
      }).promise()
      console.log(`Sent task success to Step Functions for deployment ${payload.deploymentId}`)
    } else if (payload.status === 'FAILED') {
      await stepfunctions.sendTaskFailure({
        taskToken: taskToken,
        error: 'DeploymentFailed',
        cause: payload.error || payload.message || 'GitHub Actions deployment failed'
      }).promise()
      console.log(`Sent task failure to Step Functions for deployment ${payload.deploymentId}`)
    }
    
    // Clean up correlation data
    await dynamodb.delete({
      TableName: CORRELATION_TABLE,
      Key: { deploymentId: payload.deploymentId }
    }).promise()
    console.log(`Cleaned up correlation data for deployment ${payload.deploymentId}`)
    
  } catch (error) {
    console.error(`Error handling Step Functions callback for deployment ${payload.deploymentId}:`, error)
    // Don't fail the webhook if Step Functions callback fails
  }
}