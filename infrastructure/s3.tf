# S3 bucket for frontend hosting
resource "aws_s3_bucket" "frontend" {
  bucket = "${local.resource_prefix}-frontend"

  lifecycle {
    prevent_destroy = false # Set to true for production
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket website configuration
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# S3 bucket policy for public read
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# S3 bucket for Lambda deployment packages
resource "aws_s3_bucket" "lambda_deployments" {
  bucket = "${local.resource_prefix}-lambda-deployments"

  lifecycle {
    prevent_destroy = false
  }
}

# S3 bucket versioning for Lambda deployments
resource "aws_s3_bucket_versioning" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket for Terraform state files (for deployed sites)
resource "aws_s3_bucket" "terraform_states" {
  bucket = "${local.resource_prefix}-terraform-states"

  lifecycle {
    prevent_destroy = false
  }
}

# S3 bucket versioning for Terraform states
resource "aws_s3_bucket_versioning" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}