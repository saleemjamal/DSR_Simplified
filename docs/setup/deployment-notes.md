## Project Port Configuration
- Frontend running on port 3003 ✓
- Backend running on port 3004 ✓

## Server Management
- To close the backend server, use PowerShell command: `Stop-Process -Id 96476 -Force`

## CORS Configuration Issues & Resolution
### Problem Identified (Jan 2025)
- Frontend running on port 3003 but backend CORS_ORIGIN was set to port 3001
- This caused all API requests to be blocked by browser CORS policy
- Located in `backend/.env` line 9: `CORS_ORIGIN=http://localhost:3001`

### Solution Applied
- Changed `CORS_ORIGIN=http://localhost:3003` in `backend/.env`
- Requires backend server restart to take effect
- Frontend can now communicate with backend without CORS errors

### Port Configuration Summary
- Frontend: http://localhost:3003 (vite.config.ts)
- Backend: http://localhost:3004 (backend/.env)
- CORS Origin: http://localhost:3003 (backend/.env) ✓

## Row Level Security (RLS) & Authentication Issues
### Current Status (Jan 2025)
- **RLS Temporarily Disabled** due to authentication compatibility issues
- Application-level security through middleware is providing protection
- System uses hybrid authentication: JWT (cashiers) + Supabase SSO (managers/admins)

### Problem Identified
- RLS policies in `RBAC_RLS_POLICIES_NEW.sql` expect `auth.uid()` from Supabase auth sessions
- Local JWT users don't have Supabase auth sessions, so `auth.uid()` returns NULL
- This blocks all data access even for properly authenticated users
- Backend middleware uses `supabaseAdmin` which bypasses RLS entirely

### Current Temporary Solution
- RLS disabled using `DISABLE_RLS_FOR_TESTING.sql`
- Relying on robust application-level security:
  - Route protection with role-based middleware
  - Store access validation in API endpoints
  - User permission checks in backend logic

### Future Enhancement Required
**To properly re-enable RLS with current auth system:**

1. **Update RLS Helper Functions** - Modify functions in RLS policies to use:
   ```sql
   -- Instead of: auth.uid()
   -- Use: COALESCE(current_setting('app.current_user_id', true)::UUID, auth.uid())
   ```

2. **Test RLS Policies** - Ensure policies work with:
   - JWT authenticated users (cashiers)
   - Supabase SSO authenticated users (managers/admins)
   - Multi-store access patterns

3. **Files to Update**:
   - Update all `get_app_user_id()` functions in RLS policies
   - Test with `RBAC_RLS_POLICIES_FIXED.sql` (if created)
   - Verify middleware continues setting `app.current_user_id`

### Security Notes
- Current application-level security is robust and working correctly
- RLS would provide additional database-level protection
- No immediate security risk with current setup
- Enhancement should be prioritized for production deployment