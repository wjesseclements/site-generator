# Lambda execution role
resource "aws_iam_role" "lambda_execution" {
  name = "${local.resource_prefix}-lambda-execution"

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

# Lambda basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution.name
}

# Lambda DynamoDB access policy
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${local.resource_prefix}-lambda-dynamodb"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.deployments.arn,
          "${aws_dynamodb_table.deployments.arn}/index/*",
          aws_dynamodb_table.connections.arn,
          "${aws_dynamodb_table.connections.arn}/index/*"
        ]
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
        Effect = "Allow"
        Action = [
          "states:StartExecution",
          "states:DescribeExecution",
          "states:StopExecution"
        ]
        Resource = "arn:aws:states:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:stateMachine:${local.resource_prefix}-*"
      }
    ]
  })
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

# Terraform runner Lambda execution role with elevated permissions
resource "aws_iam_role" "terraform_runner_execution" {
  name = "${local.resource_prefix}-terraform-runner-execution"

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

# Terraform runner basic execution policy
resource "aws_iam_role_policy_attachment" "terraform_runner_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.terraform_runner_execution.name
}

# Terraform runner S3 access policy
resource "aws_iam_role_policy" "terraform_runner_s3" {
  name = "${local.resource_prefix}-terraform-runner-s3"
  role = aws_iam_role.terraform_runner_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.terraform_states.arn,
          "${aws_s3_bucket.terraform_states.arn}/*"
        ]
      }
    ]
  })
}

# Terraform runner DynamoDB access for state locking
resource "aws_iam_role_policy" "terraform_runner_dynamodb" {
  name = "${local.resource_prefix}-terraform-runner-dynamodb"
  role = aws_iam_role.terraform_runner_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })
}

# Terraform runner cross-account assume role policy
resource "aws_iam_role_policy" "terraform_runner_assume_role" {
  name = "${local.resource_prefix}-terraform-runner-assume-role"
  role = aws_iam_role.terraform_runner_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRole"
        Resource = "arn:aws:iam::*:role/${var.project_name}-deployment-role"
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