# Enhanced Date Filtering System
## Daily Reporting System - Poppat Jamals

### Overview
The Enhanced Date Filtering System provides comprehensive historical data access with role-based restrictions and intuitive period selection. This system replaces the previous "today-only" limitation with flexible date ranges while maintaining appropriate access controls.

### Key Features

#### 1. Period-Based Filtering
**Available Periods:**
- **Today**: Current date transactions
- **Yesterday**: Previous day transactions  
- **Last 7 Days**: Rolling 7-day period
- **This Week**: Monday to Sunday of current week
- **Last Week**: Monday to Sunday of previous week
- **This Month**: 1st to last day of current month
- **Last Month**: 1st to last day of previous month

#### 2. Role-Based Access Controls
**Access Restrictions:**
- **Cashiers**: Limited to last 7 days maximum
  - Can select: Today, Yesterday, Last 7 Days only
  - Backend enforces restrictions with 403 errors
- **Store Managers**: Unlimited historical access
  - All period options available
  - Full date range capabilities
- **Accounts Incharge**: Unlimited historical access
  - All period options available
  - Cross-store filtering capabilities
- **Super Users**: Unlimited historical access
  - All period options available
  - System-wide access

#### 3. Consolidated Filter Interface
**Unified FilterBar Component:**
- Combines date filtering with existing store filtering
- Industry-standard single filter bar pattern (like Stripe, Google Analytics)
- Material-UI ButtonGroup for period selection
- Conditional store dropdown for authorized users

#### 4. Smart Date Range Calculation
**Automatic Range Generation:**
- Week calculations start on Monday (configurable)
- Month calculations use actual month boundaries
- Timezone-aware date calculations
- Consistent date formatting (yyyy-MM-dd)

### Technical Implementation

#### Frontend Architecture

**FilterBar Component Enhancement:**
```typescript
interface FilterState {
  // Date filtering
  period: string
  dateFrom?: string
  dateTo?: string
  // Store filtering  
  store_id: string
  store_name?: string
}

// Role-based date options
const dateOptions = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  ...(isCashier ? [] : [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ])
]
```

**Date Range Calculation:**
```typescript
const calculateDateRange = (period: string) => {
  const today = new Date()
  
  switch (period) {
    case 'today':
      return { from: format(today, 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case 'last_7_days':
      return { from: format(subDays(today, 6), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case 'this_week':
      return { 
        from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), 
        to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') 
      }
    // ... other cases
  }
}
```

#### Backend Implementation

**Enhanced API Support:**
```javascript
// Updated route parameters
const { date, dateFrom, dateTo, store_id, page = 1, limit = 50 } = req.query

// Role-based date restrictions
if (req.user.role === 'cashier') {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const maxFromDate = sevenDaysAgo.toISOString().split('T')[0]
  
  if (dateFrom && dateFrom < maxFromDate) {
    return res.status(403).json({ 
      error: 'Access denied: Cashiers can only view data from the last 7 days' 
    })
  }
}
```

**Database Query Optimization:**
```javascript
// Flexible date filtering
if (date) {
  // Single date filter (backwards compatibility)
  query = query.eq('sale_date', date)
} else if (dateFrom || dateTo) {
  // Date range filtering
  if (dateFrom) query = query.gte('sale_date', dateFrom)
  if (dateTo) query = query.lte('sale_date', dateTo)
} else {
  // Default to today if no filters
  const today = new Date().toISOString().split('T')[0]
  query = query.eq('sale_date', today)
}
```

### User Experience

#### FilterBar Interface
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Filter Transactions: 📅 [Today][Yesterday][Last 7 Days]     │
│                             │ Store: [All Stores ▼]              │
│                             ⚡ Clear All    Showing: Today • All │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Indicators:**
- Selected period highlighted with primary color
- Active filter status displayed on right
- Clear all button appears when filters applied
- Store dropdown conditional on user role

#### Page Integration

**Sales & Expenses Pages:**
- FilterBar integrated above transaction tables
- Real-time filtering without page refresh
- Loading states during data fetch
- Updated table headers ("Sales Entries" vs "Today's Sales Entries")

### API Reference

#### Enhanced Endpoints

**Sales with Date Filtering:**
```http
GET /api/v1/sales?dateFrom=2025-07-01&dateTo=2025-07-07&store_id=uuid
GET /api/v1/sales?date=2025-07-20  # Single date (backwards compatible)
```

