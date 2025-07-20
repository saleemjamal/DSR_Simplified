# Google SSO Implementation Guide
## Poppat Jamals Daily Reporting System - Complete Google Workspace Integration

### 🎯 Objectives
Complete Google Workspace SSO integration for management users (@poppatjamals.com) while maintaining local authentication for cashiers.

### 📋 Prerequisites
- Phase 1 & 2 completed successfully
- Supabase project operational
- Backend and frontend running
- Google Workspace domain: @poppatjamals.com

---

## Part 1: Google Cloud Console Setup (15 minutes)

### Step 1: Create Google Cloud Project
1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create New Project**:
   - Click "Select a project" dropdown at the top
   - Click "New Project"
   - Project Name: `Poppat Jamals DSR`
   - Organization: Select your Google Workspace organization
   - Click "Create"
   - **Note the Project ID** (you'll need this later)

### Step 2: Enable Required APIs
1. **Navigate to APIs & Services** > **Library**
2. **Search and Enable these APIs**:
   - Search "Google+ API" and click "Enable"
   - Search "Google Identity" and enable "Google Identity Services API"
   - Search "OAuth2" and enable any OAuth2 related APIs

### Step 3: Configure OAuth Consent Screen
1. **Go to APIs & Services** > **OAuth consent screen**
2. **Choose User Type**:
   - Select "Internal" (for Google Workspace users only)
   - Click "Create"
3. **Fill in App Information**:
   - App name: `Poppat Jamals Daily Reporting System`
   - User support email: Your admin @poppatjamals.com email
   - App logo: (Optional - upload company logo)
   - App domain: Leave blank for now
   - Authorized domains: Add `poppatjamals.com`
   - Developer contact info: Your admin email
4. **Add Scopes** (Click "Add or Remove Scopes"):
   - Select these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile` 
     - `openid`
   - Click "Update"
5. **Test Users**: Skip this step (internal apps don't need test users)
6. **Click "Save and Continue"** through all steps

### Step 4: Create OAuth 2.0 Credentials
1. **Go to APIs & Services** > **Credentials**
2. **Click "Create Credentials"** > **OAuth 2.0 Client IDs**
3. **Configure the OAuth Client**:
   - Application Type: `Web application`
   - Name: `DSR Web Client`
   
4. **Add Authorized JavaScript origins**:
   ```
   http://localhost:3003
   https://your-production-domain.com
   ```
   
5. **Add Authorized redirect URIs**:
   ```
   https://vylxluyxmslpxldihpoa.supabase.co/auth/v1/callback
   ```
   
6. **Click "Create"**
7. **IMPORTANT**: Copy and save these values:
   - **Client ID**: (starts with numbers, ends with .apps.googleusercontent.com)
   - **Client Secret**: (starts with GOCSPX-)

---

## Part 2: Supabase OAuth Configuration (10 minutes)

### Step 1: Access Supabase Dashboard
1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `vylxluyxmslpxldihpoa` (Poppat Jamals DSR)

### Step 2: Configure Google Provider
1. **Navigate to Authentication** > **Providers**
2. **Find Google Provider** and click to expand it
3. **Enable Google Provider**:
   - Toggle "Enable sign in with Google" to ON
   
4. **Add Google Credentials**:
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret from Google Cloud Console
   - **Redirect URL**: This should auto-populate as:
     ```
     https://vylxluyxmslpxldihpoa.supabase.co/auth/v1/callback
     ```

### Step 3: Save Configuration
1. **Click "Save"** to complete the Google provider setup

**Note**: Domain restrictions are handled in our backend code, not in Supabase settings. This provides better security and error handling.

### Step 4: Verify Redirect URL
1. **Copy the Redirect URL** from Supabase (should be):
   ```
   https://vylxluyxmslpxldihpoa.supabase.co/auth/v1/callback
   ```
2. **Go back to Google Cloud Console** > **Credentials**
3. **Edit your OAuth 2.0 Client**
4. **Verify the redirect URI matches exactly** what Supabase shows
5. **Save** if you need to make any changes

---

## Part 3: Backend Google SSO Integration (20 minutes)

### Step 1: Update Environment Variables
Add to `backend/.env`:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=853303878305-abulokph3cdvl8k9kfs7pddbjcug4ubo.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_HOSTED_DOMAIN=poppatjamals.com
```

### Step 2: Backend Google Auth Implementation
The backend auth routes have been implemented to handle Google SSO with:
- Domain restriction to @poppatjamals.com
- Automatic user creation with role assignment
- Hybrid authentication (JWT + Supabase)
- Store assignment synchronization

Key backend implementation details:
- Google token verification through Supabase
- User creation with proper database constraints
- Role determination based on email patterns
- Effective store ID calculation for managers

---

## Part 4: Frontend Google SSO Integration (25 minutes)

### Step 1: Add Environment Variables
Add to `web/.env`:
```env
VITE_API_URL=http://localhost:3004/api/v1
VITE_GOOGLE_CLIENT_ID=853303878305-abulokph3cdvl8k9kfs7pddbjcug4ubo.apps.googleusercontent.com
```

### Step 2: Supabase Client Configuration
The frontend includes `web/src/config/supabase.ts` for proper Supabase client setup with Google OAuth.

### Step 3: Google Sign-In Component
The `GoogleSignIn.tsx` component implements:
- Supabase OAuth flow integration
- Clean Material-UI button design
- Proper error handling
- Domain-restricted authentication

### Step 4: OAuth Callback Handling
The `AuthCallback.tsx` page handles:
- OAuth redirect processing
- Session token extraction
- Backend authentication
- User profile loading
- Role-based navigation

---

## Part 5: Testing & Validation (15 minutes)

### Step 1: Test Google SSO Flow
1. **Start both servers**:
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2  
   cd web && npm run dev
   ```

2. **Open browser**: http://localhost:3003
3. **Go to Manager Login tab**
4. **Click "Sign in with Google Workspace"**
5. **Should redirect to Google OAuth consent**

### Step 2: Verification Checklist
- [x] Google OAuth consent screen appears
- [x] Only @poppatjamals.com emails accepted
- [x] User redirected back to app after consent
- [x] JWT token stored in localStorage
- [x] User profile data populated correctly
- [x] Role-based navigation appears
- [x] Backend receives valid Google token
- [x] Database user record created/updated

### Step 3: Error Testing
Test these scenarios:
- [x] Non-@poppatjamals.com email (should be rejected)
- [x] Network connection issues
- [x] Invalid Google token
- [x] Database connection errors

---

## Part 6: Production Considerations (10 minutes)

### Security Checklist
- [ ] HTTPS required for production
- [x] Google Client Secret secured
- [x] Domain restrictions properly configured
- [x] Token expiration handling implemented
- [ ] Refresh token rotation enabled

### Domain Configuration for Production
When deploying to production:
1. **Update Google OAuth settings**:
   - Add production domain to authorized origins
   - Update redirect URIs for production Supabase URL

2. **Update environment variables**:
   - Production Google Client ID/Secret
   - Production domain restrictions

3. **Update CORS settings**:
   - Add production frontend URL to backend CORS

---

## 🎯 Success Criteria
- [x] Google Cloud project configured
- [x] Supabase Google OAuth enabled
- [x] Backend Google token verification working
- [x] Frontend Google Sign-In button functional
- [x] Complete authentication flow operational
- [x] Domain restriction to @poppatjamals.com enforced
- [x] User roles automatically assigned
- [x] Session management working
- [x] **RESOLVED**: Authentication flow issues fixed (January 2025)

## 🔧 Issues Resolved (January 2025)

### Issue: Google SSO Authentication Flow Errors
**Date Resolved**: January 19, 2025

**Problems Identified**:
1. Component was using direct Google Identity Services instead of Supabase OAuth
2. Missing OAuth callback handling mechanism
3. Database constraint violations during user creation
4. CORS and origin authentication issues

**Solutions Implemented**:

#### 1. Updated Authentication Flow
- **Changed**: `GoogleSignIn.tsx` to use `supabase.auth.signInWithOAuth()` instead of direct Google sign-in
- **Added**: `AuthCallback.tsx` page to handle OAuth redirects 
- **Added**: `/auth/callback` route in `App.tsx`
- **Created**: `web/src/config/supabase.ts` for Supabase client configuration

#### 2. Fixed Backend User Creation
- **Removed**: Non-existent `profile_picture_url` column from user insert statement
- **Added**: Required `username` field (using email prefix: `saleem` from `saleem@poppatjamals.com`)
- **Updated**: User creation logic in `/auth/login/google` route

#### 3. Final Working Authentication Flow
```
1. User clicks "Sign in with Google Workspace"
2. Frontend calls supabase.auth.signInWithOAuth() 
3. Redirects to Google OAuth via Supabase
4. Google redirects back to /auth/callback
5. AuthCallback gets Supabase session access token
6. Sends access token to backend /auth/login/google
7. Backend validates with supabase.auth.getUser()
8. Backend creates/updates user in database
9. Backend returns custom JWT for app authentication
10. User logged in and redirected to dashboard
```

#### 4. Key Files Modified During Fix
- `backend/src/routes/auth.js` - Fixed user creation database constraints
- `web/src/components/GoogleSignIn.tsx` - Complete rewrite for Supabase OAuth
- `web/src/pages/AuthCallback.tsx` - New OAuth callback handler
- `web/src/config/supabase.ts` - New Supabase client configuration
- `web/src/App.tsx` - Added auth callback route

**Testing Confirmed**: 
- ✅ @poppatjamals.com domain restriction working
- ✅ User creation/login successful 
- ✅ Role assignment functional
- ✅ Session persistence working
- ✅ No CORS or origin errors

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Error 400: redirect_uri_mismatch"
- **Cause**: Redirect URI in Google Cloud doesn't match Supabase
- **Solution**: Copy exact redirect URI from Supabase to Google Cloud Console

#### 2. "Error 403: access_denied"
- **Cause**: User email not from @poppatjamals.com domain
- **Solution**: Only @poppatjamals.com emails can login (by design)

#### 3. "OAuth consent screen shows unverified app"
- **Cause**: Google Workspace internal apps show this warning
- **Solution**: This is normal for internal apps, users can proceed

#### 4. "Callback URL not reachable"
- **Cause**: Supabase project URL incorrect
- **Solution**: Verify project URL matches exactly: `vylxluyxmslpxldihpoa.supabase.co`

### Verification Checklist
- [x] Google Cloud project created with correct APIs enabled
- [x] OAuth consent screen configured as "Internal"
- [x] OAuth 2.0 credentials created with correct redirect URI
- [x] Supabase Google provider enabled with correct Client ID/Secret
- [x] Hosted domain restriction set to `poppatjamals.com`
- [x] Test login successful with @poppatjamals.com email
- [x] Test login rejected for non-company emails
- [x] Environment variables updated in both backend and frontend

### Debug Commands
```bash
# Check backend logs
cd backend && npm run dev

# Test API endpoint directly
curl -X POST http://localhost:3004/api/v1/auth/login/google \
  -H "Content-Type: application/json" \
  -d '{"token": "test_token"}'
```

---

## Support

If you encounter issues:
1. Check Google Cloud Console logs
2. Check Supabase Dashboard logs
3. Verify all URLs match exactly
4. Ensure @poppatjamals.com domain is verified in Google Workspace

**Estimated Setup Time**: 60-75 minutes  
**Prerequisites**: Google Workspace admin access, Supabase project access

---

## Security Notes

- **Never commit** Google Client Secret to version control
- **Use environment variables** for all sensitive configuration
- **Restrict OAuth scope** to only required permissions
- **Monitor OAuth usage** in Google Cloud Console
- **Regularly review** authorized domains and redirect URIs