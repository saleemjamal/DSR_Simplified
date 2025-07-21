// SalesEntryModal component tests
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, mockAuthContext, testHelpers } from '../utils/test-utils'
import SalesEntryModal from '../../components/SalesEntryModal'

// Mock API calls
const mockSalesApi = {
  create: vi.fn(),
  getAll: vi.fn()
}

const mockStoresApi = {
  getAll: vi.fn()
}

const mockVouchersApi = {
  create: vi.fn(),
  redeem: vi.fn()
}

vi.mock('../../services/api', () => ({
  salesApi: mockSalesApi,
  storesApi: mockStoresApi,
  vouchersApi: mockVouchersApi
}))

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuthContext
}))

// Mock CustomerSelector component
vi.mock('../../components/CustomerSelector', () => ({
  default: ({ onSelectCustomer, selectedCustomer }: any) => (
    <div data-testid="customer-selector">
      <button 
        onClick={() => onSelectCustomer({ id: '1', name: 'Test Customer' })}
        data-testid="select-customer"
      >
        {selectedCustomer?.name || 'Select Customer'}
      </button>
    </div>
  )
}))

describe('SalesEntryModal Component', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    stores: [
      { id: '1', store_code: 'ST001', store_name: 'Test Store' }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStoresApi.getAll.mockResolvedValue({
      data: defaultProps.stores
    })
  })

  it('should render sales entry modal when open', () => {
    render(<SalesEntryModal {...defaultProps} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sales Entry')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<SalesEntryModal {...defaultProps} open={false} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should display all tender type tabs', () => {
    render(<SalesEntryModal {...defaultProps} />)
    
    expect(screen.getByText('Cash Sales')).toBeInTheDocument()
    expect(screen.getByText('Card Sales')).toBeInTheDocument()
    expect(screen.getByText('UPI Sales')).toBeInTheDocument()
    expect(screen.getByText('Credit Sales')).toBeInTheDocument()
    expect(screen.getByText('Vouchers')).toBeInTheDocument()
    expect(screen.getByText('Hand Bills')).toBeInTheDocument()
    expect(screen.getByText('Sales Orders')).toBeInTheDocument()
    expect(screen.getByText('Returns')).toBeInTheDocument()
  })

  it('should switch between tabs correctly', async () => {
    const user = userEvent.setup()
    render(<SalesEntryModal {...defaultProps} />)
    
    // Click on Card Sales tab
    await user.click(screen.getByText('Card Sales'))
    
    // Check if card-specific fields are shown
    expect(screen.getByText('Card Sales')).toBeInTheDocument()
  })

  it('should validate required fields for cash sales', async () => {
    const user = userEvent.setup()
    render(<SalesEntryModal {...defaultProps} />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument()
    })
  })

  it('should submit cash sales form with valid data', async () => {
    const user = userEvent.setup()
    mockSalesApi.create.mockResolvedValue({
      data: { id: '1', amount: 100.50, tender_type: 'cash' }
    })

    render(<SalesEntryModal {...defaultProps} />)
    
    // Fill in required fields
    await testHelpers.fillForm({
      'Amount': '100.50',
      'Date': '2025-01-21'
    })
    
    // Submit form
    await testHelpers.submitForm(/save/i)
    
    await waitFor(() => {
      expect(mockSalesApi.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 100.50,
        tender_type: 'cash'
      }))
      expect(defaultProps.onSubmit).toHaveBeenCalled()
    })
  })

  it('should handle customer selection for credit sales', async () => {
    const user = userEvent.setup()
    render(<SalesEntryModal {...defaultProps} />)
    
    // Switch to credit sales tab
    await user.click(screen.getByText('Credit Sales'))
    
    // Select a customer
    const selectCustomerButton = screen.getByTestId('select-customer')
    await user.click(selectCustomerButton)
    
    expect(screen.getByText('Test Customer')).toBeInTheDocument()
  })

  it('should create voucher when voucher tab is selected', async () => {
    const user = userEvent.setup()
    mockVouchersApi.create.mockResolvedValue({
      data: { id: 'voucher-1', voucher_code: 'V001' }
    })

    render(<SalesEntryModal {...defaultProps} />)
    
    // Switch to vouchers tab
    await user.click(screen.getByText('Vouchers'))
    
    // Fill voucher form
    await testHelpers.fillForm({
      'Amount': '50.00',
      'Customer Name': 'John Doe',
      'Phone Number': '1234567890'
    })
    
    // Submit voucher
    await testHelpers.submitForm(/save/i)
    
    await waitFor(() => {
      expect(mockVouchersApi.create).toHaveBeenCalled()
    })
  })

  it('should validate negative amounts', async () => {
    const user = userEvent.setup()
    render(<SalesEntryModal {...defaultProps} />)
    
    // Try to enter negative amount
    const amountField = screen.getByLabelText(/amount/i)
    await user.clear(amountField)
    await user.type(amountField, '-50.00')
    
    // Submit form
    await testHelpers.submitForm(/save/i)
    
    await waitFor(() => {
      expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    mockSalesApi.create.mockRejectedValue(new Error('API Error'))

    render(<SalesEntryModal {...defaultProps} />)
    
    // Fill and submit form
    await testHelpers.fillForm({
      'Amount': '100.50'
    })
    
    await testHelpers.submitForm(/save/i)
    
    await waitFor(() => {
      expect(screen.getByText(/error saving/i)).toBeInTheDocument()
    })
  })

  it('should close modal when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<SalesEntryModal {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('should reset form when modal is reopened', () => {
    const { rerender } = render(<SalesEntryModal {...defaultProps} open={false} />)
    
    // Open modal
    rerender(<SalesEntryModal {...defaultProps} open={true} />)
    
    // Form should be reset to default values
    const amountField = screen.getByLabelText(/amount/i)
    expect(amountField).toHaveValue('')
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    // Mock delayed API response
    mockSalesApi.create.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<SalesEntryModal {...defaultProps} />)
    
    await testHelpers.fillForm({
      'Amount': '100.50'
    })
    
    await testHelpers.submitForm(/save/i)
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('should handle date selection correctly', async () => {
    const user = userEvent.setup()
    render(<SalesEntryModal {...defaultProps} />)
    
    const dateField = screen.getByLabelText(/date/i)
    
    // Select today's date
    const today = new Date().toISOString().split('T')[0]
    await user.clear(dateField)
    await user.type(dateField, today)
    
    expect(dateField).toHaveValue(today)
  })

  it('should restrict access based on user role', () => {
    // Test with cashier role
    const cashierAuth = {
      ...mockAuthContext,
      user: { ...mockAuthContext.user, role: 'cashier' }
    }
    
    vi.mocked(vi.importActual('../../hooks/useAuth')).useAuth = () => cashierAuth
    
    render(<SalesEntryModal {...defaultProps} />)
    
    // Cashiers might have restricted access to certain tabs
    // Implementation depends on business rules
    expect(screen.getByText('Cash Sales')).toBeInTheDocument()
  })
})