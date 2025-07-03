variable "deployment_id" {
  description = "Unique identifier for this deployment"
  type        = string
}

variable "deployment_name" {
  description = "Name of the deployment"
  type        = string
}

variable "site_name" {
  description = "Name of the Data Explorer site"
  type        = string
}

variable "site_description" {
  description = "Description of the Data Explorer site"
  type        = string
  default     = "Interactive database dashboard with query interface"
}

variable "admin_email" {
  description = "Email address of the site administrator"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "enable_timestamp_sorting" {
  description = "Enable timestamp-based sorting for records"
  type        = bool
  default     = true
}

variable "enable_category_index" {
  description = "Enable category-based indexing for faster queries"
  type        = bool
  default     = true
}

variable "max_query_results" {
  description = "Maximum number of results to return per query"
  type        = number
  default     = 100
}

variable "enable_data_export" {
  description = "Enable CSV/JSON export functionality"
  type        = bool
  default     = true
}

variable "enable_api_key" {
  description = "Require API key for data modifications"
  type        = bool
  default     = false
}

variable "allowed_origins" {
  description = "Allowed CORS origins for API access"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}