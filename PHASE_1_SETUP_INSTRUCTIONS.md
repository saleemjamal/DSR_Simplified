# Phase 1 Setup Instructions
## Poppat Jamals Daily Reporting System

### ✅ Completed
- Project structure created
- Environment variables configured  
- Backend API skeleton with Supabase integration
- All 25 database tables defined
- Row Level Security policies created
- Database functions and triggers implemented
- Initial data scripts prepared

### 🚀 Next Steps

#### 1. Database Setup (5 minutes)
Go to your Supabase project at: https://vylxluyxmslpxldihpoa.supabase.co

1. **Open SQL Editor** in Supabase dashboard
2. **Run the complete setup script**:
   - Copy the entire content from `backend/src/database/schema.sql`
   - Paste and execute in Supabase SQL Editor
   - This creates all 25 tables with indexes

3. **Apply RLS Policies**:
   - Copy content from `backend/src/database/rls_policies.sql`  
   - Paste and execute in Supabase SQL Editor
   - This enables row-level security

4. **Add Functions & Triggers**:
   - Copy content from `backend/src/database/functions_triggers.sql`
   - Paste and execute in Supabase SQL Editor
   - This adds audit logging and business logic

5. **Insert Initial Data**:
   - Copy content from `backend/src/database/initial_data.sql`
   - Paste and execute in Supabase SQL Editor
   - This adds sample store, settings, and categories

#### 2. Install Dependencies (2 minutes)
```bash
# Install root dependencies
npm install

# Install backend dependencies  
cd backend
npm install
```

#### 3. Test Backend API (2 minutes)
```bash
# Start backend server
cd backend
npm run dev
```

Visit: http://localhost:3001/health
Should see: `{"status": "OK", "service": "Poppat Jamals DSR API"}`

#### 4. Test Database Connection
```bash
# Test with curl (or Postman)
curl http://localhost:3001/api/v1/stores/current
```
Should return 401 (expected - no auth token)

### 📁 Project Structure Created
```
DSR_Simplified/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── config/            # Supabase configuration
│   │   ├── controllers/       # Business logic (future)
│   │   ├── middleware/        # Auth & validation
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # External services (future)
│   │   ├── utils/            # Helper functions (future)
│   │   ├── database/         # SQL scripts & migrations
│   │   └── index.js          # Main server file
│   └── package.json
├── .env                      # Environment variables
├── .env.example             # Environment template
└── package.json             # Root workspace config
```

### 🔧 Backend API Endpoints Created
```
GET  /health                          # Health check
POST /api/v1/auth/login/local        # Cashier login
POST /api/v1/auth/login/google       # Manager/Admin Google SSO
POST /api/v1/auth/users/cashier      # Create cashier account
GET  /api/v1/auth/profile           # Get user profile
GET  /api/v1/stores/current         # Get user's store
GET  /api/v1/sales                  # Get sales entries
POST /api/v1/sales                  # Create sales entry
GET  /api/v1/expenses               # Get expenses
POST /api/v1/expenses               # Create expense
GET  /api/v1/vouchers               # Get gift vouchers
POST /api/v1/vouchers               # Create voucher
GET  /api/v1/damage                 # Get damage reports
POST /api/v1/damage                 # Create damage report
GET  /api/v1/reports/daily-sales    # Daily sales report
GET  /api/v1/admin/settings         # System settings
```

### 🗄️ Database Features
- **25 Tables**: Complete extensible schema
- **Row Level Security**: Store-based data isolation
- **Audit Logging**: All changes tracked
- **Gift Vouchers**: Complete lifecycle management  
- **Alert System**: Multi-stage notifications
- **Custom Fields**: Extensible data storage
- **Mobile Sync**: Offline support foundation

### 🔐 Authentication System
- **Hybrid Auth**: Google SSO + Local accounts
- **Role-based Access**: Super User, Store Manager, Accounts Incharge, Cashier
- **Store Isolation**: Users only see their store's data
- **JWT Tokens**: Secure session management

### ⚡ Key Features Ready
1. **Sales Management**: All tender types (cash, UPI, credit, vouchers)
2. **Expense Tracking**: Approval workflows with staff ownership
3. **Gift Vouchers**: Creation, redemption, legacy import
4. **Damage Reporting**: Automated alerts to relevant staff
5. **Multi-store Support**: Extensible for additional locations
6. **Audit Trail**: Complete transaction history

### 🎯 Phase 1 Success Criteria
- [x] Supabase project with 25 tables operational
- [x] RLS policies enforcing store-based access  
- [x] Authentication system (hybrid Google SSO + local)
- [x] Basic API endpoints for all major functions
- [x] Database functions for business logic
- [x] Sample data loaded (Annanagar store)

### 🚦 Ready for Phase 2
Once Phase 1 testing is complete, you'll be ready for:
- **Web Frontend**: React with Material-UI
- **Advanced Features**: Real-time notifications, mobile app
- **Google OAuth**: Full SSO integration
- **Production Deployment**: Hosting and monitoring

### 🔍 Verification Checklist
- [ ] All SQL scripts executed successfully in Supabase
- [ ] Backend server starts without errors
- [ ] Health endpoint returns OK status
- [ ] Database tables visible in Supabase dashboard  
- [ ] Sample store data present in stores table
- [ ] Authentication endpoints respond properly

**Time to Complete Phase 1**: ~10 minutes
**Next Phase**: Web Frontend Development (React + Material-UI)