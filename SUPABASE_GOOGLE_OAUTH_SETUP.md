# Supabase Google OAuth Setup Guide
## Poppat Jamals Daily Reporting System

### Overview
This guide will walk you through setting up Google OAuth integration with Supabase for the DSR system. This enables @poppatjamals.com users to login via Google SSO while keeping local authentication for cashiers.

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

## Part 3: Test Configuration (5 minutes)

### Step 1: Test in Supabase Dashboard
1. **In Supabase Dashboard** > **Authentication** > **Users**
2. **Click "Invite User"** dropdown > **"Test with Google"**
3. **This should open Google OAuth flow**
4. **Login with a @poppatjamals.com account**
5. **Verify you're redirected back to Supabase**
6. **Check that user appears in Users table**

### Step 2: Verify User Restrictions  
1. **Try the test again with a non-@poppatjamals.com email**
2. **This should work in Supabase but will be rejected by our backend API**
3. **Domain restriction happens in our backend code for better control**

---

## Part 4: Environment Variables Setup

### Backend Environment Variables
Add to your `backend/.env` file:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=853303878305-abulokph3cdvl8k9kfs7pddbjcug4ubo.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_HOSTED_DOMAIN=poppatjamals.com
```

### Frontend Environment Variables
Add to your `web/.env` file:
```env
VITE_API_URL=http://localhost:3004/api/v1
VITE_GOOGLE_CLIENT_ID=853303878305-abulokph3cdvl8k9kfs7pddbjcug4ubo.apps.googleusercontent.com
```

---

## Part 5: Troubleshooting

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
- [ ] Google Cloud project created with correct APIs enabled
- [ ] OAuth consent screen configured as "Internal"
- [ ] OAuth 2.0 credentials created with correct redirect URI
- [ ] Supabase Google provider enabled with correct Client ID/Secret
- [ ] Hosted domain restriction set to `poppatjamals.com`
- [ ] Test login successful with @poppatjamals.com email
- [ ] Test login rejected for non-company emails
- [ ] Environment variables updated in both backend and frontend

---

## Part 6: Next Steps

After completing this setup:

1. **Frontend Integration**: Add Google Sign-In button to Login page
2. **Backend Integration**: Verify your auth routes handle Google tokens
3. **User Management**: Test creating users with different roles
4. **Production Setup**: Update redirect URIs for production domain

---

## Security Notes

- **Never commit** Google Client Secret to version control
- **Use environment variables** for all sensitive configuration
- **Restrict OAuth scope** to only required permissions
- **Monitor OAuth usage** in Google Cloud Console
- **Regularly review** authorized domains and redirect URIs

---

## Support

If you encounter issues:
1. Check Google Cloud Console logs
2. Check Supabase Dashboard logs
3. Verify all URLs match exactly
4. Ensure @poppatjamals.com domain is verified in Google Workspace

**Estimated Setup Time**: 30 minutes  
**Prerequisites**: Google Workspace admin access, Supabase project access