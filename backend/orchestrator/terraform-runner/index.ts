import { Handler } from 'aws-lambda'
import { DynamoDB, S3, ApiGatewayManagementApi } from 'aws-sdk'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Deployment, DeploymentStatus } from '../../libs/types'

const dynamodb = new DynamoDB.DocumentClient()
const s3 = new S3()

const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE!
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const TERRAFORM_BUCKET = process.env.TERRAFORM_BUCKET!
const CROSS_ACCOUNT_ROLE_PREFIX = process.env.CROSS_ACCOUNT_ROLE_PREFIX!
const TERRAFORM_WORK_DIR = process.env.TERRAFORM_WORK_DIR || '/tmp'
const TEMPLATE_SOURCE_DIR = process.env.TEMPLATE_SOURCE_DIR || '../../../templates'

interface TerraformRunnerEvent {
  deployment: Deployment
  action: 'init' | 'plan' | 'apply' | 'destroy'
}

export const handler: Handler<TerraformRunnerEvent> = async (event) => {
  const { deployment, action } = event
  
  // Input validation
  if (!deployment) {
    throw new Error('Missing required parameter: deployment')
  }
  
  if (!action || !['init', 'plan', 'apply', 'destroy'].includes(action)) {
    throw new Error('Invalid action parameter: must be "init", "plan", "apply", or "destroy"')
  }
  
  // Validate deployment object has required fields
  const requiredFields = ['id', 'templateId', 'parameters']
  for (const field of requiredFields) {
    if (!deployment[field]) {
      throw new Error(`Missing required deployment field: ${field}`)
    }
  }
  
  const workDir = `${TERRAFORM_WORK_DIR}/terraform-${deployment.id}`
  
  try {
    // Update deployment status
    await updateDeploymentStatus(deployment.id, 'IN_PROGRESS', `Running terraform ${action}`)
    
    // Notify via WebSocket
    await notifyConnections(deployment.id, {
      status: 'IN_PROGRESS',
      message: `Running terraform ${action}`,
      action
    })

    // Create working directory
    fs.mkdirSync(workDir, { recursive: true })
    
    // Download template from S3
    await downloadTemplate(deployment.templateId, workDir)
    
    // Create terraform.tfvars with deployment parameters
    createTfvarsFile(workDir, deployment)
    
    // Configure backend
    createBackendConfig(workDir, deployment)
    
    // Set AWS credentials for cross-account access if needed
    if (deployment.targetAccount) {
      process.env.AWS_ROLE_ARN = `${CROSS_ACCOUNT_ROLE_PREFIX}${deployment.targetAccount}`
      process.env.AWS_ROLE_SESSION_NAME = `deployment-${deployment.id}`
    }
    
    // Execute Terraform command
    let output = ''
    switch (action) {
      case 'init':
        output = execSync('terraform init -backend-config=backend.tfvars', { 
          cwd: workDir,
          encoding: 'utf8'
        })
        break
        
      case 'plan':
        output = execSync('terraform plan -var-file=terraform.tfvars -out=tfplan', { 
          cwd: workDir,
          encoding: 'utf8'
        })
        // Upload plan to S3
        await s3.upload({
          Bucket: TERRAFORM_BUCKET,
          Key: `plans/${deployment.id}/tfplan`,
          Body: fs.readFileSync(path.join(workDir, 'tfplan'))
        }).promise()
        break
        
      case 'apply':
        // Download plan from S3
        const planObject = await s3.getObject({
          Bucket: TERRAFORM_BUCKET,
          Key: `plans/${deployment.id}/tfplan`
        }).promise()
        fs.writeFileSync(path.join(workDir, 'tfplan'), planObject.Body as Buffer)
        
        output = execSync('terraform apply -auto-approve tfplan', { 
          cwd: workDir,
          encoding: 'utf8'
        })
        
        // Get outputs
        const outputs = execSync('terraform output -json', { 
          cwd: workDir,
          encoding: 'utf8'
        })
        
        // Update deployment with outputs
        await updateDeploymentOutputs(deployment.id, JSON.parse(outputs))
        break
        
      case 'destroy':
        output = execSync('terraform destroy -auto-approve -var-file=terraform.tfvars', { 
          cwd: workDir,
          encoding: 'utf8'
        })
        break
    }
    
    // Clean up
    fs.rmSync(workDir, { recursive: true, force: true })
    
    // Notify success
    await notifyConnections(deployment.id, {
      status: 'SUCCESS',
      message: `Terraform ${action} completed successfully`,
      action,
      output: output.substring(0, 1000) // Truncate for WebSocket
    })
    
    return {
      statusCode: 200,
      message: `Terraform ${action} completed successfully`
    }
    
  } catch (error) {
    console.error(`Error running terraform ${action}:`, error)
    
    // Update deployment status
    await updateDeploymentStatus(deployment.id, 'FAILED', error.message)
    
    // Notify failure
    await notifyConnections(deployment.id, {
      status: 'FAILED',
      message: `Terraform ${action} failed`,
      action,
      error: error.message
    })
    
    // Clean up
    try {
      fs.rmSync(workDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
    
    throw error
  }
}

async function downloadTemplate(templateId: string, workDir: string) {
  // For now, copy from local templates directory
  // In production, this would download from S3
  const templateDir = path.join(__dirname, `${TEMPLATE_SOURCE_DIR}/${templateId}`)
  
  // Copy all files from template to work directory
  const files = fs.readdirSync(templateDir)
  for (const file of files) {
    const src = path.join(templateDir, file)
    const dest = path.join(workDir, file)
    
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true })
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}

function createTfvarsFile(workDir: string, deployment: Deployment) {
  const tfvars = Object.entries(deployment.parameters)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key} = "${value}"`
      } else if (typeof value === 'boolean') {
        return `${key} = ${value}`
      } else if (typeof value === 'number') {
        return `${key} = ${value}`
      } else if (Array.isArray(value)) {
        const items = value.map(v => `"${v}"`).join(', ')
        return `${key} = [${items}]`
      } else {
        return `${key} = ${JSON.stringify(value)}`
      }
    })
    .join('\n')
  
  // Add common variables
  const commonVars = `
deployment_id = "${deployment.id}"
deployment_name = "${deployment.name}"
environment = "${process.env.ENVIRONMENT || 'dev'}"

tags = {
  DeploymentId = "${deployment.id}"
  Template = "${deployment.templateId}"
  CreatedBy = "${deployment.createdBy}"
  CreatedDate = "${deployment.createdAt.split('T')[0]}"
  Environment = "${process.env.ENVIRONMENT || 'dev'}"
  ${Object.entries(deployment.tags || {})
    .map(([k, v]) => `${k} = "${v}"`)
    .join('\n  ')}
}
`
  
  fs.writeFileSync(
    path.join(workDir, 'terraform.tfvars'),
    tfvars + '\n' + commonVars
  )
}

function createBackendConfig(workDir: string, deployment: Deployment) {
  const backendConfig = `
bucket = "${TERRAFORM_BUCKET}"
key    = "deployments/${deployment.id}/terraform.tfstate"
region = "${process.env.AWS_REGION || 'us-east-1'}"
dynamodb_table = "${process.env.TERRAFORM_LOCKS_TABLE}"
encrypt = true
`
  
  fs.writeFileSync(
    path.join(workDir, 'backend.tfvars'),
    backendConfig
  )
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

async function updateDeploymentOutputs(deploymentId: string, outputs: any) {
  await dynamodb.update({
    TableName: DEPLOYMENTS_TABLE,
    Key: { id: deploymentId },
    UpdateExpression: 'SET outputs = :outputs, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':outputs': outputs,
      ':updatedAt': new Date().toISOString()
    }
  }).promise()
}

async function notifyConnections(deploymentId: string, data: any) {
  try {
    // Get all active connections
    const connections = await dynamodb.scan({
      TableName: CONNECTIONS_TABLE
    }).promise()
    
    if (!connections.Items || connections.Items.length === 0) {
      return
    }
    
    // Create API Gateway Management API client
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: process.env.WEBSOCKET_ENDPOINT
    })
    
    // Send to all connections
    const postCalls = connections.Items.map(async ({ connectionId }) => {
      try {
        await apigwManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            deploymentId,
            ...data
          })
        }).promise()
      } catch (error) {
        if (error.statusCode === 410) {
          // Connection is stale, remove it
          await dynamodb.delete({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId }
          }).promise()
        }
      }
    })
    
    await Promise.all(postCalls)
  } catch (error) {
    console.error('Error notifying connections:', error)
    // Don't fail the deployment if notifications fail
  }
}