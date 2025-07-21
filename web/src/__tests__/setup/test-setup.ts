// Global test setup for Vitest + React Testing Library
import { expect, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Global setup
beforeAll(() => {
  // Mock environment variables
  Object.defineProperty(window, 'ENV', {
    value: {
      VITE_API_URL: 'http://localhost:3004/api/v1',
      VITE_GOOGLE_CLIENT_ID: 'test-google-client-id'
    },
    writable: true
  })
})

// Mock IntersectionObserver (often needed for UI components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver (often needed for responsive components)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock matchMedia (for responsive design tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => localStorage[key] || null,
  setItem: (key: string, value: string) => {
    localStorage[key] = value
  },
  removeItem: (key: string) => {
    delete localStorage[key]
  },
  clear: () => {
    Object.keys(localStorage).forEach(key => delete localStorage[key])
  }
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
})

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: 'manager'
  },
  
  // Mock API responses
  mockApiResponse: (data: any, status = 200) => ({
    status,
    data,
    ok: status >= 200 && status < 300
  }),
  
  // Utility to wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}