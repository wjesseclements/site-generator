"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const dynamodb = new aws_sdk_1.DynamoDB.DocumentClient();
const DEPLOYMENTS_TABLE = process.env.DEPLOYMENTS_TABLE;
const handler = async (event) => {
    var _a, _b, _c;
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    };
    try {
        // Get deployment ID from path parameters
        const deploymentId = (_a = event.pathParameters) === null || _a === void 0 ? void 0 : _a.deploymentId;
        if (!deploymentId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Deployment ID is required'
                })
            };
        }
        // Get user ID from Cognito authorizer
        const userId = ((_c = (_b = event.requestContext.authorizer) === null || _b === void 0 ? void 0 : _b.claims) === null || _c === void 0 ? void 0 : _c.sub) || 'test-user';
        // Get deployment from DynamoDB
        const result = await dynamodb.get({
            TableName: DEPLOYMENTS_TABLE,
            Key: {
                id: deploymentId
            }
        }).promise();
        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Deployment not found'
                })
            };
        }
        const deployment = result.Item;
        // Verify user owns this deployment
        if (deployment.userId !== userId) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    error: 'Access denied'
                })
            };
        }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                deployment
            })
        };
    }
    catch (error) {
        console.error('Error getting deployment:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to get deployment'
            })
        };
    }
};
exports.handler = handler;
