# Approval Workflow System
## Daily Reporting System - Poppat Jamals

### Overview
The Approval Workflow System provides centralized management of transaction approvals with role-based access controls and bulk processing capabilities. This system ensures proper oversight of sales and expense transactions while maintaining operational efficiency.

### Key Features

#### 1. Centralized Approval Dashboard
- **Single Interface**: Unified dashboard for all pending approvals
- **Transaction Types**: Sales entries, expense entries (extensible for future types)
- **Real-time Updates**: Live status updates and automatic refresh
- **Role-Based Access**: Only Super Users and Accounts Incharge can access

#### 2. Role-Based Approval Authority
**Approval Permissions:**
- ✅ **Super User**: Can approve all transactions across all stores
- ✅ **Accounts Incharge**: Can approve all transactions across all stores
- ❌ **Store Manager**: No approval authority (removed for centralized control)
- ❌ **Cashier**: No approval authority

**Historical Data Access:**
- **Cashiers**: Limited to last 7 days of data
- **Store Managers**: Unlimited historical access (view only)
- **Accounts Incharge**: Unlimited historical access with approval rights
- **Super Users**: Unlimited historical access with approval rights

#### 3. Bulk Approval Operations
- **Multi-Select**: Checkbox selection for multiple transactions
- **Batch Processing**: Approve or reject multiple items simultaneously
- **Select All**: Quick selection of all visible items
- **Efficient Workflow**: Reduce time required for approval processing

#### 4. Enhanced Filtering System
- **Date Filtering**: Period-based selection (Today, Yesterday, Last 7 Days, etc.)
- **Store Filtering**: Filter by specific store locations
- **Status Filtering**: View pending, approved, or rejected items
- **Combined Filters**: Multiple filter criteria can be applied simultaneously

### Technical Architecture

#### Backend Implementation
**API Endpoints:**
- `PATCH /api/v1/sales/:saleId/approval` - Approve/reject sales entries
- `PATCH /api/v1/expenses/:expenseId/approval` - Approve/reject expense entries
- Role validation using `requireRole(['super_user', 'accounts_incharge'])`

**Database Schema:**
```sql
-- Sales table approval fields
approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))
approved_by UUID REFERENCES users(id)
approval_notes TEXT

-- Expenses table approval fields (same structure)
approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'))
approved_by UUID REFERENCES users(id)
approval_notes TEXT
```

#### Frontend Implementation
**Page Structure:**
- `/approvals` - Main approval dashboard (role-protected route)
- Tabbed interface separating Sales and Expenses
- Material-UI components for consistent UX

**Key Components:**
- `Approvals.tsx` - Main dashboard page
- `FilterBar.tsx` - Enhanced filtering with date ranges
- Role-based navigation in `Layout.tsx`

### User Workflows

#### Super User / Accounts Incharge Workflow
1. **Navigate to Approval Dashboard**
   - Access via main navigation menu
   - Role-based visibility (only appears for authorized users)

2. **View Pending Transactions**
   - Summary cards show total pending amounts
   - Separate tabs for Sales and Expenses
   - Real-time counts and totals

3. **Apply Filters**
   - Select date range (Today, Yesterday, Last 7 Days, etc.)
   - Filter by specific store (if managing multiple locations)
   - View filtered results instantly

4. **Process Approvals**
   - **Individual Approval**: Click ✓ (approve) or ✗ (reject) buttons
   - **Bulk Approval**: Select multiple items and use bulk action buttons
   - **Select All**: Use checkbox to select all visible items

5. **Monitor Progress**
   - Real-time updates as approvals are processed
   - Summary cards update automatically
   - Clear visual feedback for completed actions

#### Store Manager Workflow (View Only)
1. **View Transactions**
   - Access Sales and Expenses pages normally
   - See approval status indicators
   - No approval buttons visible (role-based hiding)

2. **Submit for Approval**
   - Create sales/expense entries as usual
   - Entries automatically set to 'pending' status
   - Await approval from authorized personnel

