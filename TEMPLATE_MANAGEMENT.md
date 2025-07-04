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
- `/templates/data-explorer/` - Complete template example
  - `main.tf` - Infrastructure definition
  - `variables.tf` - Configurable parameters
  - `outputs.tf` - Deployment outputs
  - `website/` - Static website files
  - `lambda/` - Backend function code
  - `README.md` - Template documentation
- `/backend/orchestrator/terraform-runner/index.ts` - Template processing engine

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

## Parameter Types Supported
- **String**: Site names, descriptions, configurations
- **Number**: Capacity settings, limits, thresholds
- **Boolean**: Feature toggles, settings
- **Select**: Predefined options (themes, regions, sizes)

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
- Template selection triggers parameter form generation
- Template parameters injected into Terraform variables
- Deployment outputs stored in DynamoDB
- Template artifacts stored in S3 for reuse