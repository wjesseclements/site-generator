terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# S3 bucket for the web application
resource "aws_s3_bucket" "data_explorer_site" {
  bucket = "${var.site_name}-data-explorer-${var.deployment_id}"

  tags = merge(var.tags, {
    Name = "${var.site_name} Data Explorer"
    Type = "Website"
  })
}

# S3 bucket website configuration
resource "aws_s3_bucket_website_configuration" "data_explorer_site" {
  bucket = aws_s3_bucket.data_explorer_site.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

# S3 bucket public access block (disabled for website hosting)
resource "aws_s3_bucket_public_access_block" "data_explorer_site" {
  bucket = aws_s3_bucket.data_explorer_site.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket policy for public read access
resource "aws_s3_bucket_policy" "data_explorer_site" {
  bucket = aws_s3_bucket.data_explorer_site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.data_explorer_site.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.data_explorer_site]
}

# DynamoDB table for data storage
resource "aws_dynamodb_table" "data_explorer_table" {
  name         = "${var.site_name}-data-explorer-${var.deployment_id}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  range_key    = var.enable_timestamp_sorting ? "timestamp" : null

  attribute {
    name = "id"
    type = "S"
  }

  dynamic "attribute" {
    for_each = var.enable_timestamp_sorting ? [1] : []
    content {
      name = "timestamp"
      type = "N"
    }
  }

  # Global secondary index for category queries
  dynamic "global_secondary_index" {
    for_each = var.enable_category_index ? [1] : []
    content {
      name            = "CategoryIndex"
      hash_key        = "category"
      projection_type = "ALL"
    }
  }

  dynamic "attribute" {
    for_each = var.enable_category_index ? [1] : []
    content {
      name = "category"
      type = "S"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.site_name} Data Explorer Table"
  })
}

# Lambda function for API backend
resource "aws_lambda_function" "data_explorer_api" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.site_name}-data-explorer-api-${var.deployment_id}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  memory_size      = 512
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.data_explorer_table.name
      CORS_ORIGIN = "https://${aws_s3_bucket_website_configuration.data_explorer_site.website_endpoint}"
    }
  }

  tags = merge(var.tags, {
    Name = "${var.site_name} Data Explorer API"
  })
}

# API Gateway for the Lambda function
resource "aws_api_gateway_rest_api" "data_explorer_api" {
  name        = "${var.site_name}-data-explorer-api-${var.deployment_id}"
  description = "API for ${var.site_name} Data Explorer"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway resources
resource "aws_api_gateway_resource" "data" {
  rest_api_id = aws_api_gateway_rest_api.data_explorer_api.id
  parent_id   = aws_api_gateway_rest_api.data_explorer_api.root_resource_id
  path_part   = "data"
}

resource "aws_api_gateway_resource" "query" {
  rest_api_id = aws_api_gateway_rest_api.data_explorer_api.id
  parent_id   = aws_api_gateway_rest_api.data_explorer_api.root_resource_id
  path_part   = "query"
}

# API Gateway methods
resource "aws_api_gateway_method" "get_data" {
  rest_api_id   = aws_api_gateway_rest_api.data_explorer_api.id
  resource_id   = aws_api_gateway_resource.data.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "post_data" {
  rest_api_id   = aws_api_gateway_rest_api.data_explorer_api.id
  resource_id   = aws_api_gateway_resource.data.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "post_query" {
  rest_api_id   = aws_api_gateway_rest_api.data_explorer_api.id
  resource_id   = aws_api_gateway_resource.query.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway integrations
resource "aws_api_gateway_integration" "get_data" {
  rest_api_id = aws_api_gateway_rest_api.data_explorer_api.id
  resource_id = aws_api_gateway_resource.data.id
  http_method = aws_api_gateway_method.get_data.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.data_explorer_api.invoke_arn
}

resource "aws_api_gateway_integration" "post_data" {
  rest_api_id = aws_api_gateway_rest_api.data_explorer_api.id
  resource_id = aws_api_gateway_resource.data.id
  http_method = aws_api_gateway_method.post_data.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.data_explorer_api.invoke_arn
}

resource "aws_api_gateway_integration" "post_query" {
  rest_api_id = aws_api_gateway_rest_api.data_explorer_api.id
  resource_id = aws_api_gateway_resource.query.id
  http_method = aws_api_gateway_method.post_query.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.data_explorer_api.invoke_arn
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "data_explorer_api" {
  rest_api_id = aws_api_gateway_rest_api.data_explorer_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.data.id,
      aws_api_gateway_resource.query.id,
      aws_api_gateway_method.get_data.id,
      aws_api_gateway_method.post_data.id,
      aws_api_gateway_method.post_query.id,
      aws_api_gateway_integration.get_data.id,
      aws_api_gateway_integration.post_data.id,
      aws_api_gateway_integration.post_query.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "data_explorer_api" {
  deployment_id = aws_api_gateway_deployment.data_explorer_api.id
  rest_api_id   = aws_api_gateway_rest_api.data_explorer_api.id
  stage_name    = var.environment
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.data_explorer_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.data_explorer_api.execution_arn}/*/*"
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_execution" {
  name = "${var.site_name}-data-explorer-lambda-${var.deployment_id}"

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

  tags = var.tags
}

# IAM policy for Lambda to access DynamoDB
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.site_name}-data-explorer-dynamodb-${var.deployment_id}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.data_explorer_table.arn,
          "${aws_dynamodb_table.data_explorer_table.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_execution.name
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.data_explorer_api.function_name}"
  retention_in_days = 7

  tags = var.tags
}

# Create Lambda deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda.zip"

  source {
    content  = file("${path.module}/lambda/index.js")
    filename = "index.js"
  }
}

# Upload static website files to S3
resource "aws_s3_object" "website_files" {
  for_each = fileset("${path.module}/website/", "**/*")

  bucket = aws_s3_bucket.data_explorer_site.id
  key    = each.value
  source = "${path.module}/website/${each.value}"
  etag   = filemd5("${path.module}/website/${each.value}")

  content_type = lookup({
    "html" = "text/html",
    "css"  = "text/css",
    "js"   = "application/javascript",
    "json" = "application/json",
    "png"  = "image/png",
    "jpg"  = "image/jpeg",
    "jpeg" = "image/jpeg",
    "gif"  = "image/gif",
    "svg"  = "image/svg+xml",
    "ico"  = "image/x-icon"
  }, split(".", each.value)[length(split(".", each.value)) - 1], "binary/octet-stream")
}