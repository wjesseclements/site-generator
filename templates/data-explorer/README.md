# Data Explorer Template

An interactive database dashboard with query interface, built on AWS serverless architecture.

## Features

- **Interactive Web UI**: Modern, responsive interface for data exploration
- **DynamoDB Backend**: Scalable NoSQL database for data storage
- **RESTful API**: Lambda-powered API with full CRUD operations
- **Query Capabilities**: 
  - Search by text
  - Filter by category
  - Pagination support
- **Real-time Stats**: Track total records, categories, and last update time
- **Data Management**: Add, edit, and view records through the UI

## Architecture

- **Frontend**: Static website hosted on S3
- **API**: API Gateway + Lambda functions
- **Database**: DynamoDB with optional indexes
- **Hosting**: S3 static website hosting

## Configuration Parameters

- `site_name`: Name of your Data Explorer instance
- `admin_email`: Administrator email address
- `enable_timestamp_sorting`: Enable time-based sorting (default: true)
- `enable_category_index`: Enable category filtering (default: true)
- `max_query_results`: Maximum results per query (default: 100)
- `enable_data_export`: Enable CSV/JSON export (default: true)
- `enable_api_key`: Require API key for modifications (default: false)

## API Endpoints

- `GET /data`: List all records with pagination
- `POST /data`: Create or update a record
- `POST /query`: Execute queries (by ID, category, or search)

## Data Schema

Records can contain any JSON data, but the following fields are standard:
- `id`: Unique identifier (auto-generated if not provided)
- `name`: Display name
- `category`: Category for filtering
- `description`: Detailed description
- `timestamp`: Creation/update time (auto-generated)

## Deployment

This template is deployed automatically by the Site Generator platform. After deployment:

1. Access your Data Explorer at the provided S3 website URL
2. Use the web interface to add and query data
3. Integrate with the API endpoints for programmatic access

## Security

- Public read access for the website
- API endpoints are CORS-enabled
- Optional API key authentication for data modifications
- All resources are tagged for cost tracking

## Customization

To customize the Data Explorer:

1. Modify `website/` files for UI changes
2. Update `lambda/index.js` for API functionality
3. Adjust `main.tf` for infrastructure changes
4. Configure variables in `variables.tf`

## Cost Optimization

- DynamoDB uses pay-per-request billing
- Lambda functions are billed per invocation
- S3 costs are minimal for static hosting
- CloudWatch logs have 7-day retention