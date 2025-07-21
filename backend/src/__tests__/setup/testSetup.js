// Global test setup for Vitest
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Fallback to regular .env if .env.test doesn't exist
if (!process.env.SUPABASE_URL) {
  dotenv.config()
}

// Set test environment
process.env.NODE_ENV = 'test'

// Mock console methods to reduce noise in tests (optional)
const originalConsole = global.console

beforeAll(() => {
  // You can mock console here if needed
  // global.console = {
  //   ...console,
  //   log: vi.fn(),
  //   info: vi.fn(),
  //   warn: vi.fn(),
  //   error: vi.fn()
  // }
})

afterAll(() => {
  // Restore console
  global.console = originalConsole
})

beforeEach(() => {
  // Reset any mocks before each test
  // vi.clearAllMocks()
})

afterEach(() => {
  // Cleanup after each test
})

// Import crypto for proper UUID generation
import { randomUUID } from 'crypto'

// Global test utilities
global.testUtils = {
  // Add any utility functions you want available in all tests
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate proper UUID v4 for testing
  generateTestUUID: () => {
    return randomUUID()
  },
  
  // Mock user for testing - generate dynamic UUIDs
  mockUser: {
    get id() { return testUtils.generateTestUUID() },
    email: 'test@example.com',
    role: 'store_manager'
  }
}