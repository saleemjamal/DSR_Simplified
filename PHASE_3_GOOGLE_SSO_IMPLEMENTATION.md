# Phase 3 Google SSO Implementation Guide
## Poppat Jamals Daily Reporting System - Google Workspace Integration

### 🎯 Objectives
Complete Google Workspace SSO integration for management users (@poppatjamals.com) while maintaining local authentication for cashiers.

### 📋 Prerequisites
- Phase 1 & 2 completed successfully
- Supabase project operational
- Backend and frontend running
- Google Workspace domain: @poppatjamals.com

---

## Part 1: Supabase Google OAuth Setup (15 minutes)

### Step 1: Create Google Cloud Project
1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create New Project**:
   - Project Name: `Poppat Jamals DSR`
   - Organization: Select your organization
   - Note the Project ID

### Step 2: Enable Google+ API
1. **Navigate to APIs & Services** > **Library**
2. **Search for "Google+ API"** and enable it
3. **Also enable "Google OAuth2 API"** if available

### Step 3: Configure OAuth Consent Screen
1. **Go to APIs & Services** > **OAuth consent screen**
2. **Choose "Internal"** (for Google Workspace users only)
3. **Fill in required fields**:
   - App name: `Poppat Jamals Daily Reporting System`
   - User support email: Your admin email
   - App domain: Leave blank for now
   - Developer contact: Your admin email
4. **Add scopes**:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`

### Step 4: Create OAuth 2.0 Credentials
1. **Go to APIs & Services** > **Credentials**
2. **Click "Create Credentials"** > **OAuth 2.0 Client IDs**
3. **Application Type**: Web application
4. **Name**: `DSR Web Client`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3003
   https://your-production-domain.com (when ready)
   ```
6. **Authorized redirect URIs**:
   ```
   https://vylxluyxmslpxldihpoa.supabase.co/auth/v1/callback
   ```
7. **Save and note**:
   - Client ID
   - Client Secret

### Step 5: Configure Supabase Auth
1. **Go to Supabase Dashboard**: https://vylxluyxmslpxldihpoa.supabase.co
2. **Navigate to Authentication** > **Providers**
3. **Enable Google Provider**:
   - Client ID: (from Step 4)
   - Client Secret: (from Step 4)
   - Redirect URL: (auto-filled by Supabase)
4. **Advanced Settings**:
   - Enable "Use PKCE"
   - Add hosted domain: `poppatjamals.com` (restricts to company emails)

---

## Part 2: Backend Google SSO Integration (20 minutes)

### Step 1: Update Environment Variables
Add to `backend/.env`:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_HOSTED_DOMAIN=poppatjamals.com
```

### Step 2: Install Additional Dependencies
```bash
cd backend
npm install google-auth-library
```

### Step 3: Create Google Auth Service
Create `backend/src/services/googleAuth.js`:
```javascript
const { OAuth2Client } = require('google-auth-library');
const supabase = require('../config/supabase');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    // Verify domain restriction
    if (payload.hd !== process.env.GOOGLE_HOSTED_DOMAIN) {
      throw new Error('Invalid domain. Must use @poppatjamals.com email');
    }
    
    return payload;
  } catch (error) {
    throw new Error(`Google token verification failed: ${error.message}`);
  }
};

const createOrUpdateGoogleUser = async (googlePayload) => {
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', googlePayload.email)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUser) {
    // Update existing user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        first_name: googlePayload.given_name,
        last_name: googlePayload.family_name,
        profile_picture_url: googlePayload.picture,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedUser;
  } else {
    // Create new user - must be manager level or above
    const role = determineRoleFromEmail(googlePayload.email);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: googlePayload.email,
        first_name: googlePayload.given_name,
        last_name: googlePayload.family_name,
        role: role,
        authentication_type: 'google_sso',
        profile_picture_url: googlePayload.picture,
        is_active: true,
        store_id: null, // Will be assigned by admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;
    return newUser;
  }
};

const determineRoleFromEmail = (email) => {
  // Define role mapping based on email patterns
  if (email.includes('admin') || email.includes('super')) {
    return 'super_user';
  } else if (email.includes('accounts') || email.includes('finance')) {
    return 'accounts_incharge';
  } else {
    return 'store_manager'; // Default for @poppatjamals.com users
  }
};

module.exports = {
  verifyGoogleToken,
  createOrUpdateGoogleUser
};
```

### Step 4: Update Auth Routes
Update `backend/src/routes/auth.js` to add Google SSO endpoint:
```javascript
const { verifyGoogleToken, createOrUpdateGoogleUser } = require('../services/googleAuth');

