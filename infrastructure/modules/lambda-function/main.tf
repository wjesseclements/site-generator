# AWS Best Practice: Lambda function with S3 artifacts and optimizations
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  handler       = var.handler
  runtime       = var.runtime
  role          = var.role_arn

  # AWS Best Practice: Use S3 artifacts instead of local files
  s3_bucket        = var.s3_bucket
  s3_key          = var.s3_key
  source_code_hash = var.source_code_hash

  # AWS Best Practice: ARM64 for 20% cost reduction
  architectures = var.architectures

  memory_size                    = var.memory_size
  timeout                        = var.timeout
  reserved_concurrent_executions = var.reserved_concurrent_executions

  # AWS Best Practice: Enhanced logging configuration
  logging_config {
    log_format            = "JSON"
    application_log_level = var.log_level
    system_log_level      = "WARN"
  }

  # AWS Best Practice: X-Ray tracing for observability
  tracing_config {
    mode = var.enable_tracing ? "Active" : "PassThrough"
  }

  # AWS Best Practice: Optimized ephemeral storage
  ephemeral_storage {
    size = var.ephemeral_storage_size
  }

  environment {
    variables = var.environment_variables
  }

  # AWS Best Practice: Code signing for enhanced security
  code_signing_config_arn = var.code_signing_config_arn

  tags = var.tags

  # Ensure proper dependencies
  depends_on = [aws_cloudwatch_log_group.lambda]
}

# AWS Best Practice: Pre-created log group with proper retention
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.log_kms_key_id

  tags = merge(var.tags, {
    Component = "Lambda"
    Function  = var.function_name
  })
}

# AWS Best Practice: CloudWatch Insights query for troubleshooting
resource "aws_cloudwatch_query_definition" "lambda_errors" {
  count = var.enable_error_queries ? 1 : 0
  
  name = "${var.function_name}-errors"
  
  log_group_names = [aws_cloudwatch_log_group.lambda.name]
  
  query_string = <<EOF
fields @timestamp, @message, @requestId
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
EOF
}

# AWS Best Practice: Performance insights query
resource "aws_cloudwatch_query_definition" "lambda_performance" {
  count = var.enable_performance_queries ? 1 : 0
  
  name = "${var.function_name}-performance"
  
  log_group_names = [aws_cloudwatch_log_group.lambda.name]
  
  query_string = <<EOF
fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| filter @type = "REPORT"
| stats avg(@duration), max(@duration), avg(@maxMemoryUsed), max(@maxMemoryUsed) by bin(5m)
EOF
}

