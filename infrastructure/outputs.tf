output "frontend_url" {
  description = "URL of the frontend S3 website"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "api_gateway_url" {
  description = "URL of the REST API Gateway"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "websocket_url" {
  description = "URL of the WebSocket API"
  value       = aws_apigatewayv2_stage.websocket.invoke_url
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.web_client.id
}

output "cognito_identity_pool_id" {
  description = "ID of the Cognito Identity Pool"
  value       = aws_cognito_identity_pool.main.id
}

output "cognito_hosted_ui_domain" {
  description = "Domain for Cognito Hosted UI"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "deployment_table_name" {
  description = "Name of the deployments DynamoDB table"
  value       = aws_dynamodb_table.deployments.name
}

output "connections_table_name" {
  description = "Name of the connections DynamoDB table"
  value       = aws_dynamodb_table.connections.name
}

output "terraform_state_bucket" {
  description = "Name of the S3 bucket for Terraform states"
  value       = aws_s3_bucket.terraform_states.id
}

output "lambda_deployment_bucket" {
  description = "Name of the S3 bucket for Lambda deployments"
  value       = aws_s3_bucket.lambda_deployments.id
}

output "step_functions_arn" {
  description = "ARN of the deployment orchestrator Step Functions state machine"
  value       = aws_sfn_state_machine.deployment_orchestrator.arn
}

output "deployment_instructions" {
  description = "Instructions for deploying the frontend"
  value = <<-EOT
    To deploy the frontend:
    1. Build the Next.js app: cd ../frontend && npm run build
    2. Upload to S3: aws s3 sync out/ s3://${aws_s3_bucket.frontend.id}/ --delete
    3. Access the site at: ${aws_s3_bucket_website_configuration.frontend.website_endpoint}
    
    To configure the frontend:
    1. Update frontend/.env.local with:
       NEXT_PUBLIC_API_URL=${aws_api_gateway_stage.main.invoke_url}
       NEXT_PUBLIC_WEBSOCKET_URL=${aws_apigatewayv2_stage.websocket.invoke_url}
       NEXT_PUBLIC_USER_POOL_ID=${aws_cognito_user_pool.main.id}
       NEXT_PUBLIC_USER_POOL_CLIENT_ID=${aws_cognito_user_pool_client.web_client.id}
       NEXT_PUBLIC_IDENTITY_POOL_ID=${aws_cognito_identity_pool.main.id}
       NEXT_PUBLIC_REGION=${var.aws_region}
  EOT
}