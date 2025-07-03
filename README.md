# Site Generator Platform

A self-service infrastructure provisioning platform that allows users to select from pre-configured website templates and automatically deploy them to AWS using Terraform.

## Features

- 🚀 One-click deployment of pre-configured website templates
- 🔐 AWS Cognito authentication
- 💰 Built-in cost tracking and tagging
- 📊 Real-time deployment status updates
- 🌐 Multi-account AWS deployment support
- 🎨 Modern, responsive UI built with Next.js

## Available Templates

1. **Data Explorer** - Interactive database dashboard with query interface
2. **Company Pulse** - Corporate announcement and blog platform
3. **PixelWorks** - Image transformation and analysis studio
4. **Team Polls** - Polls and surveys platform

## Architecture

- **Frontend**: Next.js static site hosted on S3
- **Backend**: AWS Lambda + API Gateway
- **Infrastructure**: Terraform for all deployments
- **Authentication**: AWS Cognito
- **Orchestration**: AWS Step Functions

## Project Structure

```
site-generator/
├── frontend/          # Next.js application
├── backend/           # Lambda functions
├── infrastructure/    # Platform infrastructure (Terraform)
├── templates/         # Website templates (Terraform modules)
├── docs/             # Documentation
└── .github/          # GitHub Actions workflows
```

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured
- Terraform 1.5+
- Git

### Development Setup

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Configure AWS credentials
4. Deploy infrastructure (see `infrastructure/README.md`)

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

## License

[MIT License](LICENSE)