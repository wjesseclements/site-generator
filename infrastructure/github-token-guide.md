# GitHub Personal Access Token Generation Guide

Follow these steps to create a GitHub personal access token for the Site Generator Platform:

## Step 1: Navigate to GitHub Token Settings
1. Go to https://github.com/settings/tokens
2. Click "Personal access tokens" → "Tokens (classic)"
3. Click "Generate new token" → "Generate new token (classic)"

## Step 2: Configure Token Settings
1. **Note**: Enter a descriptive name like "Site Generator Platform - Dev"
2. **Expiration**: Choose an appropriate expiration (90 days recommended)
3. **Scopes**: Select the following scope:
   - ✅ **repo** - Full control of private repositories
     - This includes all sub-permissions under repo

## Step 3: Generate and Save Token
1. Click "Generate token" at the bottom
2. **IMPORTANT**: Copy the token immediately (starts with `ghp_`)
3. Save it securely - you won't be able to see it again

## Step 4: Add to terraform.tfvars
```hcl
github_token = "ghp_your_generated_token_here"
```

## Security Best Practices
- Never commit the token to version control
- Add `terraform.tfvars` to `.gitignore`
- Rotate tokens regularly
- Use the minimum required permissions
- Consider using GitHub Apps for production

## Token Permissions Explained
The `repo` scope is required to:
- Trigger repository dispatch events
- Access private repository contents
- Create workflow runs via API

## Troubleshooting
If you get authentication errors:
1. Verify the token hasn't expired
2. Check the token has `repo` scope
3. Ensure the token is correctly copied (no extra spaces)
4. Verify the repository name matches exactly