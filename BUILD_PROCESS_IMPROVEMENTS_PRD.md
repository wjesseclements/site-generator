# Product Requirements Document: Build Process & Deployment Coupling Improvements

## Executive Summary

Improve the Site Generator Platform's build and deployment architecture to follow AWS Well-Architected Framework best practices by implementing proper artifact management and leveraging the existing GitOps repository structure.

## Problem Statement

### Current Issues
1. **Build Process Location**: Terraform creates Lambda ZIP files at deployment time using `archive_file`, causing tight coupling between build and infrastructure deployment
2. **Deployment Coupling**: Mixed infrastructure and application code in single repository, despite having a separate GitOps repository available

### Business Impact
- **Performance**: Slower deployments due to on-demand ZIP creation
- **Reliability**: Infrastructure changes triggered by application code updates
- **Scalability**: Difficult to implement proper CI/CD pipelines
- **Compliance**: Not following enterprise GitOps patterns

## Objectives

### Primary Goals
1. Implement S3-based Lambda artifact storage with proper CI/CD builds
2. Leverage existing `site-generator-infrastructure` repository for proper separation
3. Achieve faster, more reliable deployments
4. Enable independent infrastructure and application code lifecycles

### Success Metrics
- Build time reduction: 50% faster Lambda deployments
- Zero infrastructure changes when only application code updates
- Proper artifact versioning and rollback capabilities
- Complete separation of infrastructure and application concerns

## Requirements

### Functional Requirements

#### FR1: S3 Artifact Management
- **FR1.1**: Lambda functions deployed from S3 artifacts, not local ZIP creation
- **FR1.2**: Versioned artifacts with semantic versioning (e.g., `v1.2.3`)
- **FR1.3**: Automated artifact cleanup (retain last 10 versions)
- **FR1.4**: Artifact integrity verification (checksums)

#### FR2: CI/CD Pipeline
- **FR2.1**: GitHub Actions build pipeline in main repository
- **FR2.2**: Automated builds on push to `main` and `dev` branches
- **FR2.3**: Build artifacts uploaded to S3 with version tags
- **FR2.4**: Integration tests run before artifact promotion

#### FR3: Repository Separation
- **FR3.1**: Infrastructure code moved to `site-generator-infrastructure` repository
- **FR3.2**: Application code remains in main repository
- **FR3.3**: Infrastructure references S3 artifacts by version/tag
- **FR3.4**: Cross-repository dependency management

#### FR4: Deployment Orchestration
- **FR4.1**: Application deployments trigger infrastructure updates via repository dispatch
- **FR4.2**: Infrastructure deployments independent of application code changes
- **FR4.3**: Rollback capabilities for both infrastructure and application components
- **FR4.4**: Environment promotion workflows (dev → staging → prod)

### Non-Functional Requirements

#### NFR1: Performance
- Lambda cold start time: < 500ms (current: variable due to large packages)
- Build time: < 5 minutes for full CI/CD pipeline
- Deployment time: < 10 minutes for infrastructure updates

#### NFR2: Reliability
- 99.9% build success rate
- Zero failed deployments due to missing artifacts
- Automated rollback on deployment failures

#### NFR3: Security
- S3 bucket encryption at rest
- IAM least-privilege access for build/deploy roles
- Artifact integrity verification
- No hardcoded credentials in repositories

#### NFR4: Maintainability
- Clear separation of concerns between repositories
- Comprehensive documentation for new workflow
- Automated testing at all stages

## Technical Architecture

### Current State
```
site-generator/
├── infrastructure/          # Terraform + archive_file
├── backend/                # Lambda source code
└── frontend/               # Next.js application

site-generator-infrastructure/  # GitOps templates (external deployments)
└── templates/              # Website templates for users
```

### Target State
```
site-generator/                     # Application Repository
├── backend/                       # Lambda source code
├── frontend/                      # Next.js application
├── .github/workflows/             # CI/CD for application
└── docs/                         # Application documentation

site-generator-infrastructure/      # Infrastructure Repository
├── platform/                     # Platform infrastructure (NEW)
│   ├── terraform/                # Core platform Terraform
│   └── .github/workflows/        # Infrastructure CI/CD
└── templates/                    # Website templates (existing)
```

### Component Specifications

#### S3 Artifact Bucket
```hcl
resource "aws_s3_bucket" "lambda_artifacts" {
  bucket = "${var.project_name}-${var.environment}-lambda-artifacts"
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    enabled = true
    noncurrent_version_expiration {
      days = 30
    }
  }
}
```

#### Lambda Function Updates
```hcl
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  
  # S3 artifact instead of filename
  s3_bucket     = var.artifacts_bucket
  s3_key        = "${var.function_name}/${var.artifact_version}.zip"
  
  # Version-based updates
  source_code_hash = var.artifact_hash
}
```

#### CI/CD Pipeline Structure
```yaml
# .github/workflows/build-and-deploy.yml
name: Build and Deploy Lambda Functions
on:
  push:
    branches: [main, dev]
    paths: ['backend/**']

jobs:
  build:
    - Build Lambda functions
    - Run tests
    - Upload to S3 with version tag
    - Trigger infrastructure update
```

## Implementation Plan

