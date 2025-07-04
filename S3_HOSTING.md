# S3 Hosting Feature

## Overview
S3-based static website hosting providing scalable, cost-effective web hosting for both the platform frontend and deployed template websites. Includes proper security policies and website configuration.

## Core Functionality
- Static website hosting with public read access
- Terraform state file storage with versioning
- Template artifact and deployment package storage
- Automatic website configuration and routing
- Cost-optimized storage classes
- Security policies and access control

## Files
- `/infrastructure/s3.tf` - S3 bucket configurations
- `/templates/data-explorer/main.tf` - Template-specific S3 setup
- `/frontend/out/` - Built static website files

## S3 Buckets

### Frontend Hosting (`site-generator-dev-frontend`)
```hcl
resource "aws_s3_bucket" "frontend" {
  bucket = "${local.resource_prefix}-frontend"
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  
  index_document {
    suffix = "index.html"
  }
  
  error_document {
    key = "404.html"
  }
}
```

### Terraform State Storage (`site-generator-dev-terraform-states`)
```hcl
resource "aws_s3_bucket" "terraform_states" {
  bucket = "${local.resource_prefix}-terraform-states"
}

resource "aws_s3_bucket_versioning" "terraform_states" {
  bucket = aws_s3_bucket.terraform_states.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

### Lambda Deployments (`site-generator-dev-lambda-deployments`)
- Stores deployment packages and artifacts
- Template files and configurations
- Lambda function ZIP files

## Website Configuration
- **Index Document**: `index.html` for main entry point
- **Error Document**: `404.html` for not found pages
- **Public Read Policy**: Allows public access to website content
- **CORS Configuration**: Enables cross-origin requests from frontend

## Security Features
- Bucket-level encryption for sensitive data
- IAM policies for least-privilege access
- Public read-only access for website content
- Private access for state files and artifacts
- Server access logging for audit trails

## Frontend Deployment Process
1. **Build**: Next.js static export generates optimized files
2. **Upload**: AWS CLI syncs files to S3 bucket
3. **Configure**: Website hosting settings applied automatically
4. **Access**: Public URL provides immediate access

```bash
# Deployment command
npm run build:static
aws s3 sync out/ s3://site-generator-dev-frontend/ --delete
```

## Template Website Hosting
Each deployed template creates its own S3 bucket:
- Unique bucket name with deployment ID
- Template-specific website files
- Automatic DNS and routing configuration
- Cost tracking via resource tags

## Integration Points
- Hosts platform frontend for user access
- Stores Terraform state for infrastructure management
- Hosts deployed template websites
- Provides artifact storage for deployment packages