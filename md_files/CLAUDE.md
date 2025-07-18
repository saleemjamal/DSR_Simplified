# Daily Reporting System - Poppat Jamals

## Project Overview
A comprehensive daily reporting system for Poppat Jamals retail company to track sales, manage cash, and handle expenses across multiple store locations. Features both web application and mobile companion app.

## Key Features
- **Sales Tracking**: Cash sales, credit sales, credit card sales
- **Special Transaction Types**: Hand bills, RRN (Return Receipt Notes), GV (Gift Vouchers)
- **Cash Management**: Primary focus on cash flow control and theft prevention
- **Expense Management**: Petty cash allocation and expense tracking
- **Multi-location Support**: 5 stores with extensibility for more
- **Access Control**: Different permission levels for different roles
- **Mobile Companion**: React Native app for quick entry and notifications
- **Real-time Sync**: Unified data between web and mobile platforms

## Architecture
- **Web Application**: React with TypeScript for desktop/tablet use
- **Mobile Application**: React Native for iOS and Android
- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL for data integrity and audit capabilities
- **Authentication**: JWT-based with role-based access control

## Development Notes
- Primary objective: Cash management and theft prevention
- Secondary objective: Comprehensive reporting
- Hybrid approach: Web for complex operations, mobile for quick entry
- Keep system simple and not over-complicated
- Single backend API serves both web and mobile clients

## Commands

### Web Application
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Start Dev: `npm start`
- Start Prod: `npm run serve`

### Mobile Application
- Install: `cd mobile && npm install`
- iOS: `cd mobile && npx react-native run-ios`
- Android: `cd mobile && npx react-native run-android`
- Build iOS: `cd mobile && npx react-native build-ios`
- Build Android: `cd mobile && npx react-native build-android`

### Backend
- Start: `npm run server`
- Test: `npm run test:server`
- Migrate: `npm run db:migrate`
- Seed: `npm run db:seed`

## Project Structure
```
DSR_Simplified/
├── web/                    # React web application
├── mobile/                 # React Native mobile app
├── backend/               # Node.js/Express API server
├── shared/                # Shared utilities and types
├── docs/                  # Documentation
└── scripts/               # Build and deployment scripts
```

## Mobile-Specific Features
- **Push Notifications**: Daily deadline reminders, approval alerts
- **Camera Integration**: Voucher photo capture and upload
- **Offline Capability**: Basic functionality without internet
- **Quick Entry**: Simplified forms for fast data entry
- **Biometric Auth**: Fingerprint/face recognition for security

## Development Phases
- **Phase 1 (Weeks 1-6)**: Core web application with mobile-responsive design
- **Phase 2 (Weeks 7-10)**: React Native mobile companion app
- **Shared Backend**: Single API serving both platforms throughout

## Context7 MCP Server

The Context7 MCP server provides up-to-date documentation and code examples for libraries and frameworks used in this project.

### Setup
1. Set git bash path: `setx CLAUDE_CODE_GIT_BASH_PATH "C:\Program Files\Git\bin\bash.exe"`
2. Restart terminal and run: `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest`

### Usage
Add "use context7" to your prompts to get current documentation and examples:

#### Examples for this project:
- "Help me set up React Native navigation with TypeScript. use context7"
- "How do I configure PostgreSQL connection in Node.js with Express? use context7"
- "Create a JWT authentication middleware for Express. use context7"
- "Show me React TypeScript component patterns for form handling. use context7"
- "How do I implement push notifications in React Native? use context7"

### Benefits
- Real-time documentation access
- Version-specific code examples
- No need to switch between tabs for documentation
- Accurate, up-to-date API references for React, React Native, Node.js, Express, and PostgreSQL

## Development Communication Preferences
- Never show an approach with formatting - console visibility issues
- Prefer step-by-step, plain text instructions

## Memories
- Added plain text request processing as a communication guideline

## Supabase Password
zcAM!e9m-DvCft?