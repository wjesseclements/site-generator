# AWS Best Practice: Lambda functions with S3 artifacts and optimizations

# Local values for artifact naming
locals {
  lambda_functions = {
    "create-deployment"     = "api"
    "get-deployment"       = "api"
    "get-deployments"      = "api"
    "github-dispatch"      = "orchestrator"
    "github-webhook"       = "api"
    "websocket-connect"    = "websocket"
    "websocket-disconnect" = "websocket"
    "websocket-status"     = "websocket"
  }
}

# Lambda function for creating deployments
module "create_deployment_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-create-deployment"
  handler       = "index.handler"
  runtime       = "nodejs20.x"  # AWS Best Practice: Latest stable runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  
  # AWS Best Practice: S3 artifacts instead of local build
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "api/create-deployment/${var.lambda_artifact_version}.zip"
  source_code_hash = null  # Will be updated by CI/CD pipeline
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    DEPLOYMENTS_TABLE  = aws_dynamodb_table.deployments.name
    STATE_MACHINE_ARN  = aws_sfn_state_machine.deployment_orchestrator.arn
    ENVIRONMENT        = var.environment
    LOG_LEVEL          = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for getting deployments
module "get_deployments_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-get-deployments"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = var.lambda_memory_size
  timeout       = 60
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "api/get-deployments/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    ENVIRONMENT       = var.environment
    LOG_LEVEL         = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for getting single deployment
module "get_deployment_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-get-deployment"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = var.lambda_memory_size
  timeout       = 60
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "api/get-deployment/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    ENVIRONMENT       = var.environment
    LOG_LEVEL         = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for GitHub repository dispatch
module "github_dispatch_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-github-dispatch"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = 256
  timeout       = 60
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "orchestrator/github-dispatch/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.github_dispatch_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    DEPLOYMENTS_TABLE       = aws_dynamodb_table.deployments.name
    CORRELATION_TABLE       = aws_dynamodb_table.deployment_correlation.name
    GITHUB_TOKEN_SECRET_ARN = aws_secretsmanager_secret.github_token.arn
    GITHUB_REPO_OWNER       = var.github_repo_owner
    GITHUB_REPO_NAME        = var.github_repo_name
    WEBHOOK_ENDPOINT        = "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}/github-webhook"
    ENVIRONMENT             = var.environment
    LOG_LEVEL               = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for WebSocket connections
module "websocket_connect_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-websocket-connect"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = 256
  timeout       = 30
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "websocket/connect/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    ENVIRONMENT       = var.environment
    LOG_LEVEL         = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for WebSocket disconnections
module "websocket_disconnect_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-websocket-disconnect"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = 256
  timeout       = 30
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "websocket/disconnect/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    ENVIRONMENT       = var.environment
    LOG_LEVEL         = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for WebSocket status updates
module "websocket_status_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-websocket-status"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = 256
  timeout       = 30
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "websocket/status/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    ENVIRONMENT       = var.environment
    LOG_LEVEL         = var.lambda_log_level
  }

  tags = local.common_tags
}

# Lambda function for GitHub webhook
module "github_webhook_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-github-webhook"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  memory_size   = 256
  timeout       = 60
  
  # AWS Best Practice: S3 artifacts
  s3_bucket        = aws_s3_bucket.lambda_deployments.bucket
  s3_key          = "api/github-webhook/${var.lambda_artifact_version}.zip"
  source_code_hash = null
  
  role_arn = aws_iam_role.lambda_execution.arn

  # AWS Best Practice: Enhanced configuration
  enable_tracing           = var.enable_lambda_tracing
  log_level               = var.lambda_log_level
  log_retention_days      = var.log_retention_days
  reserved_concurrent_executions = -1  # Disabled for testing
  
  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.enable_code_signing ? aws_lambda_code_signing_config.this[0].arn : null

  environment_variables = {
    DEPLOYMENTS_TABLE  = aws_dynamodb_table.deployments.name
    CONNECTIONS_TABLE  = aws_dynamodb_table.connections.name
    CORRELATION_TABLE  = aws_dynamodb_table.deployment_correlation.name
    WEBHOOK_SECRET     = var.github_webhook_secret
    WEBSOCKET_ENDPOINT = aws_apigatewayv2_stage.websocket.invoke_url
    ENVIRONMENT        = var.environment
    LOG_LEVEL          = var.lambda_log_level
  }

  tags = local.common_tags
}

# Grant Step Functions permission to invoke GitHub dispatch
resource "aws_lambda_permission" "step_functions_invoke_github_dispatch" {
  statement_id  = "AllowStepFunctionsInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.github_dispatch_lambda.function_name
  principal     = "states.amazonaws.com"
  source_arn    = aws_sfn_state_machine.deployment_orchestrator.arn
}

# AWS Best Practice: CloudWatch metric filters for monitoring
resource "aws_cloudwatch_log_metric_filter" "lambda_errors" {
  for_each = local.lambda_functions

  name           = "${local.resource_prefix}-${each.key}-errors"
  log_group_name = "/aws/lambda/${local.resource_prefix}-${each.key}"
  pattern        = "ERROR"

  metric_transformation {
    name      = "${each.key}_errors"
    namespace = "${var.project_name}/${var.environment}/lambda"
    value     = "1"
  }

  depends_on = [
    module.create_deployment_lambda,
    module.get_deployment_lambda,
    module.get_deployments_lambda,
    module.github_dispatch_lambda,
    module.github_webhook_lambda,
    module.websocket_connect_lambda,
    module.websocket_disconnect_lambda,
    module.websocket_status_lambda
  ]
}

# AWS Best Practice: CloudWatch alarms for Lambda errors
resource "aws_cloudwatch_metric_alarm" "lambda_error_rate" {
  for_each = local.lambda_functions

  alarm_name          = "${local.resource_prefix}-${each.key}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "${each.key}_errors"
  namespace           = "${var.project_name}/${var.environment}/lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors error rate for ${each.key} lambda function"
  alarm_actions       = []  # Add SNS topic ARN for notifications

  tags = local.common_tags
}