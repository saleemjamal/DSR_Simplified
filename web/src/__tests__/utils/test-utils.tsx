// Custom render utilities for testing React components with providers
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'

// Create a theme for testing
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
})

// Mock providers that wrap the app
interface ProvidersProps {
  children: ReactNode
}

const TestProviders = ({ children }: ProvidersProps) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={testTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </BrowserRouter>
  )
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options if needed
  initialEntries?: string[]
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  return render(ui, { wrapper: TestProviders, ...options })
}

// Mock authentication context
export const mockAuthContext = {
  user: global.testUtils.mockUser,
  loading: false,
  signIn: async () => ({ user: global.testUtils.mockUser, error: null }),
  signOut: async () => ({ error: null }),
  signUp: async () => ({ user: global.testUtils.mockUser, error: null }),
}

// Mock API calls
export const mockApiCalls = {
  get: async (url: string) => global.testUtils.mockApiResponse({ data: 'mock data' }),
  post: async (url: string, data: any) => global.testUtils.mockApiResponse({ id: 1, ...data }),
  put: async (url: string, data: any) => global.testUtils.mockApiResponse({ id: 1, ...data }),
  delete: async (url: string) => global.testUtils.mockApiResponse({ success: true }),
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Common test helpers
export const testHelpers = {
  // Wait for loading states to resolve
  waitForLoadingToFinish: async () => {
    const { waitForElementToBeRemoved, queryByTestId } = await import('@testing-library/react')
    const loadingElement = queryByTestId(document.body, /loading/i)
    if (loadingElement) {
      await waitForElementToBeRemoved(loadingElement)
    }
  },
  
  // Fill form fields
  fillForm: async (fields: Record<string, string>) => {
    const { screen } = await import('@testing-library/react')
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    
    for (const [label, value] of Object.entries(fields)) {
      const field = screen.getByLabelText(new RegExp(label, 'i'))
      await user.clear(field)
      await user.type(field, value)
    }
  },
  
  // Submit form
  submitForm: async (submitButtonText = /submit|save|create/i) => {
    const { screen } = await import('@testing-library/react')
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    
    const submitButton = screen.getByRole('button', { name: submitButtonText })
    await user.click(submitButton)
  }
}