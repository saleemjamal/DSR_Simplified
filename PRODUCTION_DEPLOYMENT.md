# Production Deployment Guide - Poppat Jamals DSR

## 🚀 Vercel Deployment with dailysales.report

This guide will help you deploy the DSR application to **https://dailysales.report** using Vercel Git integration.

### Prerequisites

✅ Vercel account  
✅ GitHub repository  
✅ Custom domain: **dailysales.report** (purchased through Vercel)  
✅ Production Google OAuth credentials  
✅ Supabase production database access  

---

## 📋 Step-by-Step Deployment

### 1. Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure project settings:
   - **Project Name**: `poppat-jamals-dsr`
   - **Framework Preset**: `Other`
   - **Root Directory**: `./`
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `web/dist`
   - **Install Command**: `npm run install:all`

### 2. Configure Custom Domain

1. In your Vercel project dashboard → Settings → Domains
2. Add domain: `dailysales.report`
3. Since purchased through Vercel, DNS is automatically configured

### 3. Configure Environment Variables

#### 3.1 Frontend Environment Variables (Vercel Dashboard)

Go to your Vercel project dashboard → Settings → Environment Variables

Add these variables for **Production**:

```env
VITE_API_URL=https://dailysales.report/api/v1
VITE_SUPABASE_URL=https://vylxluyxmslpxldihpoa.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_production_google_client_id
VITE_APP_NAME=Poppat Jamals DSR
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
```

#### 3.2 Backend Environment Variables (Vercel Dashboard)

Add these variables for **Production**:

```env
NODE_ENV=production
CORS_ORIGIN=https://dailysales.report
SUPABASE_URL=https://vylxluyxmslpxldihpoa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_production_jwt_secret_32_chars_minimum
SESSION_SECRET=your_production_session_secret
BCRYPT_SALT_ROUNDS=12
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_production_email@poppatjamals.com
SMTP_PASSWORD=your_production_app_password
```

### 4. Google OAuth Production Setup

#### 4.1 Update Existing OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your existing OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   ```
   https://dailysales.report
   ```
4. Add to **Authorized redirect URIs**:
   ```
   https://dailysales.report/auth/callback/google
   ```
5. Save changes

#### 5.2 Configure Domain Restriction

In Google Workspace Admin:
1. Go to **Security** → **API controls** → **Domain-wide delegation**
2. Add your production domain
3. Restrict to `@poppatjamals.com` domain only

### 6. Database Production Setup

#### 6.1 Supabase Production Configuration

1. **Database URL**: Use your existing Supabase project or create a production instance
2. **Row Level Security**: Enable RLS policies for production
3. **API Settings**: 
   - Update CORS settings to include your Vercel domain
   - Set rate limiting for production traffic

#### 6.2 Database Migration (if needed)

```bash
# Run any pending migrations
cd backend
npm run db:migrate
```

### 5. Deploy to Production

#### 5.1 Initial Deploy via Git Integration

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Production deployment configuration"
   git push origin main
   ```

2. **Automatic Deployment**:
   - Vercel will automatically deploy when you push to main branch
   - Monitor deployment in Vercel dashboard
   - Check deployment logs for any issues

#### 5.2 Future Deployments

- Simply push to main branch for automatic deployment
- Use pull requests for preview deployments
- Monitor deployments in Vercel dashboard

### 8. Custom Domain Setup (Optional)

#### 8.1 Add Custom Domain

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain: `dsr.poppatjamals.com`
3. Configure DNS records as shown

#### 8.2 DNS Configuration

Add these DNS records to your domain provider:

```
Type: CNAME
Name: dsr
Value: cname.vercel-dns.com
```

### 9. SSL Certificate

Vercel automatically provides SSL certificates. Your app will be available at:
- `https://dailysales.report` (primary domain)
- `https://poppat-jamals-dsr.vercel.app` (Vercel subdomain)

---

## 🔧 Production Optimizations

### 1. Performance Optimizations

#### Frontend Optimizations
```json
// web/vite.config.ts additions
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

#### Backend Optimizations
- Enable compression middleware
- Implement caching strategies
- Optimize database queries

### 2. Security Hardening

#### Content Security Policy
Add CSP headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://vylxluyxmslpxldihpoa.supabase.co https://accounts.google.com;"
        }
      ]
    }
  ]
}
```

### 3. Monitoring & Analytics

#### 3.1 Vercel Analytics
Enable Vercel Analytics in project settings

#### 3.2 Error Tracking
Consider integrating Sentry for error tracking:

```bash
npm install @sentry/react @sentry/node
```

---

## 🚦 Post-Deployment Checklist

### Immediate Testing
- [ ] App loads correctly
- [ ] Google SSO login works
- [ ] Local login works
- [ ] API endpoints respond
- [ ] Database operations work
- [ ] File uploads work
- [ ] All user roles function correctly

### Security Testing
- [ ] CORS configuration correct
- [ ] Authentication tokens secure
- [ ] Role-based access working
- [ ] HTTPS enforced
- [ ] Environment variables secure

### Performance Testing
- [ ] Page load times acceptable
- [ ] API response times good
- [ ] Large dataset handling
- [ ] Mobile responsiveness

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
vercel logs your-deployment-url

# Local build test
npm run build:production
```

#### 2. API Endpoint Issues
- Verify `vercel.json` routing configuration
- Check environment variables are set
- Ensure CORS origins match your domain

#### 3. Authentication Problems
- Verify Google OAuth redirect URIs
- Check JWT secret is set and secure
- Ensure Supabase connection is working

#### 4. Database Connection Issues
- Verify Supabase URL and keys
- Check network policies in Supabase
- Ensure connection pooling is configured

### Debug Commands

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Check environment variables
vercel env ls

# Redeploy
vercel --force
```

---

## 📊 Monitoring & Maintenance

### 1. Regular Monitoring
- Check Vercel dashboard for deployment status
- Monitor Supabase database performance
- Review error logs regularly

### 2. Updates & Maintenance
- Keep dependencies updated
- Monitor security advisories
- Regular database backups

### 3. Scaling Considerations
- Monitor Vercel function usage
- Consider database read replicas for high traffic
- Implement caching strategies

---

## 📞 Support & Resources

### Vercel Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Functions Guide](https://vercel.com/docs/functions)

### Project-Specific Support
- Check project README.md for local development
- Review TESTING_GUIDE.md for testing procedures
- Contact development team for custom issues

---

## 🎯 Production Deployment Summary

Your DSR application will be deployed with:
- ✅ Vercel hosting for frontend and backend
- ✅ Supabase PostgreSQL database
- ✅ Google Workspace SSO integration
- ✅ SSL certificate and custom domain
- ✅ Environment-specific configurations
- ✅ Production security hardening

**Estimated deployment time**: 30-45 minutes  
**Maintenance requirement**: Low (auto-deployments via Git)

---

*Last updated: January 2025*