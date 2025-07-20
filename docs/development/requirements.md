# Product Requirements Document
## Daily Reporting System - Poppat Jamals

### 1. Product Overview
**Product Name**: Daily Reporting System (DSR)  
**Company**: Poppat Jamals  
**Version**: 1.0  
**Date**: July 2025  
**Platform**: Web Application + Mobile Companion App

### 2. Executive Summary
The Daily Reporting System is a comprehensive cash management and reporting solution designed specifically for Poppat Jamals' retail operations. The system features both a web application for detailed management and a mobile companion app for quick entry and real-time monitoring. The primary objective is to prevent cash theft through systematic tracking and reconciliation while providing detailed reporting capabilities across multiple store locations.

### 3. Problem Statement
- **Cash Theft Prevention**: Historical issues with cash theft require a robust tracking system
- **Manual Processes**: Current manual cash management is error-prone and inefficient
- **Multiple Locations**: Need centralized reporting across 5 stores with scalability
- **Complex Transaction Types**: Various tender types (cash, credit, card, UPI, hand bills, RRN, gift vouchers)
- **Legacy Data Integration**: Need to honor pre-existing gift vouchers and transaction data
- **Expense Management**: Petty cash allocation and expense tracking lacks proper controls

### 4. Target Users
- **Store Managers**: Full operational control, manage cashier accounts (@poppatjamals.com SSO)
- **Accounts Incharge**: Financial oversight, report generation (@poppatjamals.com SSO)
- **Super Users**: System administration, multi-store oversight (@poppatjamals.com SSO)
- **Cashiers**: Basic sales entry only, created by store managers (local username/password)

### 5. Core Features

#### 5.1 Sales Management
- **Daily Sales Entry**: Must be completed by 12pm for previous day
- **Tender Types**:
  - Cash Sales
  - Credit Sales  
  - Credit Card Sales
  - UPI Payments (GooglePay, PhonePe, Amazon Pay, Paytm, etc.)
  - Hand Bills (temporary bills when POS issues occur)
  - RRN (Return Receipt Notes) - for returns without exchanges
  - GV (Gift Vouchers) - customer payments via gift vouchers
- **Hand Bill Conversion**: Daily conversion from hand bills to system bills (Store Manager)
- **Sales Validation**: Automatic calculations and reconciliation checks
- **Centralized Approval System**: Dedicated approval dashboard for Super Users and Accounts Incharge
- **Bulk Approval Operations**: Multi-select approval for efficient processing
- **Enhanced Date Filtering**: Period-based filtering (Today, Yesterday, Last 7 Days, This Week, Last Week, This Month, Last Month)
- **Role-Based Historical Access**: Cashiers limited to 7 days, unlimited access for Managers and above

#### 5.2 Cash Management
- **Petty Cash Float**: Track opening, closing, and adjustments
- **Cash Reconciliation**: Daily cash flow tracking and variance reporting
- **Theft Prevention**: Comprehensive audit trails and alerts
- **Cash Flow Reports**: Real-time cash position across all locations

#### 5.3 Expense Management
- **Real-time Entry**: Capture expenses as they occur
- **Staff Ownership Tracking**: Track which staff member made each expense
- **Voucher Management**: Upload physical voucher images for verification
- **Centralized Approval Workflows**: Dedicated approval dashboard for Super Users and Accounts Incharge
- **Bulk Approval Operations**: Multi-select approval for efficient processing
- **Historical Data Access**: Role-based date filtering (Cashiers: 7 days, Managers: unlimited)
- **Petty Cash Allocation**: Track petty cash top-ups and usage
- **Expense Categories**: Staff welfare (tea, coffee), logistics, miscellaneous

#### 5.4 Gift Voucher Management
- **Voucher Creation**: Generate gift vouchers with unique numbers and expiry dates
- **Voucher Redemption**: Validate and process voucher payments with balance tracking
- **Legacy Voucher Support**: Import and honor pre-system gift vouchers
- **Voucher Lifecycle**: Track creation, partial redemption, and expiry
- **Liability Reporting**: Outstanding voucher amounts and expiry alerts

#### 5.5 Damage Reporting
- **Damage Documentation**: Record damaged items with supplier and cause details
- **Automated Alerts**: Immediate notifications to relevant staff via email/Slack
- **Action Tracking**: Monitor replacement requests and credit note processing
- **Quality Control**: Comprehensive damage analysis and supplier accountability

#### 5.6 Alert System
- **Multi-channel Notifications**: Email and Slack integration with user preferences
- **Credit Payment Alerts**: Multi-stage alerts for overdue payments (Day 7, 15, 30)
- **Deadline Reminders**: Daily 12pm sales entry deadline notifications
- **Damage Report Alerts**: Immediate notifications for quality control issues
- **Configurable Escalation**: Custom alert rules per store and transaction type

