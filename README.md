# Daily Reporting System - Poppat Jamals

A comprehensive daily reporting system for Poppat Jamals retail company to track sales, manage cash, and handle expenses across multiple store locations.

## 🚀 Project Overview

**Primary Objective**: Cash management and theft prevention  
**Secondary Objective**: Comprehensive reporting and analytics  
**Architecture**: Web application with role-based access control

### Key Features
- **Sales Tracking**: Cash, credit, credit card, UPI sales
- **Special Transactions**: Hand bills, RRN (Return Receipt Notes), Gift Vouchers
- **Expense Management**: Petty cash allocation and expense tracking
- **Multi-Store Support**: Currently 5 stores with extensibility
- **Role-Based Access**: 4-tier hierarchy (Super User, Accounts, Store Manager, Cashier)
- **Hybrid Authentication**: JWT for cashiers, Google SSO for management

## 🏗️ Architecture

- **Frontend**: React with TypeScript + Material-UI
- **Backend**: Node.js with Express.js framework  
- **Database**: PostgreSQL via Supabase
- **Authentication**: Hybrid JWT + Google Workspace SSO
- **Hosting**: Supabase (Database) + Local Development

## 🚦 Current Status

### ✅ Completed Features
- Core RBAC system with 4-tier role hierarchy
- Google Workspace SSO integration (@poppatjamals.com)
- Multi-store sales and expense management
- Modal-based entry forms with store filtering
- Store assignment synchronization
- Complete authentication flow

### ⚠️ Known Configuration
- **Ports**: Frontend (3003), Backend (3004)
- **RLS**: Temporarily disabled, using application-level security
- **Authentication**: Fully functional hybrid system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git
- Google Workspace admin access (@poppatjamals.com)
- Supabase project access

### Installation
```bash
# Clone repository
git clone <repository-url>
cd DSR_Simplified

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../web
npm install
```

### Environment Setup
Create environment files:

**Backend `.env`:**
```env
PORT=3004
CORS_ORIGIN=http://localhost:3003
DATABASE_URL=<supabase-connection-string>
JWT_SECRET=<your-jwt-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3004/api/v1
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

### Running the Application
```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend  
cd web && npm run dev
```

Access: http://localhost:3003

## 👥 User Roles & Access

### 🔴 Super User
- Full system access
- User and store management
- Cross-store data visibility
- System configuration

### 🟡 Accounts In-charge  
- Financial oversight across stores
- Approval workflows
- Cross-store reporting
- User management (limited)

### 🟢 Store Manager
- Store-specific management
- Cashier account creation
- Store operations oversight
- Local reporting

### 🔵 Cashier
- Daily transaction entry
- Basic sales and expense recording
- Single-store access only

## 📊 Key Workflows

### Sales Entry
1. **Daily Entry**: Batch entry for cash, credit, card, UPI
2. **Occasional Entry**: Individual hand bills, RRNs, gift vouchers
3. **Store Filtering**: Multi-store users can select target store

### Expense Management  
1. **Daily Expenses**: Batch entry across categories
2. **Single Expenses**: Individual expense recording
3. **Approval Workflow**: Manager approval for expenses

### User Management
1. **Google SSO**: Automatic account creation for @poppatjamals.com
2. **Local Accounts**: Manual creation for cashiers
3. **Store Assignment**: Automatic sync between manager assignments

## 📁 Documentation Structure

```
docs/
├── setup/                   # Setup and deployment
│   ├── phase-1-setup.md    # Initial setup guide  
│   ├── phase-2-setup.md    # Database configuration
│   ├── google-sso-setup.md # Google SSO implementation
│   └── deployment-notes.md # Ports, CORS, RLS notes
├── development/             # Development docs
│   ├── database-schema.md  # Database design
│   ├── implementation-guide.md # Code implementation
│   └── requirements.md     # Product requirements
├── architecture/           # System design
│   ├── rbac-design.md     # Role-based access design
│   └── location-features.md # Multi-store features
└── database/              # Database files
    ├── schema.sql         # Complete database schema
    ├── rls-policies.sql   # Row Level Security policies
    └── setup/             # Setup scripts
```

## 🔧 Development Commands

### Backend
```bash
cd backend
npm run dev        # Start development server
npm test          # Run tests (if available)
npm run lint      # Lint code (if configured)
```

### Frontend  
```bash
cd web
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Lint code
npm run typecheck # TypeScript checking
```

## 🔐 Security Features

- **Domain Restriction**: Only @poppatjamals.com emails for management
- **Role-Based Authorization**: API endpoint protection
- **Store Access Control**: Users limited to assigned stores
- **Session Management**: JWT tokens with appropriate expiration
- **Audit Logging**: Database-level audit trails (via triggers)

## 🎯 Current Development Focus

### High Priority
- Role-based UI components
- Approval workflow interfaces  
- Production deployment preparation

### Medium Priority
- Enhanced error handling
- Performance optimizations
- Additional reporting features

## 🐛 Known Issues & Workarounds

### RLS Temporarily Disabled
- **Issue**: Row Level Security conflicts with hybrid authentication
- **Workaround**: Application-level security via middleware
- **Plan**: Update RLS policies to support hybrid auth

### CORS Configuration
- **Fixed**: CORS origin updated to match frontend port (3003)
- **Monitor**: Ensure backend restarts after CORS changes

## 📞 Support & Troubleshooting

### Common Issues
1. **Port conflicts**: Check if ports 3003/3004 are available
2. **CORS errors**: Verify CORS_ORIGIN in backend/.env
3. **Google SSO issues**: Verify domain restriction and OAuth setup
4. **Database connection**: Check Supabase connection string

### Debug Commands
```bash
# Check backend logs
cd backend && npm run dev

# Test API endpoints
curl http://localhost:3004/api/v1/health

# Check frontend build
cd web && npm run build
```

## 🤝 Contributing

1. Follow existing code patterns and conventions
2. Test changes thoroughly across user roles
3. Update documentation for significant changes
4. Ensure proper error handling and validation

## 📄 License

Private project for Poppat Jamals retail operations.

---

**Project Status**: ✅ Production Ready  
**Last Updated**: January 2025  
**Current Version**: Phase 3 Complete