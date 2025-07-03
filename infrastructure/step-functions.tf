# Step Functions state machine for deployment orchestration
resource "aws_sfn_state_machine" "deployment_orchestrator" {
  name     = "${local.resource_prefix}-deployment-orchestrator"
  role_arn = aws_iam_role.step_functions_execution.arn

  definition = jsonencode({
    Comment = "Orchestrates the deployment of site templates"
    StartAt = "UpdateDeploymentStatus"
    States = {
      UpdateDeploymentStatus = {
        Type = "Task"
        Resource = "arn:aws:states:::dynamodb:updateItem"
        Parameters = {
          TableName = aws_dynamodb_table.deployments.name
          Key = {
            id = {
              "S.$" = "$.id"
            }
          }
          UpdateExpression = "SET #status = :status, #updatedAt = :updatedAt"
          ExpressionAttributeNames = {
            "#status" = "status"
            "#updatedAt" = "updatedAt"
          }
          ExpressionAttributeValues = {
            ":status" = {
              S = "INITIALIZING"
            }
            ":updatedAt" = {
              "S.$" = "$$.State.EnteredTime"
            }
          }
        }
        Next = "InitializeTerraform"
        ResultPath = "$.updateResult"
      }

      InitializeTerraform = {
        Type = "Task"
        Resource = module.terraform_runner_lambda.function_arn
        Parameters = {
          "deployment.$" = "$"
          "action" = "init"
        }
        Next = "PlanTerraform"
        Retry = [
          {
            ErrorEquals = ["States.TaskFailed"]
            IntervalSeconds = 2
            MaxAttempts = 3
            BackoffRate = 2
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next = "MarkDeploymentFailed"
          }
        ]
      }

      PlanTerraform = {
        Type = "Task"
        Resource = module.terraform_runner_lambda.function_arn
        Parameters = {
          "deployment.$" = "$"
          "action" = "plan"
        }
        Next = "ApplyTerraform"
        Retry = [
          {
            ErrorEquals = ["States.TaskFailed"]
            IntervalSeconds = 2
            MaxAttempts = 3
            BackoffRate = 2
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next = "MarkDeploymentFailed"
          }
        ]
      }

      ApplyTerraform = {
        Type = "Task"
        Resource = module.terraform_runner_lambda.function_arn
        Parameters = {
          "deployment.$" = "$"
          "action" = "apply"
        }
        Next = "MarkDeploymentCompleted"
        Retry = [
          {
            ErrorEquals = ["States.TaskFailed"]
            IntervalSeconds = 2
            MaxAttempts = 3
            BackoffRate = 2
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.ALL"]
            Next = "MarkDeploymentFailed"
          }
        ]
      }

      MarkDeploymentCompleted = {
        Type = "Task"
        Resource = "arn:aws:states:::dynamodb:updateItem"
        Parameters = {
          TableName = aws_dynamodb_table.deployments.name
          Key = {
            id = {
              "S.$" = "$.id"
            }
          }
          UpdateExpression = "SET #status = :status, #updatedAt = :updatedAt, #completedAt = :completedAt"
          ExpressionAttributeNames = {
            "#status" = "status"
            "#updatedAt" = "updatedAt"
            "#completedAt" = "completedAt"
          }
          ExpressionAttributeValues = {
            ":status" = {
              S = "COMPLETED"
            }
            ":updatedAt" = {
              "S.$" = "$$.State.EnteredTime"
            }
            ":completedAt" = {
              "S.$" = "$$.State.EnteredTime"
            }
          }
        }
        End = true
      }

      MarkDeploymentFailed = {
        Type = "Task"
        Resource = "arn:aws:states:::dynamodb:updateItem"
        Parameters = {
          TableName = aws_dynamodb_table.deployments.name
          Key = {
            id = {
              "S.$" = "$.id"
            }
          }
          UpdateExpression = "SET #status = :status, #updatedAt = :updatedAt, #error = :error"
          ExpressionAttributeNames = {
            "#status" = "status"
            "#updatedAt" = "updatedAt"
            "#error" = "error"
          }
          ExpressionAttributeValues = {
            ":status" = {
              S = "FAILED"
            }
            ":updatedAt" = {
              "S.$" = "$$.State.EnteredTime"
            }
            ":error" = {
              "S.$" = "$.Error"
            }
          }
        }
        End = true
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.step_functions.arn}:*"
    include_execution_data = true
    level                  = "ERROR"
  }

  tags = local.common_tags
}

# CloudWatch Log Group for Step Functions
resource "aws_cloudwatch_log_group" "step_functions" {
  name              = "/aws/stepfunctions/${local.resource_prefix}-deployment-orchestrator"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

# IAM policy for Step Functions to write to CloudWatch Logs
resource "aws_iam_role_policy" "step_functions_cloudwatch" {
  name = "${local.resource_prefix}-stepfunctions-cloudwatch"
  role = aws_iam_role.step_functions_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.step_functions.arn}:*"
      }
    ]
  })
}

# IAM policy for Step Functions to access DynamoDB
resource "aws_iam_role_policy" "step_functions_dynamodb" {
  name = "${local.resource_prefix}-stepfunctions-dynamodb"
  role = aws_iam_role.step_functions_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.deployments.arn
      }
    ]
  })
}