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

variable "enable_github_actions" {
  description = "Enable GitHub Actions OIDC provider and role"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = "wjesseclements/site-generator"
}

variable "cross_account_external_id" {
  description = "External ID for cross-account role assumption"
  type        = string
  default     = "site-generator-deployment"
}

variable "github_token" {
  description = "GitHub personal access token for repository dispatch"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_repo_owner" {
  description = "GitHub repository owner/organization"
  type        = string
  default     = "wjesseclements"
}

variable "github_repo_name" {
  description = "GitHub repository name for infrastructure templates"
  type        = string
  default     = "site-generator-infrastructure"
}

variable "github_webhook_secret" {
  description = "Secret for GitHub webhook verification"
  type        = string
  default     = ""
  sensitive   = true
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