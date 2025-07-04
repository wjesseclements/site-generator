import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com'
process.env.NEXT_PUBLIC_WEBSOCKET_URL = 'wss://ws.test.com'
process.env.NEXT_PUBLIC_USER_POOL_ID = 'test-pool-id'
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id'
process.env.NEXT_PUBLIC_IDENTITY_POOL_ID = 'test-identity-pool-id'
process.env.NEXT_PUBLIC_REGION = 'us-east-1'