### Phase 1: S3 Artifact Foundation (Week 1)
**Scope**: Implement S3-based artifact storage without repository separation

**Tasks**:
1. **Infrastructure Updates**
   - Add S3 bucket for Lambda artifacts in `infrastructure/s3.tf`
   - Update Lambda module to support S3 source
   - Modify `build-production.sh` to upload to S3
   - Update Terraform variables for artifact versioning

2. **Build Process Updates**
   - Enhance build script with S3 upload functionality
   - Implement semantic versioning for artifacts
   - Add artifact integrity checks (SHA256)

3. **Testing & Validation**
   - Deploy and test S3-based Lambda updates
   - Verify artifact versioning works correctly
   - Confirm no regression in functionality

**Deliverables**:
- Updated Terraform configuration
- Modified build scripts
- S3 bucket with versioned Lambda artifacts
- Documentation updates

### Phase 2: CI/CD Pipeline (Week 2)
**Scope**: Implement automated builds and deployments

**Tasks**:
1. **GitHub Actions Setup**
   - Create build workflow for Lambda functions
   - Implement automated testing in CI
   - Add S3 artifact upload to workflow
   - Configure branch-based deployments

2. **Integration Testing**
   - Add integration tests for API endpoints
   - Implement contract testing for Lambda functions
   - Add end-to-end deployment testing

3. **Deployment Automation**
   - Automate Terraform updates when artifacts change
   - Implement blue-green deployment for Lambda functions
   - Add automated rollback on failure

**Deliverables**:
- Complete CI/CD pipeline
- Automated testing suite
- Deployment automation scripts
- Monitoring and alerting setup

### Phase 3: Repository Separation (Week 3)
**Scope**: Move infrastructure to dedicated repository

**Tasks**:
1. **Repository Migration**
   - Move `infrastructure/` to `site-generator-infrastructure/platform/`
   - Update repository references and documentation
   - Migrate git history for infrastructure files
   - Configure cross-repository access

2. **Cross-Repository Integration**
   - Implement repository dispatch for deployments
   - Add infrastructure CI/CD in separate repository
   - Configure artifact references between repositories
   - Update deployment workflows

3. **Documentation & Training**
   - Update all documentation for new workflow
   - Create migration guide for team
   - Update CLAUDE.md with new architecture
   - Record demo of new deployment process

**Deliverables**:
- Separated repositories with clear ownership
- Cross-repository integration working
- Complete documentation update
- Team training completed

## Risk Assessment

### High Risk
- **Repository migration complexity**: Potential for broken deployments during transition
  - *Mitigation*: Implement in phases, maintain parallel processes during transition
- **Cross-repository dependency management**: Complex workflow dependencies
  - *Mitigation*: Thorough testing, clear rollback procedures

### Medium Risk  
- **S3 artifact management**: Potential for missing or corrupted artifacts
  - *Mitigation*: Implement integrity checks, automated testing
- **Team workflow changes**: Learning curve for new processes
  - *Mitigation*: Comprehensive documentation, training sessions

### Low Risk
- **AWS costs**: Additional S3 storage costs
  - *Mitigation*: Implement lifecycle policies, monitor usage

## Success Criteria

### Technical Metrics
- ✅ Lambda functions deploy from S3 artifacts (not local ZIP files)
- ✅ Build time < 5 minutes for complete CI/CD pipeline
- ✅ Zero infrastructure changes for application-only updates
- ✅ Successful repository separation with independent lifecycles

### Process Metrics
- ✅ All team members trained on new workflow
- ✅ Documentation updated and validated
- ✅ Rollback procedures tested and documented
- ✅ Monitoring and alerting operational

### Business Metrics
- ✅ 50% reduction in deployment time
- ✅ Zero failed deployments due to build issues
- ✅ Improved developer experience scores
- ✅ Enhanced system reliability and maintainability

## Dependencies

### External Dependencies
- AWS S3 service availability
- GitHub Actions service availability
- Existing `site-generator-infrastructure` repository access

### Internal Dependencies
- Team availability for training and migration
- Stakeholder approval for workflow changes
- QA resources for testing new processes

### Technical Dependencies
- Current Terraform state migration
- Existing Lambda function updates
- Frontend deployment process (minimal impact)

## Timeline

| Phase | Duration | Key Milestones |
|-------|----------|----------------|
| Phase 1 | Week 1 | S3 artifacts, updated Terraform |
| Phase 2 | Week 2 | CI/CD pipeline, automated testing |
| Phase 3 | Week 3 | Repository separation, documentation |
| **Total** | **3 weeks** | **Complete architecture improvement** |

## Appendix

### Current Repository Structure
- **Main Repository**: Mixed infrastructure and application code
- **GitOps Repository**: External website template deployments
- **Build Process**: Local ZIP creation via Terraform `archive_file`

### Target Repository Structure  
- **Application Repository**: Lambda functions, frontend, CI/CD
- **Infrastructure Repository**: Platform Terraform, infrastructure CI/CD
- **GitOps Repository**: Website templates (unchanged)

### Migration Checklist
- [ ] S3 bucket created and configured
- [ ] Lambda functions updated to use S3 artifacts
- [ ] CI/CD pipeline implemented and tested
- [ ] Repository separation completed
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures validated