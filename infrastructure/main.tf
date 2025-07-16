provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# S3 bucket for Terraform state (separate keys for local vs GitHub Actions)
terraform {
  backend "s3" {
    bucket         = "site-generator-dev-terraform-states"
    key            = "local/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "site-generator-dev-terraform-locks"
    encrypt        = true
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}