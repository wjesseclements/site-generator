# GitHub Actions Infrastructure Deployment

This directory contains example GitHub Actions workflows for implementing the GitOps infrastructure deployment pattern.

## Setup Instructions

### 1. Create External Infrastructure Repository

Create a new GitHub repository (e.g., `site-generator-infrastructure`) with the following structure:

```
.github/
  workflows/
    deploy-infrastructure.yml
templates/
  data-explorer/
    main.tf
    variables.tf
    outputs.tf
  company-pulse/
    main.tf
    variables.tf
    outputs.tf
  pixelworks/
    main.tf
    variables.tf
    outputs.tf
  team-polls/
    main.tf
    variables.tf
    outputs.tf
README.md
```

### 2. Configure GitHub OIDC

Set up GitHub OIDC provider in AWS and create a role that GitHub Actions can assume:

```hcl
# Add to your infrastructure/iam.tf
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
  
  client_id_list = [
    "sts.amazonaws.com",
  ]
  
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}

resource "aws_iam_role" "github_actions" {
  name = "${local.resource_prefix}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo_owner}/${var.github_repo_name}:*"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_admin" {
  role       = aws_iam_role.github_actions.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

### 3. Configure Repository Secrets

Add the following secrets to your infrastructure repository:

- `AWS_ROLE_ARN`: ARN of the GitHub Actions IAM role
- `WEBHOOK_SECRET`: Secret for webhook signature verification
- `TERRAFORM_STATE_BUCKET`: S3 bucket for Terraform state
- `TERRAFORM_LOCKS_TABLE`: DynamoDB table for Terraform locks

### 4. Configure Site Generator Platform

Update your `terraform.tfvars` file:

```hcl
github_token = "ghp_your_github_token"
github_repo_owner = "your-github-username"
github_repo_name = "site-generator-infrastructure"
github_webhook_secret = "your-webhook-secret"
```

### 5. Copy Template Files

Copy the template files from the `templates/` directory to your infrastructure repository, organizing them by template ID.

## Security Considerations

1. **OIDC Authentication**: Uses GitHub OIDC provider instead of long-lived access keys
2. **Webhook Security**: Webhook payloads are signed with HMAC-SHA256
3. **Least Privilege**: Each template deployment uses isolated Terraform state
4. **Audit Trail**: All deployment actions are logged in GitHub Actions

## GitOps Benefits

1. **Version Control**: All infrastructure changes are tracked in Git
2. **Review Process**: Pull requests for infrastructure changes
3. **Rollback**: Easy rollback using Git history
4. **Compliance**: Built-in audit trail and approval workflows
5. **Scalability**: Can handle multiple concurrent deployments

## Workflow Execution

1. Site Generator Platform triggers repository dispatch
2. GitHub Actions workflow receives deployment parameters
3. Terraform templates are parameterized and executed
4. Status updates are sent back via webhook
5. Real-time updates are pushed to users via WebSocket

## Error Handling

The workflow includes comprehensive error handling:
- Terraform validation errors
- AWS resource creation failures
- Network connectivity issues
- Webhook delivery failures

All failures are reported back to the platform with detailed error messages.