#### Cashier Workflow (Limited Access)
1. **Limited Historical Access**
   - Date filtering restricted to last 7 days maximum
   - Backend enforces access restrictions
   - Error messages for unauthorized date ranges

2. **Basic Entry**
   - Create sales entries within allowed timeframe
   - View own entries and their approval status
   - No approval capabilities

### Business Rules

#### Approval Authority
- Only Super Users and Accounts Incharge can approve transactions
- Store Managers cannot approve any transactions (centralized control)
- Approval decisions are final and tracked with user ID and timestamp

#### Historical Data Access
- Cashiers: Maximum 7 days of historical data access
- All other roles: Unlimited historical data access
- Backend enforces restrictions with 403 errors for violations

#### Bulk Operations
- Maximum bulk approval size limited by frontend (typically 50-100 items)
- All items in bulk operation must be 'pending' status
- Failed bulk operations roll back completely (all-or-nothing)

### Security Considerations

#### Authentication & Authorization
- JWT-based authentication required for all approval operations
- Role-based middleware validates user permissions
- API endpoints protected with `requireRole()` middleware

#### Audit Trail
- All approval actions logged with user ID and timestamp
- Approval notes stored for rejection reasons
- Complete audit trail maintained for compliance

#### Data Validation
- Approval status must be 'pending' before approval/rejection
- Invalid status transitions prevented
- SQL constraints enforce valid approval states

### Performance Optimization

#### Frontend Optimization
- Lazy loading for large transaction lists
- Pagination support (limit 50-100 items per page)
- Debounced search and filtering
- Optimistic UI updates for better responsiveness

#### Backend Optimization
- Database indexing on approval_status and date fields
- Efficient queries with proper filtering
- Bulk operation optimization using Promise.all()
- Rate limiting to prevent abuse

### Future Enhancements

#### Planned Features
1. **Additional Transaction Types**
   - Handbill conversions
   - Damage reports
   - Inventory adjustments

2. **Advanced Approval Rules**
   - Amount-based approval thresholds
   - Multi-level approval workflows
   - Conditional approval rules

3. **Enhanced Notifications**
   - Email alerts for pending approvals
   - Slack integration for team notifications
   - Mobile push notifications

4. **Approval Analytics**
   - Approval time metrics
   - User approval statistics
   - Trend analysis and reporting

#### POS Integration Readiness
- Framework designed for automatic approval based on POS matching
- Hooks for external validation systems
- Discrepancy flagging and manual review workflows

### Troubleshooting

#### Common Issues
1. **Sales Approval 500 Error**
   - Ensure `approval_notes` column exists in sales table
   - Run: `ALTER TABLE sales ADD COLUMN approval_notes TEXT;`

2. **Access Denied Errors**
   - Verify user role in database
   - Check JWT token validity
   - Confirm role-based route protection

3. **Bulk Approval Failures**
   - Check transaction status (must be 'pending')
   - Verify all selected items are valid
   - Monitor network connectivity for large batches

### API Reference

#### Approve Sales Entry
```http
PATCH /api/v1/sales/:saleId/approval
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "approval_status": "approved|rejected",
  "approval_notes": "Optional approval notes"
}
```

#### Approve Expense Entry
```http
PATCH /api/v1/expenses/:expenseId/approval
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "approval_status": "approved|rejected", 
  "approval_notes": "Optional approval notes"
}
```

#### Response Format
```json
{
  "message": "Sales entry approved successfully",
  "sale": {
    "id": "uuid",
    "approval_status": "approved",
    "approved_by": "user_uuid",
    "approval_notes": "string",
    // ... other fields
  }
}
```

### Conclusion
The Approval Workflow System provides a robust, scalable foundation for transaction management with proper role-based controls and efficient bulk processing capabilities. The centralized approach ensures consistent oversight while maintaining operational efficiency through modern UX patterns and optimized performance.