#### 5.7 Approval Management
- **Centralized Approval Dashboard**: Dedicated interface for pending approvals across all transaction types
- **Role-Based Approval Authority**: Only Super Users and Accounts Incharge can approve transactions
- **Bulk Approval Operations**: Multi-select functionality for efficient batch processing
- **Approval Status Tracking**: Real-time status updates with approval history and notes
- **Cross-Transaction Type Support**: Unified approval interface for sales, expenses, and future transaction types
- **Scalable Architecture**: Framework ready for handbills, damage reports, and other approval workflows

#### 5.8 Reporting
- **Daily Sales Summary**: Breakdown by tender type and location
- **Cash Reconciliation Reports**: Daily, weekly, monthly cash position
- **Expense Reports**: Categorized expense analysis with approval status
- **Multi-store Consolidated Reports**: Cross-location performance analysis
- **Audit Reports**: Complete transaction history for compliance
- **Historical Data Access**: Enhanced date filtering with role-based restrictions

#### 5.9 Multi-location Support
- **Store Management**: Individual store configuration and settings
- **Centralized Reporting**: Consolidated view across all 5 locations
- **Role-based Access**: Location-specific permissions and restrictions
- **Scalability**: Architecture supports additional store locations

#### 5.10 User Management
- **Hybrid Authentication System**: Google SSO for management, local accounts for cashiers
- **Google Workspace Integration**: SSO with @poppatjamals.com email accounts for management roles
- **Cashier Account Management**: Store managers create simple username/password accounts for cashiers
- **Role-based Access Control**: Different authentication methods and permissions per role
- **Session Management**: Secure authentication across web and mobile platforms

**Authentication Types:**
- Google SSO: Super User, Store Manager, Accounts Incharge
- Local Accounts: Cashiers (no company email required)
- Account Creation: Store managers can create/manage cashier accounts for their store

#### 5.11 Mobile Application Features
- **Quick Sales Entry**: Simplified forms for fast tender type entry
- **Hybrid Login**: Google SSO for managers, simple username/password for cashiers
- **Role-based Interface**: Different features available per user role
- **Push Notifications**: Daily deadline reminders, approval alerts (managers only)
- **Camera Integration**: Direct voucher photo capture and upload (managers only)
- **Offline Capability**: Basic sales entry without internet connection
- **Biometric Authentication**: Fingerprint/face recognition for enhanced security
- **Cashier Mode**: Simplified interface for basic sales entry only
- **Manager Mode**: Full feature access with approval actions

### 6. User Stories

#### Store Manager
- As a Store Manager, I want to enter daily sales data on mobile so that cash can be properly reconciled while on the shop floor
- As a Store Manager, I want to convert hand bills to system bills so that all sales are properly recorded
- As a Store Manager, I want to process UPI payments from all vendors so that digital transactions are properly recorded
- As a Store Manager, I want to create and redeem gift vouchers so that customer loyalty programs work smoothly
- As a Store Manager, I want to report damaged items so that suppliers can be held accountable
- As a Store Manager, I want to request petty cash top-ups so that operational expenses can be managed
- As a Store Manager, I want to create cashier accounts so that staff can enter basic sales data
- As a Store Manager, I want to view my store's performance reports so that I can track business metrics
- As a Store Manager, I want to receive multi-channel alerts for overdue payments so that collections are timely
- As a Store Manager, I want to receive push notifications about daily deadlines so that I don't miss the 12pm sales entry requirement
- As a Store Manager, I want to capture expense vouchers with my phone camera so that documentation is instant and accurate

#### Cashier
- As a Cashier, I want to login with simple username/password so that I can quickly start my shift
- As a Cashier, I want to enter basic sales (cash, UPI, cards) so that transactions are recorded
- As a Cashier, I want a simplified mobile interface so that sales entry is fast and error-free
- As a Cashier, I want to see my daily sales total so that I can track my performance

#### Accounts Incharge
- As an Accounts Incharge, I want to view financial data across all stores so that I can prepare consolidated reports
- As an Accounts Incharge, I want to access a centralized approval dashboard so that I can efficiently manage all pending transactions
- As an Accounts Incharge, I want to bulk approve multiple transactions so that processing is efficient
- As an Accounts Incharge, I want to filter approvals by date and store so that I can focus on specific periods or locations
- As an Accounts Incharge, I want to track outstanding gift voucher liability so that financial statements are accurate
- As an Accounts Incharge, I want to receive escalated credit payment alerts so that collections are managed effectively
- As an Accounts Incharge, I want to generate cash reconciliation reports so that discrepancies can be identified
- As an Accounts Incharge, I want to export data in XML/JSON/CSV formats so that external systems can be integrated
- As an Accounts Incharge, I want to import legacy gift voucher data so that existing customer vouchers are honored

