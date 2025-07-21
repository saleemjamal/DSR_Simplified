# Testing Guide - DSR Simplified

This guide covers the testing infrastructure and best practices for the DSR Simplified project.

## Testing Stack (2025)

### Backend Testing
- **Framework**: Vitest 3.2.4 (migrated from Jest)
- **HTTP Testing**: Supertest 7.1.3
- **Database Testing**: Direct Supabase integration with test isolation

### Frontend Testing
- **Framework**: Vitest 3.2.4 with jsdom
- **Component Testing**: React Testing Library 16.1.0
- **User Interaction**: @testing-library/user-event 14.5.2

## Project Structure

```
backend/
├── src/
│   └── __tests__/
│       ├── integration/
│       │   ├── auth.test.js          # Authentication API tests
│       │   ├── sales.test.js         # Sales API tests
│       │   └── database.test.js      # Database integration tests
│       └── setup/
│           ├── testSetup.js          # Global test configuration
│           └── testDb.js             # Database test utilities
├── vitest.config.js                 # Vitest configuration
└── .env.test                        # Test environment variables

web/
├── src/
│   └── __tests__/
│       ├── components/
│       │   ├── Layout.test.tsx       # Layout component tests
│       │   ├── SalesEntryModal.test.tsx
│       │   └── ProtectedRoute.test.tsx
│       ├── pages/                    # Page component tests
│       ├── utils/
│       │   └── test-utils.tsx        # Custom testing utilities
│       └── setup/
│           └── test-setup.ts         # Global test setup
├── vitest.config.ts                 # Vite/Vitest configuration
└── src/vite-env.d.ts                # TypeScript declarations
```

## Running Tests

### Backend Tests
```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:ui          # Visual test UI
```

### Frontend Tests
```bash
cd web
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:ui          # Visual test UI
```

### Coverage Reports
```bash
npm test -- --coverage   # Generate coverage report
```

## Test Categories

### 1. Backend Integration Tests

#### Authentication Tests (`auth.test.js`)
- Local login validation
- JWT token generation and validation
- Google SSO integration
- Role-based access control
- Error handling and security

#### Sales API Tests (`sales.test.js`)
- CRUD operations for sales
- Store-based access control
- Tender type validation
- Date filtering and pagination
- Role-based data access

#### Database Tests (`database.test.js`)
- Data integrity and constraints
- Referential integrity
- Row Level Security (when enabled)
- Performance and indexing
- Cascading operations

### 2. Frontend Component Tests

#### Layout Tests (`Layout.test.tsx`)
- Navigation rendering and interaction
- Role-based menu visibility
- Responsive behavior
- User menu functionality

#### SalesEntryModal Tests (`SalesEntryModal.test.tsx`)
- Form validation and submission
- Multi-tab functionality
- Customer selection
- API integration
- Error handling

#### ProtectedRoute Tests (`ProtectedRoute.test.tsx`)
- Authentication requirements
- Role-based access control
- Redirection logic
- Loading states

## Testing Best Practices

### Backend Testing

1. **Use Test Database Isolation**
   ```javascript
   // Always clean up after tests
   afterEach(async () => {
     await testDbUtils.cleanup()
   })
   ```

2. **Mock External Services**
   ```javascript
   // Mock Supabase Auth for Google SSO
   vi.mock('@supabase/supabase-js', () => ({
     createClient: () => mockSupabaseClient
   }))
   ```

3. **Test Security Boundaries**
   ```javascript
   // Test that users can only access their store's data
   expect(response.body.data.every(sale => 
     sale.store_id === userStoreId
   )).toBe(true)
   ```

### Frontend Testing

1. **Use Custom Render with Providers**
   ```tsx
   import { render } from '../utils/test-utils'
   
   // Automatically wraps with Router, Theme, etc.
   render(<Component />)
   ```

2. **Test User Interactions**
   ```tsx
   const user = userEvent.setup()
   await user.click(screen.getByRole('button'))
   await user.type(screen.getByLabelText(/name/i), 'John')
   ```

3. **Mock API Calls**
   ```tsx
   vi.mock('../../services/api', () => ({
     salesApi: {
       create: vi.fn().mockResolvedValue({ data: mockSale })
     }
   }))
   ```

4. **Test Loading and Error States**
   ```tsx
   // Test loading state
   expect(screen.getByTestId('loading')).toBeInTheDocument()
   
   // Test error handling
   expect(screen.getByText(/error occurred/i)).toBeInTheDocument()
   ```

## Environment Setup

### Test Environment Variables

Backend `.env.test`:
```env
NODE_ENV=test
SUPABASE_URL=your_test_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_test_service_key
JWT_SECRET=test_jwt_secret_minimum_32_characters
PORT=3005
BCRYPT_SALT_ROUNDS=4  # Faster for tests
```

### Database Testing Strategy

1. **Use Test Schema** (Recommended for production)
   - Create separate test schema in same database
   - Faster than spinning up separate database
   - Good isolation between test and dev data

2. **Test Data Management**
   - Use factory functions for consistent test data
   - Clean up test data after each test suite
   - Use transactions for test isolation when possible

3. **Mock vs Integration**
   - Mock external services (Google Auth, email)
   - Use real database for data integrity tests
   - Mock time-dependent functions

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Coverage Targets

- **Backend**: 80% coverage for critical paths
- **Frontend**: 70% coverage for components
- **Focus on**: Authentication, data validation, role-based access

## Debugging Tests

### Debug Test Failures
```bash
# Run specific test
npm test -- auth.test.js

# Debug mode
npm test -- --inspect-brk auth.test.js

# Verbose output
npm test -- --reporter=verbose
```

### Common Issues

1. **Database Connection Errors**
   - Verify test environment variables
   - Check Supabase connection

2. **Async Test Failures**
   - Use `waitFor` for async operations
   - Ensure proper cleanup

3. **Component Test Failures**
   - Check if all providers are wrapped
   - Verify mock implementations

## Future Enhancements

1. **E2E Testing**: Add Playwright for full user journey tests
2. **Visual Regression**: Add visual testing for UI components
3. **Performance Testing**: Load testing for API endpoints
4. **Contract Testing**: API contract testing between frontend/backend

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/local-development/testing/overview)
- [Testing Best Practices](https://github.com/goldbergyoni/nodejs-testing-best-practices)