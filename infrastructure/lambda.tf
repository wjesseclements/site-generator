# Lambda function for creating deployments
module "create_deployment_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-create-deployment"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout
  source_path   = "../backend/api/create-deployment"
  role_arn      = aws_iam_role.lambda_execution.arn

  environment_variables = {
    DEPLOYMENTS_TABLE  = aws_dynamodb_table.deployments.name
    STEP_FUNCTIONS_ARN = aws_sfn_state_machine.deployment_orchestrator.arn
    ENVIRONMENT        = var.environment
  }

  tags = local.common_tags
}

# Lambda function for getting deployments
module "get_deployments_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-get-deployments"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = var.lambda_memory_size
  timeout       = 60
  source_path   = "../backend/api/get-deployments"
  role_arn      = aws_iam_role.lambda_execution.arn

  environment_variables = {
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    ENVIRONMENT       = var.environment
  }

  tags = local.common_tags
}

# Lambda function for getting single deployment
module "get_deployment_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-get-deployment"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = var.lambda_memory_size
  timeout       = 60
  source_path   = "../backend/api/get-deployment"
  role_arn      = aws_iam_role.lambda_execution.arn

  environment_variables = {
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    ENVIRONMENT       = var.environment
  }

  tags = local.common_tags
}

# Lambda function for running Terraform
module "terraform_runner_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-terraform-runner"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 3008  # Maximum memory for better performance
  timeout       = 900   # 15 minutes maximum
  source_path   = "../backend/orchestrator/terraform-runner"
  role_arn      = aws_iam_role.terraform_runner_execution.arn

  environment_variables = {
    DEPLOYMENTS_TABLE      = aws_dynamodb_table.deployments.name
    CONNECTIONS_TABLE      = aws_dynamodb_table.connections.name
    TERRAFORM_BUCKET       = aws_s3_bucket.terraform_states.id
    TERRAFORM_LOCKS_TABLE  = aws_dynamodb_table.terraform_locks.name
    WEBSOCKET_ENDPOINT     = "${aws_apigatewayv2_api.websocket.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.environment}"
    CROSS_ACCOUNT_ROLE_PREFIX = "arn:aws:iam::"
    ENVIRONMENT           = var.environment
  }

  tags = local.common_tags
}

# Lambda function for WebSocket connections
module "websocket_connect_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-websocket-connect"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 256
  timeout       = 30
  source_path   = "../backend/websocket/connect"
  role_arn      = aws_iam_role.lambda_execution.arn

  environment_variables = {
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    ENVIRONMENT       = var.environment
  }

  tags = local.common_tags
}

# Lambda function for WebSocket disconnections
module "websocket_disconnect_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-websocket-disconnect"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 256
  timeout       = 30
  source_path   = "../backend/websocket/disconnect"
  role_arn      = aws_iam_role.lambda_execution.arn

  environment_variables = {
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    ENVIRONMENT       = var.environment
  }

  tags = local.common_tags
}

# Lambda function for WebSocket status updates
module "websocket_status_lambda" {
  source = "./modules/lambda-function"

  function_name = "${local.resource_prefix}-websocket-status"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 256
  timeout       = 30
  source_path   = "../backend/websocket/status"
  role_arn      = aws_iam_role.lambda_execution.arn

  environment_variables = {
    CONNECTIONS_TABLE = aws_dynamodb_table.connections.name
    DEPLOYMENTS_TABLE = aws_dynamodb_table.deployments.name
    ENVIRONMENT       = var.environment
  }

  tags = local.common_tags
}

# Grant Step Functions permission to invoke Terraform runner
resource "aws_lambda_permission" "step_functions_invoke_terraform_runner" {
  statement_id  = "AllowStepFunctionsInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.terraform_runner_lambda.function_name
  principal     = "states.amazonaws.com"
  source_arn    = aws_sfn_state_machine.deployment_orchestrator.arn
}