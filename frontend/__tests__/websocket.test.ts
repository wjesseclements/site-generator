import { WebSocketManager } from '@/lib/websocket'

// Mock WebSocket
class MockWebSocket {
  url: string
  readyState: number = WebSocket.CONNECTING
  onopen?: () => void
  onmessage?: (event: MessageEvent) => void
  onclose?: () => void
  onerror?: (event: Event) => void

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen?.()
    }, 10)
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

describe('WebSocket Manager', () => {
  let manager: WebSocketManager

  beforeEach(() => {
    manager = new WebSocketManager('wss://test.com')
  })

  afterEach(() => {
    manager.disconnect()
  })

  test('should create WebSocket connection', async () => {
    await manager.connect()
    expect(manager['ws']).toBeDefined()
    expect(manager['ws']?.url).toBe('wss://test.com')
  })

  test('should subscribe to deployments', async () => {
    const listener = jest.fn()
    const deploymentId = 'test-deployment'
    
    await manager.connect()
    manager.subscribeToDeployment(deploymentId, listener)
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // Simulate message
    const testUpdate = {
      deploymentId,
      status: 'DEPLOYING' as const,
      message: 'Test message'
    }
    
    manager['handleMessage'](testUpdate)
    expect(listener).toHaveBeenCalledWith(testUpdate)
  })

  test('should unsubscribe from deployments', async () => {
    const deploymentId = 'test-deployment'
    const listener = jest.fn()
    
    await manager.connect()
    manager.subscribeToDeployment(deploymentId, listener)
    expect(manager['listeners'].has(deploymentId)).toBe(true)
    
    manager.unsubscribeFromDeployment(deploymentId)
    expect(manager['listeners'].has(deploymentId)).toBe(false)
  })

  test('should handle disconnection', async () => {
    await manager.connect()
    expect(manager['ws']).toBeDefined()
    
    manager.disconnect()
    expect(manager['ws']).toBeNull()
  })
})