// Add this route to existing auth.js
router.post('/login/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({
        error: 'Missing Google credential'
      });
    }

    // Verify Google token
    const googlePayload = await verifyGoogleToken(credential);
    
    // Create or update user in our database
    const user = await createOrUpdateGoogleUser(googlePayload);
    
    // Create Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential
    });
    
    if (sessionError) {
      console.error('Supabase session error:', sessionError);
      return res.status(500).json({
        error: 'Failed to create session'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        store_id: user.store_id,
        profile_picture_url: user.profile_picture_url
      },
      token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token
    });
    
  } catch (error) {
    console.error('Google SSO error:', error);
    res.status(400).json({
      error: error.message || 'Google authentication failed'
    });
  }
});
```

---

## Part 3: Frontend Google SSO Integration (25 minutes)

### Step 1: Install Google Identity Services
```bash
cd web
npm install google-auth-library
```

### Step 2: Add Google Sign-In Script
Add to `web/index.html` in the `<head>` section:
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### Step 3: Create Google Sign-In Component
Create `web/src/components/GoogleSignIn.tsx`:
```tsx
import React from 'react';
import { Button, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

interface GoogleSignInProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onSuccess, onError, disabled }) => {
  const initializeGoogleSignIn = () => {
    if (typeof window.google === 'undefined') {
      onError('Google Sign-In not loaded');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      hosted_domain: 'poppatjamals.com'
    });
  };

  const handleCredentialResponse = (response: any) => {
    if (response.credential) {
      onSuccess(response.credential);
    } else {
      onError('No credential received from Google');
    }
  };

  const handleSignIn = () => {
    if (typeof window.google === 'undefined') {
      onError('Google Sign-In not loaded');
      return;
    }

    try {
      initializeGoogleSignIn();
      window.google.accounts.id.prompt();
    } catch (error) {
      onError('Failed to initialize Google Sign-In');
    }
  };

  React.useEffect(() => {
    // Initialize when component mounts
    if (typeof window.google !== 'undefined') {
      initializeGoogleSignIn();
    }
  }, []);

  return (
    <Box>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={handleSignIn}
        disabled={disabled}
        sx={{
          borderColor: '#db4437',
          color: '#db4437',
          '&:hover': {
            borderColor: '#c23321',
            backgroundColor: 'rgba(219, 68, 55, 0.04)'
          }
        }}
      >
        Sign in with Google Workspace
      </Button>
    </Box>
  );
};

export default GoogleSignIn;
```

### Step 4: Update Login Page
Update `web/src/pages/Login.tsx` to include Google Sign-In:
```tsx
import GoogleSignIn from '../components/GoogleSignIn';
import { authApi } from '../services/api';

// Add this to your existing Login component in the Manager tab:
<GoogleSignIn
  onSuccess={handleGoogleSuccess}
  onError={handleGoogleError}
  disabled={loading}
/>

// Add these handler functions:
const handleGoogleSuccess = async (credential: string) => {
  setLoading(true);
  setError('');
  
  try {
    const response = await authApi.loginGoogle(credential);
    
    // Store auth data
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('user_data', JSON.stringify(response.user));
    
    // Update auth context
    login(response.user, response.token);
    
    // Redirect based on role
    if (response.user.role === 'super_user') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  } catch (error) {
    setError(error.response?.data?.error || 'Google sign-in failed');
  } finally {
    setLoading(false);
  }
};

const handleGoogleError = (error: string) => {
  setError(error);
};
```

### Step 5: Add Environment Variable
Add to `web/.env`:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

---

## Part 4: Testing & Validation (15 minutes)

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
- [ ] Google OAuth consent screen appears
- [ ] Only @poppatjamals.com emails accepted
- [ ] User redirected back to app after consent
- [ ] JWT token stored in localStorage
- [ ] User profile data populated correctly
- [ ] Role-based navigation appears
- [ ] Backend receives valid Google token
- [ ] Database user record created/updated

### Step 3: Error Testing
Test these scenarios:
- [ ] Non-@poppatjamals.com email (should be rejected)
- [ ] Network connection issues
- [ ] Invalid Google token
- [ ] Database connection errors

---

## Part 5: Production Considerations (10 minutes)

### Security Checklist
- [ ] HTTPS required for production
- [ ] Google Client Secret secured
- [ ] Domain restrictions properly configured
- [ ] Token expiration handling implemented
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

## 🚀 Next Steps (Phase 4)
1. **Enhanced User Management**: Store assignment, role changes
2. **Mobile App SSO**: React Native Google Sign-In
3. **Advanced Security**: MFA, session monitoring
4. **Production Deployment**: HTTPS, monitoring, backups

## 🔧 Troubleshooting

### Common Issues
1. **"Google Sign-In not loaded"**: Check internet connection and script loading
2. **"Invalid domain"**: Verify @poppatjamals.com restriction
3. **"Token verification failed"**: Check Google Client ID/Secret
4. **Database errors**: Verify Supabase connection and table permissions

### Debug Commands
```bash
# Check backend logs
cd backend && npm run dev

# Test API endpoint directly
curl -X POST http://localhost:3004/api/v1/auth/login/google \
  -H "Content-Type: application/json" \
  -d '{"credential": "test_token"}'
```

**Estimated Completion Time**: 75-90 minutes
**Prerequisites**: Phases 1 & 2 completed, Google Workspace admin access