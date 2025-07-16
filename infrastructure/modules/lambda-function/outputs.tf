output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.this.invoke_arn
}

output "qualified_arn" {
  description = "Qualified ARN of the Lambda function"
  value       = aws_lambda_function.this.qualified_arn
}

output "version" {
  description = "Version of the Lambda function"
  value       = aws_lambda_function.this.version
}

# AWS Best Practice: Additional useful outputs
output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.arn
}

output "source_code_size" {
  description = "Size of the Lambda deployment package in bytes"
  value       = aws_lambda_function.this.source_code_size
}

output "last_modified" {
  description = "Date the function was last modified"
  value       = aws_lambda_function.this.last_modified
}

output "architectures" {
  description = "Instruction set architecture used by the function"
  value       = aws_lambda_function.this.architectures
}