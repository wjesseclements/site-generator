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
    manager = new WebSocketManager()
  })

  afterEach(() => {
    manager.disconnect()
  })

  test('should create WebSocket connection', () => {
    const url = 'wss://test.com'
    const deploymentId = 'test-deployment'
    
    manager.connect(url, deploymentId)
    
    expect(manager['ws']).toBeDefined()
    expect(manager['ws']?.url).toBe(`${url}?deploymentId=${deploymentId}`)
  })

  test('should add and notify listeners', async () => {
    const listener = jest.fn()
    const deploymentId = 'test-deployment'
    
    manager.addListener(deploymentId, listener)
    manager.connect('wss://test.com', deploymentId)
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // Simulate message
    const testUpdate = {
      type: 'deployment_status',
      deploymentId,
      status: 'PENDING',
      message: 'Test message',
      timestamp: new Date().toISOString()
    }
    
    manager['notifyListeners'](testUpdate)
    expect(listener).toHaveBeenCalledWith(testUpdate)
  })

  test('should remove listeners', () => {
    const deploymentId = 'test-deployment'
    const listener = jest.fn()
    
    manager.addListener(deploymentId, listener)
    expect(manager['listeners'].has(deploymentId)).toBe(true)
    
    manager.removeListener(deploymentId)
    expect(manager['listeners'].has(deploymentId)).toBe(false)
  })

  test('should handle disconnection', () => {
    manager.connect('wss://test.com', 'test-deployment')
    expect(manager['ws']).toBeDefined()
    
    manager.disconnect()
    expect(manager['ws']).toBeNull()
  })
})