# DynamoDB table for correlating Step Functions executions with GitHub Actions workflows
resource "aws_dynamodb_table" "deployment_correlation" {
  name           = "${local.resource_prefix}-deployment-correlation"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "deploymentId"

  attribute {
    name = "deploymentId"
    type = "S"
  }

  # TTL for automatic cleanup of old correlation records
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = local.common_tags
}

# IAM policy for Lambda functions to access correlation table
resource "aws_iam_role_policy" "lambda_correlation_access" {
  name = "${local.resource_prefix}-lambda-correlation-access"
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
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.deployment_correlation.arn
      }
    ]
  })
}

# IAM policy for GitHub dispatch Lambda to access correlation table
resource "aws_iam_role_policy" "github_dispatch_correlation_access" {
  name = "${local.resource_prefix}-github-dispatch-correlation-access"
  role = aws_iam_role.github_dispatch_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.deployment_correlation.arn
      }
    ]
  })
}

# IAM policy for Step Functions to send task success/failure
resource "aws_iam_role_policy" "step_functions_task_callback" {
  name = "${local.resource_prefix}-stepfunctions-task-callback"
  role = aws_iam_role.step_functions_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "states:SendTaskSuccess",
          "states:SendTaskFailure",
          "states:SendTaskHeartbeat"
        ]
        Resource = "*"
      }
    ]
  })
}