import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../index';

// Mock event helper
const createMockEvent = (body: any, userId: string = 'test-user-123'): APIGatewayProxyEvent => ({
  httpMethod: 'POST',
  path: '/deployments',
  body: JSON.stringify(body),
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: '/deployments',
  requestContext: {
    resourceId: 'test',
    resourcePath: '/deployments',
    httpMethod: 'POST',
    requestId: 'test-request',
    accountId: '123456789012',
    stage: 'dev',
    identity: {
      sourceIp: '127.0.0.1',
      userAgent: 'test',
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      user: null,
      userArn: null,
    },
    requestTimeEpoch: Date.now(),
    requestTime: new Date().toISOString(),
    apiId: 'test-api',
    protocol: 'HTTP/1.1',
    authorizer: {
      claims: {
        sub: userId,
        email: 'test@example.com'
      }
    }
  }
});

const mockContext: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'test-function',
  functionVersion: '1',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
  memoryLimitInMB: '512',
  awsRequestId: 'test-request-id',
  logGroupName: '/aws/lambda/test',
  logStreamName: 'test-stream',
  getRemainingTimeInMillis: () => 30000,
  done: jest.fn(),
  fail: jest.fn(),
  succeed: jest.fn(),
};

describe('Create Deployment Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create deployment successfully', async () => {
    const requestBody = {
      templateId: 'data-explorer',
      name: 'Test Deployment',
      parameters: {
        siteName: 'test-site',
        description: 'Test description'
      },
      tags: {
        Environment: 'test'
      }
    };

    const event = createMockEvent(requestBody);
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Content-Type': 'application/json'
    });

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('id');
    expect(responseBody).toHaveProperty('status', 'PENDING');
    expect(responseBody).toHaveProperty('templateId', 'data-explorer');
    expect(responseBody).toHaveProperty('name', 'Test Deployment');
  });

  test('should return 400 for missing required fields', async () => {
    const requestBody = {
      // Missing templateId and name
      parameters: {}
    };

    const event = createMockEvent(requestBody);
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error');
  });

  test('should return 400 for invalid template ID', async () => {
    const requestBody = {
      templateId: 'invalid-template',
      name: 'Test Deployment',
      parameters: {}
    };

    const event = createMockEvent(requestBody);
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toContain('Invalid template');
  });

  test('should handle missing authorization context', async () => {
    const requestBody = {
      templateId: 'data-explorer',
      name: 'Test Deployment',
      parameters: {}
    };

    const event = createMockEvent(requestBody);
    // Remove authorization context
    delete event.requestContext.authorizer;

    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(401);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Unauthorized');
  });

  test('should handle DynamoDB errors gracefully', async () => {
    // Mock DynamoDB to throw an error
    const AWS = require('aws-sdk');
    const mockPut = AWS.DynamoDB.DocumentClient().put;
    mockPut.mockImplementationOnce(() => ({
      promise: () => Promise.reject(new Error('DynamoDB error'))
    }));

    const requestBody = {
      templateId: 'data-explorer',
      name: 'Test Deployment',
      parameters: {}
    };

    const event = createMockEvent(requestBody);
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Internal server error');
  });
});