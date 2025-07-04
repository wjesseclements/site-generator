output "website_url" {
  description = "URL of the Data Explorer website"
  value       = "http://${aws_s3_bucket_website_configuration.data_explorer_site.website_endpoint}"
}

output "api_url" {
  description = "URL of the Data Explorer API"
  value       = aws_api_gateway_stage.data_explorer_api.invoke_url
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket hosting the website"
  value       = aws_s3_bucket.data_explorer_site.id
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.data_explorer_table.name
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.data_explorer_api.function_name
}

output "deployment_info" {
  description = "Deployment information"
  value = {
    deployment_id   = var.deployment_id
    deployment_name = var.deployment_name
    site_name       = var.site_name
    environment     = var.environment
  }
}