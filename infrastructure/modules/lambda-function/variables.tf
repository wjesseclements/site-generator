variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "handler" {
  description = "Lambda function handler"
  type        = string
  default     = "index.handler"
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"  # AWS Best Practice: Use latest stable runtime
}

variable "memory_size" {
  description = "Lambda memory size"
  type        = number
  default     = 512
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 300
}

# AWS Best Practice: S3 artifact variables
variable "s3_bucket" {
  description = "S3 bucket containing the Lambda deployment package"
  type        = string
}

variable "s3_key" {
  description = "S3 key of the Lambda deployment package"
  type        = string
}

variable "source_code_hash" {
  description = "Base64-encoded SHA256 hash of the deployment package"
  type        = string
  default     = null
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "role_arn" {
  description = "IAM role ARN for the Lambda function"
  type        = string
}

variable "tags" {
  description = "Tags to apply to the Lambda function"
  type        = map(string)
  default     = {}
}

variable "reserved_concurrent_executions" {
  description = "Reserved concurrent executions for the Lambda function"
  type        = number
  default     = -1
}

# AWS Best Practice: Additional optimization variables
variable "architectures" {
  description = "Instruction set architecture for Lambda function"
  type        = list(string)
  default     = ["arm64"]  # AWS Best Practice: ARM64 for cost savings
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"
  validation {
    condition     = contains(["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"], var.log_level)
    error_message = "Log level must be one of: TRACE, DEBUG, INFO, WARN, ERROR, FATAL."
  }
}

variable "enable_tracing" {
  description = "Enable X-Ray tracing"
  type        = bool
  default     = true
}

variable "ephemeral_storage_size" {
  description = "Amount of ephemeral storage (/tmp) in MB"
  type        = number
  default     = 1024  # AWS Best Practice: Start with 1GB
  validation {
    condition     = var.ephemeral_storage_size >= 512 && var.ephemeral_storage_size <= 10240
    error_message = "Ephemeral storage size must be between 512 MB and 10,240 MB."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "log_kms_key_id" {
  description = "KMS key ID for CloudWatch log encryption"
  type        = string
  default     = null
}

variable "enable_error_queries" {
  description = "Enable CloudWatch Insights error queries"
  type        = bool
  default     = true
}

variable "enable_performance_queries" {
  description = "Enable CloudWatch Insights performance queries"
  type        = bool
  default     = true
}

# AWS Best Practice: Code signing configuration
variable "code_signing_config_arn" {
  description = "ARN of the code signing configuration for the Lambda function"
  type        = string
  default     = null
}