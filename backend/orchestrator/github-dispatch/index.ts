import { Handler } from 'aws-lambda'
import { DynamoDB, SecretsManager } from 'aws-sdk'
import fetch from 'node-fetch'
import { Deployment, DeploymentStatus } from '../../libs/types'

const dynamodb = new DynamoDB.DocumentClient()
const secretsManager = new SecretsManager()

const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!
const CORRELATION_TABLE = process.env.CORRELATION_TABLE!
const GITHUB_TOKEN_SECRET_ARN = process.env.GITHUB_TOKEN_SECRET_ARN!
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER!
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME!
const WEBHOOK_ENDPOINT = process.env.WEBHOOK_ENDPOINT!
const ENVIRONMENT = process.env.ENVIRONMENT!

// Cache token for Lambda container reuse
let cachedToken: string | null = null
let tokenExpiry: number = 0

async function getGitHubToken(): Promise<string> {
  const now = Date.now()
  
  // Return cached token if still valid (cache for 5 minutes)
  if (cachedToken && tokenExpiry > now) {
    return cachedToken
  }
  
  try {
    const result = await secretsManager.getSecretValue({
      SecretId: GITHUB_TOKEN_SECRET_ARN
    }).promise()
    
    if (!result.SecretString) {
      throw new Error('Secret value is empty')
    }
    
    const secret = JSON.parse(result.SecretString)
    cachedToken = secret.token
    tokenExpiry = now + (5 * 60 * 1000) // 5 minutes
    
    console.log('Successfully retrieved GitHub token from Secrets Manager')
    return cachedToken
  } catch (error) {
    console.error('Failed to retrieve GitHub token from Secrets Manager:', error)
    throw new Error('Unable to authenticate with GitHub')
  }
}

interface GitHubDispatchEvent {
  TaskToken?: string
  deployment: Deployment
  action: 'deploy' | 'destroy'
}

export const handler: Handler<GitHubDispatchEvent> = async (event) => {
  const { TaskToken, deployment, action } = event
  
  // Input validation
  if (!deployment) {
    throw new Error('Missing required parameter: deployment')
  }
  
  if (!action || !['deploy', 'destroy'].includes(action)) {
    throw new Error('Invalid action parameter: must be "deploy" or "destroy"')
  }
  
  // Validate deployment object has required fields
  const requiredFields = ['id', 'userId', 'templateId', 'siteName', 'parameters', 'createdAt', 'tags']
  for (const field of requiredFields) {
    if (!deployment[field]) {
      throw new Error(`Missing required deployment field: ${field}`)
    }
  }
  
  try {
    // Update deployment status to indicate GitHub Actions is being triggered
    await updateDeploymentStatus(deployment.id, 'INITIALIZING', `Triggering GitHub Actions for ${action}`)
    
    // Get GitHub token from Secrets Manager
    const GITHUB_TOKEN = await getGitHubToken()
    
    // Prepare GitHub repository dispatch payload (max 10 properties)
    const dispatchPayload = {
      event_type: 'infrastructure-deployment',
      client_payload: {
        deploymentId: deployment.id,
        action: action,
        templateName: deployment.templateId, // GitHub Actions expects templateName with templateId format
        siteName: deployment.siteName,
        environment: ENVIRONMENT,
        parameters: deployment.parameters,
        userId: deployment.userId,
        createdAt: deployment.createdAt,
        callbackUrl: WEBHOOK_ENDPOINT,
        tags: {
          ...deployment.tags,
          DeploymentId: deployment.id,
          Template: deployment.templateId,
          CreatedBy: deployment.userId,
          CreatedDate: deployment.createdAt.split('T')[0],
          Environment: ENVIRONMENT
        }
      }
    }
    
    // Trigger GitHub repository dispatch
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Site-Generator-Platform'
        },
        body: JSON.stringify(dispatchPayload)
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    console.log(`Successfully triggered GitHub Actions for deployment ${deployment.id}`)
    
    // Store correlation data for Step Functions callback (if TaskToken provided)
    if (TaskToken) {
      await storeCorrelationData(deployment.id, TaskToken)
      console.log(`Stored correlation data for deployment ${deployment.id}`)
    }
    
    // Update deployment status to indicate GitHub Actions has been triggered
    await updateDeploymentStatus(
      deployment.id, 
      'PLANNING', 
      `GitHub Actions workflow triggered for ${action}`
    )
    
    return {
      statusCode: 200,
      message: `GitHub Actions workflow triggered successfully for ${action}`,
      deploymentId: deployment.id
    }
    
  } catch (error: any) {
    console.error(`Error triggering GitHub Actions for deployment ${deployment.id}:`, error)
    
    // Update deployment status to failed
    await updateDeploymentStatus(
      deployment.id, 
      'FAILED', 
      `Failed to trigger GitHub Actions: ${error.message}`
    )
    
    throw error
  }
}

async function updateDeploymentStatus(
  deploymentId: string, 
  status: DeploymentStatus, 
  message?: string
) {
  const updateExpression = ['SET #status = :status', 'updatedAt = :updatedAt']
  const expressionAttributeValues: any = {
    ':status': status,
    ':updatedAt': new Date().toISOString()
  }
  const expressionAttributeNames: any = {
    '#status': 'status'
  }
  
  if (message) {
    updateExpression.push('statusMessage = :message')
    expressionAttributeValues[':message'] = message
  }
  
  if (status === 'COMPLETED') {
    updateExpression.push('completedAt = :completedAt')
    expressionAttributeValues[':completedAt'] = new Date().toISOString()
  }
  
  await dynamodb.update({
    TableName: DEPLOYMENTS_TABLE,
    Key: { id: deploymentId },
    UpdateExpression: updateExpression.join(', '),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }).promise()
}

async function storeCorrelationData(deploymentId: string, taskToken: string) {
  // Store correlation data with TTL of 4 hours (in case deployment gets stuck)
  const ttl = Math.floor(Date.now() / 1000) + (4 * 60 * 60)
  
  await dynamodb.put({
    TableName: CORRELATION_TABLE,
    Item: {
      deploymentId: deploymentId,
      taskToken: taskToken,
      createdAt: new Date().toISOString(),
      ttl: ttl
    }
  }).promise()
}