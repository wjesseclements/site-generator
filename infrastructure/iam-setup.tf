# IAM Setup for Site Generator Platform Deployment
# This file creates the necessary IAM roles for CI/CD and cross-account deployments

# GitHub Actions OIDC Provider (if using GitHub Actions)
resource "aws_iam_openid_connect_provider" "github" {
  count = var.enable_github_actions ? 1 : 0

  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = local.common_tags
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  count = var.enable_github_actions ? 1 : 0
  
  name = "${local.resource_prefix}-github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github[0].arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for GitHub Actions Deployment
resource "aws_iam_role_policy" "github_actions_deploy" {
  count = var.enable_github_actions ? 1 : 0
  
  name = "${local.resource_prefix}-github-actions-deploy"
  role = aws_iam_role.github_actions[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          aws_s3_bucket.lambda_deployments.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl"
        ]
        Resource = [
          "${aws_s3_bucket.frontend.arn}/*",
          "${aws_s3_bucket.lambda_deployments.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = [
          module.create_deployment_lambda.function_arn,
          module.get_deployments_lambda.function_arn,
          module.get_deployment_lambda.function_arn,
          module.terraform_runner_lambda.function_arn,
          module.websocket_connect_lambda.function_arn,
          module.websocket_disconnect_lambda.function_arn,
          module.websocket_status_lambda.function_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources",
          "cloudformation:GetTemplate"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Role for Terraform State Management
resource "aws_iam_role" "terraform_deploy" {
  name = "${local.resource_prefix}-terraform-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_caller_identity.current.arn
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

# Comprehensive IAM Policy for Terraform Deployments
resource "aws_iam_role_policy" "terraform_deploy" {
  name = "${local.resource_prefix}-terraform-deploy"
  role = aws_iam_role.terraform_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 Permissions
      {
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = [
          "arn:aws:s3:::${local.resource_prefix}-*",
          "arn:aws:s3:::${local.resource_prefix}-*/*"
        ]
      },
      # DynamoDB Permissions
      {
        Effect = "Allow"
        Action = [
          "dynamodb:*"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${local.resource_prefix}-*"
        ]
      },
      # Lambda Permissions
      {
        Effect = "Allow"
        Action = [
          "lambda:*"
        ]
        Resource = [
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.resource_prefix}-*"
        ]
      },
      # API Gateway Permissions
      {
        Effect = "Allow"
        Action = [
          "apigateway:*"
        ]
        Resource = "*"
      },
      # IAM Permissions (restricted to specific roles)
      {
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:UpdateRole",
          "iam:PassRole",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:ListRoleTags"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.resource_prefix}-*"
        ]
      },
      # CloudWatch Logs Permissions
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:DeleteLogGroup",
          "logs:PutRetentionPolicy",
          "logs:TagLogGroup",
          "logs:UntagLogGroup",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      },
      # Step Functions Permissions
      {
        Effect = "Allow"
        Action = [
          "states:*"
        ]
        Resource = [
          "arn:aws:states:${var.aws_region}:${data.aws_caller_identity.current.account_id}:stateMachine:${local.resource_prefix}-*"
        ]
      },
      # Cognito Permissions
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:*",
          "cognito-identity:*"
        ]
        Resource = "*"
      },
      # CloudFormation Permissions (for Terraform)
      {
        Effect = "Allow"
        Action = [
          "cloudformation:*"
        ]
        Resource = "*"
      },
      # Additional Permissions
      {
        Effect = "Allow"
        Action = [
          "tag:GetResources",
          "tag:TagResources",
          "tag:UntagResources",
          "tag:GetTagKeys",
          "tag:GetTagValues"
        ]
        Resource = "*"
      }
    ]
  })
}

# Cross-Account Deployment Role Template
# This creates a role that can be assumed by the Site Generator platform
# to deploy resources in other AWS accounts
resource "aws_iam_role" "cross_account_deploy_template" {
  name = "${local.resource_prefix}-cross-account-deploy-template"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.terraform_runner_execution.arn
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.cross_account_external_id
          }
        }
      }
    ]
  })

  tags = merge(local.common_tags, {
    Purpose = "Template for cross-account deployment roles"
  })
}

# Output the role ARNs
output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions deployment role"
  value       = var.enable_github_actions ? aws_iam_role.github_actions[0].arn : null
}

output "terraform_deploy_role_arn" {
  description = "ARN of the Terraform deployment role"
  value       = aws_iam_role.terraform_deploy.arn
}

output "cross_account_role_template" {
  description = "Template for creating cross-account deployment roles"
  value = {
    role_name                = "${local.resource_prefix}-deploy-role"
    trusted_principal_arn    = aws_iam_role.terraform_runner_execution.arn
    external_id_required     = var.cross_account_external_id
    policy_attachment_needed = "PowerUserAccess or custom policy"
  }
}