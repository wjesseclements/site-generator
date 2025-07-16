import { APIGatewayProxyResult } from 'aws-lambda'

// Standard CORS headers for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Content-Type': 'application/json'
}

// Error response structure
interface ErrorResponse {
  error: string
  code?: string
  details?: any
}

/**
 * Creates a standardized error response for API Gateway
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  code?: string,
  details?: any
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: message
  }

  if (code) {
    errorResponse.code = code
  }

  if (details) {
    errorResponse.details = details
  }

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(errorResponse)
  }
}

/**
 * Creates a standardized success response for API Gateway
 */
export function createSuccessResponse(
  statusCode: number,
  data: any
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  }
}

/**
 * Creates a standardized WebSocket response
 */
export function createWebSocketResponse(
  statusCode: number,
  message?: string
): { statusCode: number; body?: string } {
  const response: { statusCode: number; body?: string } = {
    statusCode
  }

  if (message) {
    response.body = JSON.stringify({ message })
  }

  return response
}

/**
 * Standard error codes for consistent error handling
 */
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED'
}

/**
 * Common error response generators
 */
export const ErrorResponses = {
  badRequest: (message: string, details?: any) => 
    createErrorResponse(400, message, ErrorCodes.VALIDATION_ERROR, details),
  
  unauthorized: (message: string = 'Unauthorized: Missing or invalid authentication token') => 
    createErrorResponse(401, message, ErrorCodes.UNAUTHORIZED),
  
  forbidden: (message: string = 'Forbidden: Insufficient permissions') => 
    createErrorResponse(403, message, ErrorCodes.FORBIDDEN),
  
  notFound: (message: string = 'Resource not found') => 
    createErrorResponse(404, message, ErrorCodes.NOT_FOUND),
  
  conflict: (message: string, details?: any) => 
    createErrorResponse(409, message, ErrorCodes.CONFLICT, details),
  
  internalError: (message: string = 'Internal server error') => 
    createErrorResponse(500, message, ErrorCodes.INTERNAL_ERROR),
  
  timeout: (message: string = 'Request timeout') => 
    createErrorResponse(504, message, ErrorCodes.TIMEOUT),
  
  rateLimited: (message: string = 'Rate limit exceeded') => 
    createErrorResponse(429, message, ErrorCodes.RATE_LIMITED)
}

/**
 * Logs error with structured format
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: Record<string, any>
): void {
  const errorInfo = {
    context,
    message: error.message || 'Unknown error',
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  }

  console.error('Error:', JSON.stringify(errorInfo, null, 2))
}

/**
 * Logs info with structured format
 */
export function logInfo(
  context: string,
  message: string,
  additionalInfo?: Record<string, any>
): void {
  const info = {
    context,
    message,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  }

  console.info('Info:', JSON.stringify(info, null, 2))
}

/**
 * Wrapper for handling Lambda function errors consistently
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R | APIGatewayProxyResult> {
  return async (...args: T): Promise<R | APIGatewayProxyResult> => {
    try {
      return await fn(...args)
    } catch (error) {
      logError(context, error, { args })
      
      // Return appropriate error response based on error type
      if (error.name === 'ValidationError') {
        return ErrorResponses.badRequest(error.message, error.details)
      }
      
      if (error.name === 'UnauthorizedError') {
        return ErrorResponses.unauthorized(error.message)
      }
      
      if (error.name === 'NotFoundError') {
        return ErrorResponses.notFound(error.message)
      }
      
      // Default to internal server error
      return ErrorResponses.internalError()
    }
  }
}

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  public details?: any
  
  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  public details?: any
  
  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ConflictError'
    this.details = details
  }
}

export class DatabaseError extends Error {
  public details?: any
  
  constructor(message: string, details?: any) {
    super(message)
    this.name = 'DatabaseError' 
    this.details = details
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Main error handler function for Lambda functions
 */
export function handleError(context: string, error: any): APIGatewayProxyResult {
  logError(context, error)
  
  // Handle specific error types
  if (error instanceof ValidationError) {
    return ErrorResponses.badRequest(error.message, error.details)
  }
  
  if (error instanceof AuthenticationError || error instanceof UnauthorizedError) {
    return ErrorResponses.unauthorized(error.message)
  }
  
  if (error instanceof NotFoundError) {
    return ErrorResponses.notFound(error.message)
  }
  
  if (error instanceof ConflictError) {
    return ErrorResponses.conflict(error.message, error.details)
  }
  
  if (error instanceof DatabaseError) {
    return ErrorResponses.internalError(`Database error: ${error.message}`)
  }
  
  // Default to internal server error
  return ErrorResponses.internalError()
}