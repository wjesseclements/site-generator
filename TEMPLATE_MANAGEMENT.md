# Template Management Feature

## Overview
Terraform-based template system for defining, storing, and deploying pre-configured website infrastructure. Supports dynamic parameter injection, versioning, and automated resource management.

## Core Functionality
- Terraform-based infrastructure templates
- Dynamic parameter injection into template variables
- Template validation and deployment
- Resource tagging for cost tracking
- Support for complex multi-service architectures
- Template versioning and storage

## Files
- `/frontend/lib/templates.ts` - Template definitions and parameters
- `/backend/orchestrator/terraform-runner/index.ts` - Template processing engine
- External GitOps repository: Template Terraform modules and deployment workflows

## Template Structure
Each template includes:
- **Infrastructure Definition**: Terraform HCL for AWS resources
- **Variable Configuration**: Parameterized inputs for customization
- **Output Values**: URLs, resource IDs, and deployment info
- **Static Assets**: Website files, images, configurations
- **Backend Code**: Lambda functions, APIs, business logic

## Example Template (Data Explorer)
```hcl
resource "aws_dynamodb_table" "data_explorer_table" {
  name         = "${var.site_name}-data-explorer-${var.deployment_id}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  tags = var.tags
}
```

## Available Templates
1. **Data Explorer** (`data-explorer`) - Interactive database dashboard for data analysis
2. **Company Pulse** (`company-pulse`) - Corporate announcement and blog platform
3. **PixelWorks** (`pixelworks`) - Image transformation studio with AI features
4. **Team Polls** (`team-polls`) - Real-time polls and surveys platform

## Parameter Types Supported
- **text**: Site names, descriptions, email addresses
- **number**: File sizes, capacity settings, thresholds
- **boolean**: Feature toggles, configuration options
- **select**: Predefined options (database types, instance sizes, team sizes)

## Template Processing
1. **Parameter Validation**: Ensure required fields are provided
2. **Variable Injection**: Generate terraform.tfvars file
3. **Resource Tagging**: Add deployment and cost tracking tags
4. **Terraform Execution**: Initialize, plan, and apply infrastructure
5. **Output Capture**: Store deployment results and URLs

## Resource Management
- Automatic resource naming with deployment ID
- Consistent tagging strategy for cost allocation
- Proper IAM roles and security policies
- Environment-specific configurations
- Resource cleanup on deployment deletion

## Integration Points
- **Frontend**: Template selection triggers dynamic parameter form generation
- **GitOps**: Parameters injected into Terraform variables via GitHub repository dispatch
- **Storage**: Deployment outputs stored in DynamoDB for tracking
- **Deployment**: Template infrastructure deployed via GitHub Actions workflows