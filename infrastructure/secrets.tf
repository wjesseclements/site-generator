# AWS Secrets Manager for GitHub Token
# Provides secure storage for GitHub personal access token used for repository dispatch

resource "aws_secretsmanager_secret" "github_token" {
  name                    = "${local.resource_prefix}-github-token"
  description            = "GitHub PAT for repository dispatch to site-generator-infrastructure"
  recovery_window_in_days = 7
  
  tags = merge(local.common_tags, {
    Purpose = "GitHub API Authentication"
    Usage   = "Repository Dispatch"
  })
}

resource "aws_secretsmanager_secret_version" "github_token" {
  secret_id = aws_secretsmanager_secret.github_token.id
  secret_string = jsonencode({
    token = var.github_token
    repository = "${var.github_repo_owner}/${var.github_repo_name}"
    created_at = timestamp()
  })
  
  # Prevent Terraform from updating the secret after initial creation
  # This allows manual rotation via AWS Console/CLI
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Output the secret ARN for use in Lambda configuration
output "github_token_secret_arn" {
  description = "ARN of the GitHub token secret"
  value       = aws_secretsmanager_secret.github_token.arn
  sensitive   = true
}