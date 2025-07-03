provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# S3 bucket for Terraform state (optional - for production use)
# terraform {
#   backend "s3" {
#     bucket         = "site-generator-terraform-state"
#     key            = "platform/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "site-generator-terraform-locks"
#     encrypt        = true
#   }
# }

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}