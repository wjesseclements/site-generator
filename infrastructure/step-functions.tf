# Step Functions state machine for deployment orchestration
resource "aws_sfn_state_machine" "deployment_orchestrator" {
  name     = "${local.resource_prefix}-deployment-orchestrator"
  role_arn = aws_iam_role.step_functions_execution.arn

  definition = jsonencode({
    Comment = "Orchestrates the deployment of site templates"
    StartAt = "UpdateDeploymentStatus"
    States = {
      UpdateDeploymentStatus = {
        Type     = "Task"
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
            "#status"    = "status"
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
        Next       = "TriggerGitHubActions"
        ResultPath = "$.updateResult"
      }

      TriggerGitHubActions = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke.waitForTaskToken"
        Parameters = {
          FunctionName = module.github_dispatch_lambda.function_name
          Payload = {
            "TaskToken.$"  = "$$.Task.Token"
            "deployment.$" = "$"
            "action"       = "deploy"
          }
        }
        TimeoutSeconds = 3600
        Next           = "MarkDeploymentCompleted"
        ResultPath     = "$.githubResult"
        Retry = [
          {
            ErrorEquals     = ["States.TaskFailed"]
            IntervalSeconds = 5
            MaxAttempts     = 3
            BackoffRate     = 2
          }
        ]
        Catch = [
          {
            ErrorEquals = ["States.Timeout"]
            Next        = "HandleTimeout"
            ResultPath  = "$.error"
          },
          {
            ErrorEquals = ["States.ALL"]
            Next        = "MarkDeploymentFailed"
            ResultPath  = "$.error"
          }
        ]
      }

      HandleTimeout = {
        Type     = "Task"
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
            "#status"    = "status"
            "#updatedAt" = "updatedAt"
            "#error"     = "error"
          }
          ExpressionAttributeValues = {
            ":status" = {
              S = "FAILED"
            }
            ":updatedAt" = {
              "S.$" = "$$.State.EnteredTime"
            }
            ":error" = {
              S = "Deployment timed out after 1 hour"
            }
          }
        }
        End = true
      }

      MarkDeploymentCompleted = {
        Type     = "Task"
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
            "#status"      = "status"
            "#updatedAt"   = "updatedAt"
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
        Type     = "Task"
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
            "#status"    = "status"
            "#updatedAt" = "updatedAt"
            "#error"     = "error"
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

  # logging_configuration {
  #   log_destination        = "${aws_cloudwatch_log_group.step_functions.arn}:*"
  #   include_execution_data = true
  #   level                  = "ALL"
  # }

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