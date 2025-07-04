// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      put: jest.fn(() => ({
        promise: jest.fn(() => Promise.resolve({}))
      })),
      get: jest.fn(() => ({
        promise: jest.fn(() => Promise.resolve({ Item: {} }))
      })),
      query: jest.fn(() => ({
        promise: jest.fn(() => Promise.resolve({ Items: [] }))
      })),
      update: jest.fn(() => ({
        promise: jest.fn(() => Promise.resolve({}))
      }))
    }))
  },
  StepFunctions: jest.fn(() => ({
    startExecution: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({ executionArn: 'test-arn' }))
    }))
  }))
}));

// Mock environment variables
process.env.DEPLOYMENTS_TABLE = 'test-deployments-table';
process.env.STEP_FUNCTION_ARN = 'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';