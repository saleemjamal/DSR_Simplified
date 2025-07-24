# DSR Database Scripts - Organized Structure

This directory contains all database scripts for the DSR (Daily Sales Reporting) system, organized by functionality and purpose.

## 📁 Directory Structure

### **📋 `/schema`** - Core Database Structure
Contains the foundational database schema and security policies.

| File | Purpose | Usage |
|------|---------|-------|
| `schema.sql` | Complete database schema with all tables | **Run first** during initial setup |
| `rls_policies.sql` | Row Level Security policies | Run after schema creation |

**Execution Order:** `schema.sql` → `rls_policies.sql`

---

### **🔄 `/migrations`** - Schema Changes & Updates
Contains scripts that modify existing database structure.

| File | Purpose | Date Added |
|------|---------|------------|
| `migration_enhanced_sales_system.sql` | Enhanced sales system features | Original |
| `add_customer_id_to_vouchers.sql` | Add customer ID tracking to vouchers | Customer enhancement |
| `add_customer_origin_store.sql` | Add origin store tracking for customers | Store tracking feature |

**Usage:** Run these when upgrading existing databases

---

### **⚡ `/functions`** - Database Functions & Triggers
Contains stored procedures, functions, and triggers.

| File | Purpose |
|------|---------|
| `functions_triggers.sql` | Core business logic functions and automated triggers |

**Dependencies:** Requires schema to be created first

---

### **🚀 `/performance`** - Performance Optimization
Contains indexes and performance enhancement scripts.

| File | Purpose |
|------|---------|
| `performance_indexes.sql` | Performance indexes for query optimization |
| `performance_indexes_safe.sql` | Safe version of performance indexes |

**Usage:** Run after schema and data are established

---

### **📊 `/data-management`** - Data Setup & Management
Contains scripts for initial data setup and user management.

| File | Purpose |
|------|---------|
| `initial_data_final.sql` | Initial master data (stores, base configuration) |
| `create_test_users_fixed.sql` | Test user creation for development |
| `complete_setup.sql` | Complete database setup script |

**Usage:** Run after schema creation for initial data population

---

### **🧪 `/testing`** - Testing & Cleanup
Contains testing utilities and data cleanup scripts.

| File | Purpose | ⚠️ Warning |
|------|---------|-----------|
| `delete-all-data-keep-superuser.sql` | Clean all data except superuser | **DESTRUCTIVE** |
| `delete-test-data-comprehensive.sql` | Comprehensive test data cleanup | **DESTRUCTIVE** |
| `delete-test-data-simple.sql` | Simple test data cleanup | **DESTRUCTIVE** |
| `delete-test-data-with-feedback.sql` | Test cleanup with feedback | **DESTRUCTIVE** |
| `delete-test-data.sql` | Basic test data deletion | **DESTRUCTIVE** |
| `nuclear-delete-with-fk-handling.sql` | Complete database reset | **NUCLEAR** |
| `cleanup-test-data.js` | JavaScript cleanup utility | Scripted cleanup |

**⚠️ USE WITH EXTREME CAUTION - THESE SCRIPTS DELETE DATA**

---

### **💰 `/cash-reconciliation`** - Cash Variance Calculation
Contains scripts for the cash reconciliation feature implementation.

| File | Purpose | Execution Order |
|------|---------|----------------|
| `01-add-payment-method-columns.sql` | Add payment_method to hand_bills & gift_vouchers | **1st** |
| `02-cash-reconciliation-function.sql` | Cash variance calculation functions | **2nd** |

**Feature:** Implements automatic cash variance calculation for daily reconciliation

---

## 🚀 Complete Setup Guide

### **Fresh Database Setup:**
```bash
# 1. Core Schema
psql -f database-scripts/schema/schema.sql
psql -f database-scripts/schema/rls_policies.sql

# 2. Functions & Logic
psql -f database-scripts/functions/functions_triggers.sql

# 3. Initial Data
psql -f database-scripts/data-management/initial_data_final.sql

# 4. Performance Optimization
psql -f database-scripts/performance/performance_indexes_safe.sql

# 5. Cash Reconciliation (Latest Feature)
psql -f database-scripts/cash-reconciliation/01-add-payment-method-columns.sql
psql -f database-scripts/cash-reconciliation/02-cash-reconciliation-function.sql
```

### **Upgrading Existing Database:**
```bash
# Run only the migration scripts you haven't applied yet
psql -f database-scripts/migrations/[specific-migration].sql
psql -f database-scripts/cash-reconciliation/01-add-payment-method-columns.sql
psql -f database-scripts/cash-reconciliation/02-cash-reconciliation-function.sql
```

---

## 📝 Development Workflow

### **Adding New Features:**
1. **Migrations** → Add schema changes to `/migrations`
2. **Functions** → Add business logic to `/functions` 
3. **Performance** → Add indexes to `/performance`
4. **Testing** → Add cleanup scripts to `/testing`

### **Feature-Based Organization:**
Each major feature should have its own subdirectory (like `/cash-reconciliation`) containing:
- Schema changes
- Functions
- Test data
- Documentation

---

## ⚠️ Important Notes

### **Backup Before Execution:**
```bash
# Always backup before running any script
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Environment Safety:**
- **Development:** Use `/testing` scripts freely
- **Staging:** Test migrations carefully
- **Production:** Never use testing/cleanup scripts

### **Script Dependencies:**
1. Schema must exist before functions
2. Functions must exist before performance indexes
3. Always check prerequisites in each script

---

## 📞 Support

- **Documentation:** See `/docs/database/` for detailed schema documentation
- **Issues:** Check script comments for troubleshooting
- **Updates:** This structure supports continuous feature development

---

**Last Updated:** July 2025  
**Current Version:** DSR v2.0 with Cash Reconciliation