variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "site-generator"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "frontend_domain" {
  description = "Domain name for the frontend (optional)"
  type        = string
  default     = ""
}

variable "allowed_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["http://localhost:3000", "http://localhost:3001"]
}

variable "log_retention_days" {
  description = "CloudWatch logs retention in days"
  type        = number
  default     = 7
}

variable "lambda_memory_size" {
  description = "Memory size for Lambda functions"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 300
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for production resources"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

locals {
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      CreatedBy   = "site-generator"
    },
    var.tags
  )
  
  resource_prefix = "${var.project_name}-${var.environment}"
}