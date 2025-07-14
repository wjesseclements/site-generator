# AWS Best Practice: Lambda execution role with enhanced security
resource "aws_iam_role" "lambda_execution" {
  name = "${local.resource_prefix}-lambda-execution"
  path = "/lambda/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Condition = {
          "StringEquals" = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })

  # AWS Best Practice: Force MFA for sensitive operations
  permissions_boundary = var.environment == "prod" ? aws_iam_policy.lambda_permissions_boundary[0].arn : null

  tags = local.common_tags
}

# AWS Best Practice: Permissions boundary for production security
resource "aws_iam_policy" "lambda_permissions_boundary" {
  count = var.environment == "prod" ? 1 : 0
  
  name        = "${local.resource_prefix}-lambda-permissions-boundary"
  path        = "/security/"
  description = "Permissions boundary for Lambda functions in production"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "states:StartExecution",
          "states:DescribeExecution",
          "apigateway:POST",
          "execute-api:ManageConnections",
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      {
        Effect = "Deny"
        Action = [
          "iam:*",
          "organizations:*",
          "account:*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = local.common_tags
}

# Enhanced Lambda execution policy with X-Ray tracing
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution.name
}

# AWS Best Practice: X-Ray tracing permissions
resource "aws_iam_role_policy_attachment" "lambda_xray_tracing" {
  count      = var.enable_lambda_tracing ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
  role       = aws_iam_role.lambda_execution.name
}

# AWS Best Practice: Least privilege DynamoDB access with conditions
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${local.resource_prefix}-lambda-dynamodb"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.deployments.arn,
          "${aws_dynamodb_table.deployments.arn}/index/*",
          aws_dynamodb_table.connections.arn,
          "${aws_dynamodb_table.connections.arn}/index/*",
          aws_dynamodb_table.deployment_correlation.arn,
          "${aws_dynamodb_table.deployment_correlation.arn}/index/*"
        ]
        Condition = {
          "StringEquals" = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      {
        Sid    = "DynamoDBScanLimited"
        Effect = "Allow"
        Action = [
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.deployments.arn,
          aws_dynamodb_table.connections.arn
        ]
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:ProjectionExpression" = [
              "id",
              "templateName", 
              "status",
              "createdAt"
            ]
          }
          "NumericLessThan" = {
            "dynamodb:ReturnedItemCount" = "50"
          }
        }
      }
    ]
  })
}

# Lambda Step Functions access policy
resource "aws_iam_role_policy" "lambda_step_functions" {
  name = "${local.resource_prefix}-lambda-stepfunctions"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "StepFunctionsExecution"
        Effect = "Allow"
        Action = [
          "states:StartExecution",
          "states:DescribeExecution",
          "states:StopExecution"
        ]
        Resource = "arn:aws:states:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:stateMachine:${local.resource_prefix}-*"
        Condition = {
          "StringEquals" = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}

# AWS Best Practice: WebSocket API Gateway permissions for Lambda
resource "aws_iam_role_policy" "lambda_websocket_api" {
  name = "${local.resource_prefix}-lambda-websocket-api"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "WebSocketAPIAccess"
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*/*/POST/@connections/*"
        Condition = {
          "StringEquals" = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}

# AWS Best Practice: Lambda code signing configuration (optional)
resource "aws_lambda_code_signing_config" "this" {
  count = var.enable_code_signing ? 1 : 0

  allowed_publishers {
    signing_profile_version_arns = var.code_signing_profile_arns
  }

  policies {
    untrusted_artifact_on_deployment = "Warn"  # Set to "Enforce" for production
  }

  description = "Code signing configuration for ${local.resource_prefix} Lambda functions"

  tags = local.common_tags
}

# Step Functions execution role
resource "aws_iam_role" "step_functions_execution" {
  name = "${local.resource_prefix}-stepfunctions-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "states.amazonaws.com"
        }
      }
    ]
  })
}

# Step Functions Lambda invoke policy
resource "aws_iam_role_policy" "step_functions_lambda" {
  name = "${local.resource_prefix}-stepfunctions-lambda"
  role = aws_iam_role.step_functions_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:function:${local.resource_prefix}-*"
      }
    ]
  })
}

# GitHub dispatch Lambda execution role
resource "aws_iam_role" "github_dispatch_execution" {
  name = "${local.resource_prefix}-github-dispatch-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# GitHub dispatch Lambda basic execution policy
resource "aws_iam_role_policy_attachment" "github_dispatch_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.github_dispatch_execution.name
}

# GitHub dispatch Lambda DynamoDB access policy
resource "aws_iam_role_policy" "github_dispatch_dynamodb" {
  name = "${local.resource_prefix}-github-dispatch-dynamodb"
  role = aws_iam_role.github_dispatch_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.deployments.arn
        ]
      }
    ]
  })
}


# API Gateway CloudWatch role
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${local.resource_prefix}-api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

# API Gateway CloudWatch policy
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
  role       = aws_iam_role.api_gateway_cloudwatch.name
}