**Expenses with Date Filtering:**
```http
GET /api/v1/expenses?dateFrom=2025-07-01&dateTo=2025-07-07&store_id=uuid
GET /api/v1/expenses?date=2025-07-20  # Single date (backwards compatible)
```

**Sales Summary with Date Filtering:**
```http
GET /api/v1/sales/summary?dateFrom=2025-07-01&dateTo=2025-07-07&store_id=uuid
```

#### Error Responses

**Cashier Access Restriction:**
```json
{
  "error": "Access denied: Cashiers can only view sales from the last 7 days"
}
```

### Business Rules

#### Date Access Policies
1. **Cashier Restrictions**
   - Maximum 7 days historical access
   - Backend validation prevents circumvention
   - Frontend hides unavailable options

2. **Manager Access**
   - Unlimited historical data access
   - Can view all date ranges
   - Store-specific data only (unless super user)

3. **Default Behavior**
   - System defaults to "Today" when no filters applied
   - Maintains backward compatibility with existing integrations
   - Graceful fallback for invalid date ranges

#### Performance Considerations
1. **Query Optimization**
   - Database indexes on date fields
   - Efficient range queries using GTE/LTE
   - Pagination limits prevent large result sets

2. **Frontend Optimization**
   - Debounced filter changes
   - Loading states for better UX
   - Optimistic updates where possible

### Security Implementation

#### Access Control Validation
```javascript
// Backend role validation
if (req.user.role === 'cashier') {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const maxFromDate = sevenDaysAgo.toISOString().split('T')[0]
  
  if (dateFrom && dateFrom < maxFromDate) {
    return res.status(403).json({ 
      error: 'Access denied: Cashiers can only view data from the last 7 days' 
    })
  }
}
```

#### Frontend Role Filtering
```typescript
// Conditional period options
const dateOptions = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' }, 
  { value: 'last_7_days', label: 'Last 7 Days' },
  ...(isCashier ? [] : [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ])
]
```

### Migration from Previous System

#### Backward Compatibility
- Existing `date` parameter still supported
- Single date queries work unchanged  
- Legacy integrations continue functioning

#### Enhanced Capabilities
- Range queries using `dateFrom` and `dateTo`
- Period shortcuts for common selections
- Role-based restrictions enforced

### Integration Points

#### Page Components
**Updated Components:**
- `web/src/pages/Sales.tsx` - Enhanced filtering
- `web/src/pages/Expenses.tsx` - Enhanced filtering  
- `web/src/pages/Approvals.tsx` - Approval dashboard filtering
- `web/src/components/FilterBar.tsx` - Core filtering logic

#### Backend Routes
**Enhanced Routes:**
- `backend/src/routes/sales.js` - Date range support
- `backend/src/routes/expenses.js` - Date range support
- Role-based access validation added

### Troubleshooting

#### Common Issues

1. **Cashier Access Denied**
   - **Symptom**: 403 error when selecting older dates
   - **Cause**: Date range exceeds 7-day limit
   - **Solution**: Select within allowed range

2. **Filter Not Working**
   - **Symptom**: Data doesn't update after filter change
   - **Cause**: Network error or backend issue
   - **Solution**: Check backend logs, verify authentication

3. **Wrong Date Calculations**
   - **Symptom**: Week/month ranges incorrect
   - **Cause**: Timezone or locale settings
   - **Solution**: Verify date-fns configuration

### Future Enhancements

#### Planned Features
1. **Custom Date Picker**
   - Manual date range selection
   - Calendar interface for date selection
   - Saved date range presets

2. **Advanced Filtering**
   - Amount range filtering
   - Transaction type filtering
   - Combined filter persistence

3. **Export Integration**
   - Export filtered data to CSV/Excel
   - Scheduled report generation
   - Email delivery of filtered reports

### Performance Metrics

#### Target Performance
- **Filter Response Time**: < 500ms
- **Large Date Range**: < 2 seconds for monthly data
- **Database Query Time**: < 100ms for indexed queries
- **Frontend Rendering**: < 200ms for filter updates

#### Monitoring
- Track filter usage patterns
- Monitor query performance
- Alert on slow responses
- User experience analytics

### Conclusion
The Enhanced Date Filtering System provides flexible, secure access to historical data while maintaining appropriate role-based restrictions. The unified FilterBar approach follows industry standards and provides an intuitive user experience that scales efficiently across the application.