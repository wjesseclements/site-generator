"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dynamodb = new aws_sdk_1.DynamoDB.DocumentClient();
const s3 = new aws_sdk_1.S3();
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const TERRAFORM_BUCKET = process.env.TERRAFORM_BUCKET;
const CROSS_ACCOUNT_ROLE_PREFIX = process.env.CROSS_ACCOUNT_ROLE_PREFIX;
const handler = async (event) => {
    const { deployment, action } = event;
    const workDir = `/tmp/terraform-${deployment.id}`;
    // Add Lambda layer bin directory to PATH for Terraform binary
    process.env.PATH = `/opt/bin:${process.env.PATH}`;
    try {
        // Update deployment status
        await updateDeploymentStatus(deployment.id, 'DEPLOYING', `Running terraform ${action}`);
        // Notify via WebSocket
        await notifyConnections(deployment.id, {
            status: 'DEPLOYING',
            message: `Running terraform ${action}`,
            action
        });
        // Create working directory
        fs.mkdirSync(workDir, { recursive: true });
        // Download template from S3
        await downloadTemplate(deployment.templateId, workDir);
        // Create terraform.tfvars with deployment parameters
        createTfvarsFile(workDir, deployment);
        // Configure backend
        createBackendConfig(workDir, deployment);
        // Set AWS credentials for cross-account access if needed
        if (deployment.targetAccount) {
            process.env.AWS_ROLE_ARN = `${CROSS_ACCOUNT_ROLE_PREFIX}${deployment.targetAccount}`;
            process.env.AWS_ROLE_SESSION_NAME = `deployment-${deployment.id}`;
        }
        // Execute Terraform command
        let output = '';
        switch (action) {
            case 'init':
                output = (0, child_process_1.execSync)('terraform init -backend-config=backend.tfvars', {
                    cwd: workDir,
                    encoding: 'utf8'
                });
                break;
            case 'plan':
                output = (0, child_process_1.execSync)('terraform plan -var-file=terraform.tfvars -out=tfplan', {
                    cwd: workDir,
                    encoding: 'utf8'
                });
                // Upload plan to S3
                await s3.upload({
                    Bucket: TERRAFORM_BUCKET,
                    Key: `plans/${deployment.id}/tfplan`,
                    Body: fs.readFileSync(path.join(workDir, 'tfplan'))
                }).promise();
                break;
            case 'apply':
                // Download plan from S3
                const planObject = await s3.getObject({
                    Bucket: TERRAFORM_BUCKET,
                    Key: `plans/${deployment.id}/tfplan`
                }).promise();
                fs.writeFileSync(path.join(workDir, 'tfplan'), planObject.Body);
                output = (0, child_process_1.execSync)('terraform apply -auto-approve tfplan', {
                    cwd: workDir,
                    encoding: 'utf8'
                });
                // Get outputs
                const outputs = (0, child_process_1.execSync)('terraform output -json', {
                    cwd: workDir,
                    encoding: 'utf8'
                });
                // Update deployment with outputs
                await updateDeploymentOutputs(deployment.id, JSON.parse(outputs));
                break;
            case 'destroy':
                output = (0, child_process_1.execSync)('terraform destroy -auto-approve -var-file=terraform.tfvars', {
                    cwd: workDir,
                    encoding: 'utf8'
                });
                break;
        }
        // Clean up
        fs.rmSync(workDir, { recursive: true, force: true });
        // Notify success
        await notifyConnections(deployment.id, {
            status: 'SUCCESS',
            message: `Terraform ${action} completed successfully`,
            action,
            output: output.substring(0, 1000) // Truncate for WebSocket
        });
        return {
            statusCode: 200,
            message: `Terraform ${action} completed successfully`
        };
    }
    catch (error) {
        console.error(`Error running terraform ${action}:`, error);
        // Update deployment status
        await updateDeploymentStatus(deployment.id, 'FAILED', error.message);
        // Notify failure
        await notifyConnections(deployment.id, {
            status: 'FAILED',
            message: `Terraform ${action} failed`,
            action,
            error: error.message
        });
        // Clean up
        try {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
        catch (e) {
            // Ignore cleanup errors
        }
        throw error;
    }
};
exports.handler = handler;
async function downloadTemplate(templateId, workDir) {
    // Download template files from S3
    const templatePrefix = `templates/${templateId}/`;
    try {
        // List all files in the template directory
        const listResult = await s3.listObjectsV2({
            Bucket: TERRAFORM_BUCKET,
            Prefix: templatePrefix
        }).promise();
        if (!listResult.Contents || listResult.Contents.length === 0) {
            throw new Error(`No template files found for ${templateId}`);
        }
        // Download each file
        for (const object of listResult.Contents) {
            if (!object.Key)
                continue;
            // Skip directory entries (keys ending with /)
            if (object.Key.endsWith('/'))
                continue;
            // Calculate relative path within template
            const relativePath = object.Key.replace(templatePrefix, '');
            const targetPath = path.join(workDir, relativePath);
            // Create directory if needed
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            // Download file
            const fileObject = await s3.getObject({
                Bucket: TERRAFORM_BUCKET,
                Key: object.Key
            }).promise();
            // Write file to work directory
            fs.writeFileSync(targetPath, fileObject.Body);
            console.log(`Downloaded: ${relativePath}`);
        }
        console.log(`Successfully downloaded template: ${templateId}`);
    }
    catch (error) {
        console.error(`Error downloading template ${templateId}:`, error);
        throw new Error(`Failed to download template ${templateId}: ${error.message}`);
    }
}
function createTfvarsFile(workDir, deployment) {
    const tfvars = Object.entries(deployment.parameters)
        .map(([key, value]) => {
        if (typeof value === 'string') {
            return `${key} = "${value}"`;
        }
        else if (typeof value === 'boolean') {
            return `${key} = ${value}`;
        }
        else if (typeof value === 'number') {
            return `${key} = ${value}`;
        }
        else if (Array.isArray(value)) {
            const items = value.map(v => `"${v}"`).join(', ');
            return `${key} = [${items}]`;
        }
        else {
            return `${key} = ${JSON.stringify(value)}`;
        }
    })
        .join('\n');
    // Add common variables only if they're not already in parameters
    const paramKeys = Object.keys(deployment.parameters);
    const commonVarsLines = [];
    if (!paramKeys.includes('deployment_id')) {
        commonVarsLines.push(`deployment_id = "${deployment.id}"`);
    }
    if (!paramKeys.includes('site_name')) {
        commonVarsLines.push(`site_name = "${deployment.siteName}"`);
    }
    if (!paramKeys.includes('environment')) {
        commonVarsLines.push(`environment = "${process.env.ENVIRONMENT || 'dev'}"`);
    }
    // Always add tags since it's a complex object
    const tagsBlock = `tags = {
  DeploymentId = "${deployment.id}"
  Template = "${deployment.templateId}"
  CreatedBy = "${deployment.userId}"
  CreatedDate = "${deployment.createdAt.split('T')[0]}"
  Environment = "${process.env.ENVIRONMENT || 'dev'}"
  ${Object.entries(deployment.tags || {})
        .map(([k, v]) => `${k} = "${v}"`)
        .join('\n  ')}
}`;
    const allVars = [tfvars, ...commonVarsLines, tagsBlock].filter(Boolean).join('\n\n');
    fs.writeFileSync(path.join(workDir, 'terraform.tfvars'), allVars);
}
function createBackendConfig(workDir, deployment) {
    const backendConfig = `
bucket = "${TERRAFORM_BUCKET}"
key    = "deployments/${deployment.id}/terraform.tfstate"
region = "${process.env.AWS_REGION || 'us-east-1'}"
dynamodb_table = "${process.env.TERRAFORM_LOCKS_TABLE || ''}"
encrypt = true
`;
    fs.writeFileSync(path.join(workDir, 'backend.tfvars'), backendConfig);
}
async function updateDeploymentStatus(deploymentId, status, message) {
    const updateExpression = ['SET #status = :status', 'updatedAt = :updatedAt'];
    const expressionAttributeValues = {
        ':status': status,
        ':updatedAt': new Date().toISOString()
    };
    const expressionAttributeNames = {
        '#status': 'status'
    };
    if (message) {
        updateExpression.push('statusMessage = :message');
        expressionAttributeValues[':message'] = message;
    }
    if (status === 'COMPLETED') {
        updateExpression.push('completedAt = :completedAt');
        expressionAttributeValues[':completedAt'] = new Date().toISOString();
    }
    await dynamodb.update({
        TableName: DEPLOYMENTS_TABLE,
        Key: { id: deploymentId },
        UpdateExpression: updateExpression.join(', '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    }).promise();
}
async function updateDeploymentOutputs(deploymentId, outputs) {
    await dynamodb.update({
        TableName: DEPLOYMENTS_TABLE,
        Key: { id: deploymentId },
        UpdateExpression: 'SET outputs = :outputs, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
            ':outputs': outputs,
            ':updatedAt': new Date().toISOString()
        }
    }).promise();
}
async function notifyConnections(deploymentId, data) {
    try {
        // Get all active connections
        const connections = await dynamodb.scan({
            TableName: CONNECTIONS_TABLE
        }).promise();
        if (!connections.Items || connections.Items.length === 0) {
            return;
        }
        // Create API Gateway Management API client
        const apigwManagementApi = new aws_sdk_1.ApiGatewayManagementApi({
            apiVersion: '2018-11-29',
            endpoint: process.env.WEBSOCKET_ENDPOINT
        });
        // Send to all connections
        const postCalls = connections.Items.map(async ({ connectionId }) => {
            try {
                await apigwManagementApi.postToConnection({
                    ConnectionId: connectionId,
                    Data: JSON.stringify({
                        deploymentId,
                        ...data
                    })
                }).promise();
            }
            catch (error) {
                if (error.statusCode === 410) {
                    // Connection is stale, remove it
                    await dynamodb.delete({
                        TableName: CONNECTIONS_TABLE,
                        Key: { connectionId }
                    }).promise();
                }
            }
        });
        await Promise.all(postCalls);
    }
    catch (error) {
        console.error('Error notifying connections:', error);
        // Don't fail the deployment if notifications fail
    }
}
