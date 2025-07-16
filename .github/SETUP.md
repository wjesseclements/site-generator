# GitHub Actions Setup Guide

This guide explains how to configure GitHub repository secrets and settings for the Site Generator CI/CD pipeline.

## Required Repository Secrets

Configure these secrets in your GitHub repository settings under **Settings > Secrets and variables > Actions**:

### AWS Configuration
- `AWS_ACCOUNT_ID`: Your AWS account ID (12-digit number)
- `AWS_REGION`: AWS region for deployments (e.g., `us-east-1`)

### S3 Buckets
- `TERRAFORM_STATE_BUCKET`: S3 bucket for Terraform state storage
- `TERRAFORM_LOCKS_TABLE`: DynamoDB table for Terraform state locking
- `LAMBDA_DEPLOYMENT_BUCKET`: S3 bucket for Lambda deployment artifacts
- `FRONTEND_DEPLOYMENT_BUCKET`: S3 bucket for frontend static site hosting

### Infrastructure Secrets
- `GITHUB_TOKEN_FOR_DISPATCH`: GitHub personal access token for repository dispatch events
- `GITHUB_WEBHOOK_SECRET`: Webhook secret for GitHub Actions callbacks

## OIDC Configuration

The workflows use OpenID Connect (OIDC) for secure, temporary AWS credentials. Ensure your Terraform includes:

```hcl
# In infrastructure/iam.tf
variable "enable_github_actions" {
  description = "Enable GitHub Actions OIDC provider and role"
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
  default     = "your-org/site-generator"
}
```

## Repository Settings

### Branch Protection Rules
Configure these rules for the `main` branch:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Required status checks:
  - `validate-backend`
  - `validate-frontend` 
  - `validate-infrastructure`

### Environment Configuration
Create these GitHub environments with protection rules:

#### Development
- No protection rules (auto-deploy)
- Environment secrets: development-specific values

#### Staging  
- Required reviewers: 1 person
- Environment secrets: staging-specific values

#### Production
- Required reviewers: 2 people
- Deployment branches: `main` only
- Environment secrets: production-specific values

## Setup Instructions

1. **Copy secrets from existing Terraform:**
   ```bash
   cd infrastructure
   terraform output -json > ../github-secrets.json
   ```

2. **Configure GitHub repository secrets** using the output values

3. **Update terraform.tfvars:**
   ```hcl
   enable_github_actions = true
   github_repository = "your-org/site-generator"
   ```

4. **Apply Terraform changes:**
   ```bash
   terraform plan -var-file=terraform.tfvars
   terraform apply
   ```

5. **Test workflows** by creating a pull request

## Troubleshooting

### Common Issues

**OIDC Authentication Fails:**
- Verify `github_repository` variable matches your repo
- Check AWS trust policy includes correct GitHub repository
- Ensure OIDC provider is properly configured

**S3 Access Denied:**
- Verify bucket names in secrets match actual bucket names
- Check IAM permissions for GitHub Actions role
- Ensure buckets exist in the correct AWS region

**Terraform State Lock:**
- DynamoDB table must exist before first run
- Check table name matches `TERRAFORM_LOCKS_TABLE` secret
- Verify read/write permissions on the table

### Getting Help

1. Check GitHub Actions logs for detailed error messages
2. Verify all required secrets are configured
3. Test individual workflow steps locally when possible
4. Review AWS CloudTrail logs for permission issues