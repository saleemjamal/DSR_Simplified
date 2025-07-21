/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

// Declare global test utilities
declare global {
  var testUtils: {
    mockUser: {
      id: string
      email: string
      name: string
      role: string
    }
    mockApiResponse: (data: any, status?: number) => any
    waitFor: (ms: number) => Promise<void>
  }
}