# Site Generator Platform Deployment Guide

This guide covers deploying the Site Generator Platform to AWS using proper IAM roles instead of temporary credentials.

## Prerequisites

1. **AWS CLI**: Installed and configured with your credentials
2. **Terraform**: Version 1.5+ installed
3. **Node.js**: Version 18+ installed
4. **jq**: JSON processor (for parsing AWS responses)

## Quick Start

### Option 1: Automated Deployment with IAM Roles (Recommended)

```bash
# 1. Set up IAM roles
./setup-iam.sh

# 2. Deploy the platform
./deploy-with-role.sh
```

### Option 2: Manual Steps

If you prefer to understand each step:

#### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI (if not already done)
aws configure

# Verify your identity
aws sts get-caller-identity
```

#### Step 2: Create IAM Deployment Role

```bash
# Run the IAM setup script
./setup-iam.sh
```

This creates:
- `site-generator-terraform-deploy` role for infrastructure deployment
- Optional GitHub Actions OIDC provider and role
- Cross-account deployment role template

#### Step 3: Deploy Infrastructure

```bash
# Deploy with proper role assumption
./deploy-with-role.sh
```

This script will:
1. Assume the deployment role for secure access
2. Deploy all AWS infrastructure using Terraform
3. Build and deploy Lambda functions
4. Build and deploy the frontend to S3
5. Configure CORS and other settings

## Deployment Architecture

### IAM Roles and Security

- **Deployment Role**: `site-generator-terraform-deploy`
  - Used for deploying infrastructure
  - Has PowerUserAccess + IAMFullAccess
  - Can be assumed by your AWS user

- **Lambda Execution Roles**: Created automatically
  - Minimal permissions for each function
  - Separate roles for different Lambda functions

- **Cross-Account Roles**: Template provided
  - For deploying to multiple AWS accounts
  - Uses external ID for additional security

### Infrastructure Components

- **Frontend**: Next.js app deployed to S3 static website
- **API**: API Gateway + Lambda functions
- **Database**: DynamoDB tables for deployments and connections
- **Real-time**: WebSocket API for deployment status
- **Authentication**: Cognito User Pool and Identity Pool
- **Orchestration**: Step Functions for deployment workflows

## GitHub Actions (Optional)

To set up automated deployment via GitHub Actions:

1. Run `./setup-iam.sh` and choose "yes" for GitHub Actions
2. Deploy once manually to create the OIDC provider
3. Add `AWS_ACCOUNT_ID` secret to your GitHub repository
4. Push to `main` or `dev` branch to trigger deployment

## Environment Variables

The deployment script creates a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=https://your-api-gateway-url/dev
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-url/dev
NEXT_PUBLIC_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_USER_POOL_CLIENT_ID=xxxxxxxxx
NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:xxxxxxxx
NEXT_PUBLIC_REGION=us-east-1
```

## Post-Deployment Setup

### Create Test User

```bash
# Create a test user in Cognito
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username testuser@example.com \
  --user-attributes Name=email,Value=testuser@example.com \
  --temporary-password TempPass123!
```

### Test the Platform

1. Visit the frontend URL provided in the deployment output
2. Sign in with your test user credentials
3. Select a template (Data Explorer)
4. Configure parameters and deploy
5. Watch real-time deployment status updates

## Security Considerations

### Corporate Network Access

To restrict access to corporate networks only:

1. **S3 Bucket Policy**: Add IP restrictions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
        }
      }
    }
  ]
}
```

2. **API Gateway Resource Policy**: Add IP restrictions
3. **CloudFront + WAF**: For more advanced filtering

### Production Hardening

- [ ] Replace PowerUserAccess with custom minimal policies
- [ ] Enable MFA for role assumption
- [ ] Use AWS Secrets Manager for sensitive configuration
- [ ] Enable CloudTrail for audit logging
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategies for DynamoDB
- [ ] Enable VPC endpoints for private communication

## Troubleshooting

### Common Issues

**Terraform state conflicts:**
```bash
# If you get state lock errors
terraform force-unlock LOCK_ID
```

**Lambda function updates fail:**
```bash
# Clear function cache and redeploy
aws lambda delete-function --function-name FUNCTION_NAME
terraform apply -replace="module.LAMBDA_MODULE.aws_lambda_function.function"
```

**Frontend not updating:**
```bash
# Clear CloudFront cache if using CloudFront
aws cloudfront create-invalidation --distribution-id ID --paths "/*"

# Or force S3 sync
aws s3 sync frontend/out/ s3://BUCKET_NAME/ --delete --cache-control "no-cache"
```

### Logs and Monitoring

- **Lambda Logs**: CloudWatch Logs `/aws/lambda/FUNCTION_NAME`
- **API Gateway Logs**: CloudWatch Logs `/aws/apigateway/DEPLOYMENT_NAME`
- **Terraform State**: Local or S3 backend (configure in `main.tf`)

## Costs

Estimated monthly costs for development environment:
- **Lambda**: ~$0.20 (1M requests)
- **API Gateway**: ~$3.50 (1M requests)
- **DynamoDB**: ~$1.25 (pay-per-request)
- **S3**: ~$0.50 (website hosting)
- **Cognito**: Free tier (up to 50K MAU)
- **Step Functions**: ~$0.25 (4K executions)

**Total**: ~$6/month for moderate development usage

## Cleanup

To remove all resources:

```bash
cd infrastructure
terraform destroy -var-file=terraform.tfvars
```

**Warning**: This will delete all data and resources. Make sure to backup any important data first.

## Support

For issues:
1. Check CloudWatch logs for errors
2. Verify IAM permissions
3. Ensure all prerequisites are installed
4. Check the troubleshooting section above

## Next Steps

After successful deployment:
1. Create additional templates in the `templates/` directory
2. Set up monitoring and alerting
3. Configure custom domains
4. Implement additional security measures
5. Set up automated backups