#### Super User
- As a Super User, I want to integrate with Google Workspace so that @poppatjamals.com users can login seamlessly
- As a Super User, I want to manage user accounts and permissions so that system access is controlled
- As a Super User, I want to access a centralized approval dashboard so that I can efficiently manage all pending transactions
- As a Super User, I want to bulk approve multiple transactions so that processing is efficient
- As a Super User, I want to configure multi-stage alert rules so that business processes are properly escalated
- As a Super User, I want to configure system settings so that business rules are enforced
- As a Super User, I want to view system-wide reports so that overall business performance can be monitored
- As a Super User, I want to access audit logs so that system usage can be tracked
- As a Super User, I want to manage notification preferences so that staff receive appropriate alerts

### 7. Technical Requirements

#### 7.1 Technology Stack
- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL for data integrity and audit capabilities
- **Web Frontend**: React with TypeScript for type safety
- **Mobile Frontend**: React Native for iOS and Android
- **Authentication**: JWT-based with Google Workspace SSO integration
- **File Storage**: Cloud storage for voucher images
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Real-time Sync**: WebSocket connections for live updates
- **Notification Channels**: Email SMTP and Slack API integration
- **Export Formats**: XML, JSON, CSV template engine

#### 7.2 Performance Requirements
- **Response Time**: Page loads under 2 seconds
- **Concurrent Users**: Support 50+ simultaneous users
- **Data Retention**: 5+ years of transaction history
- **Backup**: Daily automated backups with point-in-time recovery

#### 7.3 Security Requirements
- **Authentication**: Multi-factor authentication for Super Users
- **Authorization**: Role-based access control with principle of least privilege
- **Data Encryption**: Encrypt sensitive data at rest and in transit
- **Audit Logging**: Complete audit trail for all transactions and system changes
- **Session Management**: Automatic session timeout after inactivity

#### 7.4 Integration Requirements
- **API Placeholders**: Future integration with POS systems
- **Accounting Software**: Export capabilities for external accounting systems
- **Notification System**: Email/SMS alerts for threshold breaches
- **Mobile App Stores**: iOS App Store and Google Play Store deployment
- **Push Notification Services**: Firebase Cloud Messaging integration
- **Camera API**: Native camera integration for voucher capture

### 8. Business Rules

#### 8.1 Sales Entry Rules
- Sales data must be entered by 12pm for the previous day
- Hand bills must be converted to system bills within 24 hours
- All sales entries require approval from Super Users or Accounts Incharge only
- Store Managers no longer have approval authority
- Cash sales require physical cash reconciliation
- Historical data access limited to 7 days for Cashiers, unlimited for Managers and above

#### 8.2 Expense Management Rules
- Expense entries must include physical voucher reference
- All expenses require approval from Super Users or Accounts Incharge only
- Store Managers no longer have approval authority
- Petty cash cannot exceed maximum allocation limit
- All expense categories must be pre-defined
- Historical data access limited to 7 days for Cashiers, unlimited for Managers and above

#### 8.3 Access Control Rules
- Users can only access data for assigned locations
- Financial data requires additional authentication
- System settings changes require Super User approval
- Audit logs are read-only for all users

### 9. Success Metrics
- **Cash Variance Reduction**: Target <1% daily cash variance
- **Data Entry Compliance**: 100% on-time sales entry by 12pm deadline
- **Expense Approval Time**: Average approval time <24 hours
- **System Uptime**: 99.5% availability during business hours
- **User Adoption**: 100% staff using system within 30 days
- **Mobile Adoption**: 80% of daily entries made via mobile app within 60 days
- **Push Notification Engagement**: 90% of users respond to deadline reminders

### 10. Acceptance Criteria
- All user roles can successfully log in and access appropriate features
- Daily sales entry workflow completes within defined timeframes
- Cash reconciliation calculations are accurate to 2 decimal places
- Expense approval workflows function correctly with proper notifications
- Reports generate within 30 seconds for standard queries
- System handles 5 concurrent store operations without performance degradation

### 11. Future Enhancements
- **Advanced Mobile Features**: GPS tracking for field operations, voice-to-text entry
- **Advanced Analytics**: Machine learning for sales forecasting and fraud detection
- **Inventory Integration**: Link with inventory management systems
- **Customer Analytics**: Customer behavior analysis and reporting
- **Multi-currency Support**: Support for multiple currencies if expanding internationally
- **Wearable Integration**: Apple Watch/Android Wear for quick notifications
- **Tablet Optimization**: Dedicated tablet interface for counter operations