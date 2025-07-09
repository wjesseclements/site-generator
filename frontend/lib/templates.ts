export interface Template {
  id: string
  name: string
  description: string
  icon: string
  category: string
  estimatedCost: string
  parameters: TemplateParameter[]
  features: string[]
  techStack: string[]
  preview?: {
    image: string
    alt: string
  }
  useCases: string[]
}

export interface TemplateParameter {
  name: string
  label: string
  type: 'text' | 'select' | 'number' | 'boolean'
  required: boolean
  default?: string | number | boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  description?: string
}

export const templates: Template[] = [
  {
    id: 'data-explorer',
    name: 'Data Explorer',
    description: 'Interactive database dashboard with query interface for data analysis and visualization',
    icon: '📊',
    category: 'Analytics',
    estimatedCost: '$0.12/hour',
    features: [
      'Interactive SQL query builder',
      'Real-time data visualization',
      'Export to CSV/Excel',
      'User access controls',
      'Scheduled reports',
      'Custom dashboard creation'
    ],
    techStack: ['React', 'Node.js', 'PostgreSQL/MySQL', 'Chart.js', 'AWS RDS'],
    useCases: [
      'Business intelligence dashboards',
      'Data analysis for teams',
      'Customer data exploration',
      'Sales and marketing analytics'
    ],
    parameters: [
      {
        name: 'siteName',
        label: 'Site Name',
        type: 'text',
        required: true,
        placeholder: 'my-data-explorer',
        description: 'Unique name for your data explorer instance'
      },
      {
        name: 'databaseType',
        label: 'Database Type',
        type: 'select',
        required: true,
        default: 'postgres',
        options: [
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
          { value: 'aurora', label: 'Aurora Serverless' }
        ]
      },
      {
        name: 'instanceSize',
        label: 'Instance Size',
        type: 'select',
        required: true,
        default: 'small',
        options: [
          { value: 'small', label: 'Small (db.t3.micro)' },
          { value: 'medium', label: 'Medium (db.t3.small)' },
          { value: 'large', label: 'Large (db.t3.medium)' }
        ]
      }
    ]
  },
  {
    id: 'company-pulse',
    name: 'Company Pulse',
    description: 'Corporate announcement and blog platform for internal communications',
    icon: '📢',
    category: 'Communication',
    estimatedCost: '$0.08/hour',
    features: [
      'Rich text editor for announcements',
      'Employee commenting system',
      'Email notifications',
      'Content scheduling',
      'Analytics dashboard',
      'Mobile-responsive design'
    ],
    techStack: ['Next.js', 'React', 'AWS Lambda', 'DynamoDB', 'SES'],
    useCases: [
      'Company-wide announcements',
      'Department updates',
      'Policy changes',
      'Employee engagement'
    ],
    parameters: [
      {
        name: 'siteName',
        label: 'Site Name',
        type: 'text',
        required: true,
        placeholder: 'company-announcements',
        description: 'Unique name for your announcement portal'
      },
      {
        name: 'adminEmail',
        label: 'Admin Email',
        type: 'text',
        required: true,
        placeholder: 'admin@company.com',
        description: 'Email for the primary administrator'
      },
      {
        name: 'enableComments',
        label: 'Enable Comments',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Allow employees to comment on announcements'
      }
    ]
  },
  {
    id: 'pixelworks',
    name: 'PixelWorks',
    description: 'Image transformation and analysis studio with AI-powered features',
    icon: '🎨',
    category: 'Media',
    estimatedCost: '$0.15/hour',
    features: [
      'Batch image processing',
      'AI-powered image analysis',
      'Format conversion',
      'Resize and optimization',
      'Metadata extraction',
      'Cloud storage integration'
    ],
    techStack: ['React', 'Node.js', 'AWS Rekognition', 'S3', 'Lambda'],
    useCases: [
      'Marketing asset processing',
      'Product image optimization',
      'Content moderation',
      'Image analysis workflows'
    ],
    parameters: [
      {
        name: 'siteName',
        label: 'Site Name',
        type: 'text',
        required: true,
        placeholder: 'image-studio',
        description: 'Unique name for your image processing studio'
      },
      {
        name: 'maxFileSize',
        label: 'Max File Size (MB)',
        type: 'number',
        required: true,
        default: 10,
        description: 'Maximum upload file size in megabytes'
      },
      {
        name: 'enableAI',
        label: 'Enable AI Analysis',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Enable AWS Rekognition for image analysis'
      }
    ]
  },
  {
    id: 'team-polls',
    name: 'Team Polls',
    description: 'Real-time polls and surveys platform for team engagement and feedback',
    icon: '🗳️',
    category: 'Engagement',
    estimatedCost: '$0.10/hour',
    features: [
      'Real-time voting results',
      'Anonymous voting options',
      'Multiple poll types',
      'Results analytics',
      'Export capabilities',
      'Team management'
    ],
    techStack: ['React', 'Node.js', 'WebSocket', 'DynamoDB', 'Lambda'],
    useCases: [
      'Team decision making',
      'Employee feedback collection',
      'Meeting polls',
      'Engagement surveys'
    ],
    parameters: [
      {
        name: 'siteName',
        label: 'Site Name',
        type: 'text',
        required: true,
        placeholder: 'team-polls',
        description: 'Unique name for your polling platform'
      },
      {
        name: 'teamSize',
        label: 'Expected Team Size',
        type: 'select',
        required: true,
        default: 'medium',
        options: [
          { value: 'small', label: 'Small (< 50 users)' },
          { value: 'medium', label: 'Medium (50-200 users)' },
          { value: 'large', label: 'Large (200+ users)' }
        ]
      },
      {
        name: 'anonymousVoting',
        label: 'Allow Anonymous Voting',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Allow users to vote anonymously'
      }
    ]
  }
]