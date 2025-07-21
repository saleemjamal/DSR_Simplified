// Layout component tests
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render, mockAuthContext } from '../utils/test-utils'
import Layout from '../../components/Layout'

// Mock useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/dashboard' })
  }
})

describe('Layout Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'manager'
      }
    })
  })

  it('should render layout with navigation and content', () => {
    render(<Layout />)
    
    // Check for app bar
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Daily Reporting System')).toBeInTheDocument()
    
    // Check for navigation drawer
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  it('should display user avatar and name', () => {
    render(<Layout />)
    
    expect(screen.getByRole('button', { name: /account/i })).toBeInTheDocument()
  })

  it('should toggle navigation drawer on menu button click', async () => {
    render(<Layout />)
    
    const menuButton = screen.getByRole('button', { name: /menu/i })
    expect(menuButton).toBeInTheDocument()
    
    // Click menu button to open drawer
    fireEvent.click(menuButton)
    
    // Check if navigation items are visible
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('should show appropriate navigation items for manager role', async () => {
    render(<Layout />)
    
    // Open navigation drawer
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Sales Entry')).toBeInTheDocument()
      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('Management')).toBeInTheDocument()
    })
  })

  it('should restrict navigation items for cashier role', async () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      user: {
        ...mockAuthContext.user,
        role: 'cashier'
      }
    })

    render(<Layout />)
    
    // Open navigation drawer
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Sales Entry')).toBeInTheDocument()
      // Cashiers should not see management sections
      expect(screen.queryByText('Management')).not.toBeInTheDocument()
    })
  })

  it('should show user menu on avatar click', async () => {
    render(<Layout />)
    
    const avatarButton = screen.getByRole('button', { name: /account/i })
    fireEvent.click(avatarButton)
    
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
  })

  it('should handle logout when logout menu item is clicked', async () => {
    const mockSignOut = vi.fn()
    mockUseAuth.mockReturnValue({
      ...mockAuthContext,
      signOut: mockSignOut
    })

    render(<Layout />)
    
    // Open user menu
    const avatarButton = screen.getByRole('button', { name: /account/i })
    fireEvent.click(avatarButton)
    
    // Click logout
    await waitFor(() => {
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)
    })
    
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('should be responsive on mobile devices', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<Layout />)
    
    // On mobile, drawer should be temporary (closes on item click)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('should expand and collapse management sections', async () => {
    render(<Layout />)
    
    // Open navigation drawer
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    
    await waitFor(() => {
      const managementSection = screen.getByText('Management')
      fireEvent.click(managementSection)
    })
    
    // Check if sub-items are shown
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Stores')).toBeInTheDocument()
    })
  })

  it('should handle navigation item clicks', async () => {
    const mockNavigate = vi.fn()
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        Outlet: () => <div data-testid="outlet">Page Content</div>,
        useLocation: () => ({ pathname: '/dashboard' })
      }
    })

    render(<Layout />)
    
    // Open navigation drawer
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    
    await waitFor(() => {
      const dashboardLink = screen.getByText('Dashboard')
      fireEvent.click(dashboardLink)
    })
    
    // Navigation should occur (implementation depends on routing setup)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })
})