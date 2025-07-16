# DynamoDB table for deployment tracking
resource "aws_dynamodb_table" "deployments" {
  name         = "${local.resource_prefix}-deployments"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "updatedAt"
    type = "S"
  }

  # Global secondary index for querying by user
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # Global secondary index for querying by status
  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "updatedAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  server_side_encryption {
    enabled = true
  }

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Name = "${local.resource_prefix}-deployments"
  }
}

# DynamoDB table for WebSocket connections
resource "aws_dynamodb_table" "connections" {
  name         = "${local.resource_prefix}-connections"
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "deploymentId"
    type = "S"
  }

  # Global secondary index for querying by user
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  # Global secondary index for querying by deployment
  global_secondary_index {
    name            = "DeploymentIdIndex"
    hash_key        = "deploymentId"
    projection_type = "ALL"
  }

  # TTL for automatic connection cleanup
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Name = "${local.resource_prefix}-connections"
  }
}

# DynamoDB table for Step Functions execution locks
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${local.resource_prefix}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Name = "${local.resource_prefix}-terraform-locks"
  }
}