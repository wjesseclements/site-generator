export interface Deployment {
  id: string
  userId: string
  templateId: string
  templateName: string
  siteName: string
  parameters: Record<string, any>
  status: DeploymentStatus
  targetAccount?: string
  outputs?: DeploymentOutputs
  cost?: CostEstimate
  createdAt: string
  updatedAt: string
  completedAt?: string
  error?: string
  tags: Record<string, string>
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  INITIALIZING = 'INITIALIZING',
  PLANNING = 'PLANNING',
  DEPLOYING = 'DEPLOYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DESTROYING = 'DESTROYING',
  DESTROYED = 'DESTROYED'
}

export interface DeploymentOutputs {
  siteUrl?: string
  adminUrl?: string
  apiEndpoint?: string
  resources: ResourceInfo[]
}

export interface ResourceInfo {
  type: string
  name: string
  arn?: string
}

export interface CostEstimate {
  hourly: number
  monthly: number
  currency: string
}

export interface DeploymentEvent {
  deploymentId: string
  status: DeploymentStatus
  message: string
  timestamp: string
  progress?: number
  details?: any
}

export interface CreateDeploymentRequest {
  templateId: string
  parameters: Record<string, any>
  targetAccount?: string
}

export interface WebSocketConnection {
  connectionId: string
  userId: string
  deploymentId?: string
  connectedAt: string
}