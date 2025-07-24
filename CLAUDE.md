# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DSR Simplified is a Daily Sales Reporting system for Poppat Jamals retail company. It's a full-stack JavaScript monorepo with a Node.js/Express backend and React/TypeScript frontend, using PostgreSQL via Supabase.

## Development Commands

### Running the Application
```bash
# Install all dependencies (run from root)
npm run install:all

# Development mode (runs both backend and frontend)
npm run dev

# Backend only (port 3004)
cd backend && npm run dev

# Frontend only (port 3003)
cd web && npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Backend tests with watch mode
cd backend && npm run test:watch

# Frontend tests
cd web && npm test

# Visual test UI
cd backend && npm run test:ui
```

### Code Quality
```bash
# Lint all code
npm run lint

# TypeScript checking (frontend)
cd web && npm run type-check
```

### Database
```bash
cd backend
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database
```

## Architecture

### Monorepo Structure
- `/backend` - Express.js API server with JWT auth and Supabase integration
- `/web` - React 19 SPA with Material-UI and TypeScript
- `/docs` - Comprehensive documentation (requirements, database schema, guides)
- `/scripts` - Data management and utility scripts

### API Design
- RESTful API with `/api/v1` prefix
- Role-based access control (RBAC) with 4 tiers: Super User, Accounts Incharge, Store Manager, Cashier
- Hybrid authentication: Google SSO for management, JWT for cashiers
- Middleware stack: authentication, role validation, store access control

### Frontend Architecture
- React Router v6 for navigation
- Custom `useAuth` hook for authentication state
- Material-UI components with standardized form patterns
- Date handling with date-fns
- Environment-based API configuration

### Database Schema
- PostgreSQL via Supabase with RLS (Row Level Security)
- Key tables: users, stores, sales, expenses, gift_vouchers, customers
- Approval workflow system for expenses and vouchers
- Store-based data isolation with origin tracking
- **Customer origin_store_id tracking** - Recently implemented for cross-store operations

## Key Development Patterns

### Form Standardization (✅ Recently Completed)
The project uses a standardized form component pattern located in `/web/src/components/forms/`. **All forms have been unified and deduplicated as of July 2025:**

#### **Available Standardized Forms:**
- `VoucherForm.tsx` - Gift voucher creation/editing
- `HandBillForm.tsx` - Hand bill entry with customer selection
- `SalesOrderForm.tsx` - Sales order creation with customer requirement
- `ReturnForm.tsx` - Return/RRN processing with payment methods

#### **Form Integration Status:**
- ✅ **SalesEntryModal** - All embedded forms replaced with standardized components
- ✅ **Standalone Pages** - Vouchers, HandBills, SalesOrders pages use shared forms
- ✅ **Store Validation** - Super users/accounts incharge must select store manually
- ✅ **Role-based Logic** - Store managers/cashiers have auto-populated stores

#### **Form Development Guidelines:**
1. **Reuse existing forms** instead of creating duplicates
2. Use `showStoreSelector` prop for super users and accounts incharge
3. Pass `storeId` prop when store selection is required
4. Handle `customer_id` and `origin_store_id` for customer tracking
5. Follow the validation patterns with proper error handling
6. Use wrapper functions for API integration in parent components

### API Integration
- All API calls go through `/web/src/api/` service modules
- Use the authenticated axios instance for protected endpoints
- Handle errors consistently with try-catch blocks
- Display user-friendly error messages

### Testing Approach
- Backend: Integration tests for API endpoints with database
- Frontend: Component tests focusing on user interactions
- Test data utilities in `__tests__/setup/`
- Mock authentication for protected route tests

### Performance Considerations
- Dashboard uses consolidated API calls to reduce load time
- Implement caching where appropriate (store dropdowns, user data)
- Use React.memo for expensive component renders
- Lazy load routes and components

## Current Development Focus

Based on TODO.md updates (July 2025):

### **Completed Major Milestones:**
- ✅ **Form Standardization** - 90% code duplication reduction achieved
- ✅ **Store Access Control** - Proper validation for super users and accounts incharge
- ✅ **Customer Origin Tracking** - Full implementation with store validation

### **Remaining Tasks:**
- [ ] **Returns Page Creation** - No dedicated Returns page exists yet (API available)
- [ ] **Frontend Caching** - Store dropdown and user data caching
- [ ] **Form Testing** - Comprehensive testing of form consistency
- [ ] **Performance Optimization** - Query result caching and connection pooling

## Important Business Logic

### Sales Management
- Multiple tender types: cash, credit, card, UPI, Paytm, gift voucher
- Customer phone-based deduplication
- Daily sales submission with manager approval

### Expense Tracking
- Petty cash management with approval workflows
- Category-based expense tracking
- Store-specific expense limits

### Multi-Store Support
- Currently 5 stores (CBD, FSN, LVG, SBR, IBR)
- Store access based on user role and assignment
- Origin store tracking for cross-store operations

### Approval Workflows
- Centralized approval dashboard for managers
- Status tracking: pending, approved, rejected
- Audit trail with timestamps and approver info