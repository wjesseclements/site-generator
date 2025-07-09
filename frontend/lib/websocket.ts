export interface DeploymentStatusUpdate {
  deploymentId: string;
  status: 'PENDING' | 'INITIALIZING' | 'PLANNING' | 'DEPLOYING' | 'COMPLETED' | 'FAILED' | 'DESTROYING' | 'DESTROYED';
  message: string;
  step?: string;
  outputs?: Record<string, any>;
  error?: string;
  terraform_output?: string;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private listeners: Map<string, (update: DeploymentStatusUpdate) => void> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.handleReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: DeploymentStatusUpdate) {
    const listener = this.listeners.get(data.deploymentId);
    if (listener) {
      listener(data);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectInterval);
    }
  }

  subscribeToDeployment(deploymentId: string, callback: (update: DeploymentStatusUpdate) => void) {
    this.listeners.set(deploymentId, callback);
    
    // Send subscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'status',
        deploymentId
      }));
    }
  }

  unsubscribeFromDeployment(deploymentId: string) {
    this.listeners.delete(deploymentId);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}