// ProtectedRoute component tests
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render, mockAuthContext } from '../utils/test-utils'
import ProtectedRoute from '../../components/ProtectedRoute'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}))

// Mock react-router-dom Navigate component
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to)
      return <div data-testid="navigate">Redirecting to {to}</div>
    }
  }
})

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>

describe('ProtectedRoute Component', () => {
  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: mockAuthContext.user,
      loading: false
    })

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: null,
      loading: false
    })

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('should show loading state while authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: null,
      loading: true
    })

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })

  it('should render children when user has required role', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'manager'
      },
      loading: false
    })

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should redirect when user does not have required role', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'cashier'
      },
      loading: false
    })

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized')
  })

  it('should allow access when user role is in allowed roles array', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'store_manager'
      },
      loading: false
    })

    render(
      <ProtectedRoute allowedRoles={['manager', 'store_manager', 'super_user']}>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should redirect when user role is not in allowed roles array', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'cashier'
      },
      loading: false
    })

    render(
      <ProtectedRoute allowedRoles={['manager', 'store_manager', 'super_user']}>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/unauthorized')
  })

  it('should allow super_user access to all protected routes', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'super_user'
      },
      loading: false
    })

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should use custom redirect path when provided', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: null,
      loading: false
    })

    render(
      <ProtectedRoute redirectTo="/custom-login">
        <TestComponent />
      </ProtectedRoute>
    )

    expect(mockNavigate).toHaveBeenCalledWith('/custom-login')
  })

  it('should handle multiple role checks correctly', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'accounts_incharge'
      },
      loading: false
    })

    render(
      <ProtectedRoute 
        allowedRoles={['manager', 'accounts_incharge']} 
        requiredRole="accounts_incharge"
      >
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should handle edge case with undefined user role', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: undefined
      },
      loading: false
    })

    render(
      <ProtectedRoute requiredRole="manager">
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
  })

  it('should handle authentication errors gracefully', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: null,
      loading: false,
      error: 'Authentication failed'
    })

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
  })
})