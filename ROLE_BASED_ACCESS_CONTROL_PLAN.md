# Role-Based Access Control (RBAC) Implementation Plan
## Poppat Jamals Daily Reporting System - Complete Authority Matrix

### 🎯 **Business Logic & Hierarchy**

This system implements a logical business hierarchy with clear separation of duties:

- **Super Users** = System Administrators (IT/Management)
- **Accounts Incharge** = Financial Controllers (Finance Department) 
- **Store Managers** = Local Operations Managers (Branch Managers)
- **Cashiers** = Front-line Staff (Day-to-day Operations)

---

## 📋 **Complete Authority Matrix**

| Action | Super User | Accounts | Store Manager | Cashier |
|--------|-----------|----------|---------------|---------|
| **🏪 STORES** |
| Create Store | ✅ | ❌ | ❌ | ❌ |
| Edit Store | ✅ | ❌ | ❌ | ❌ |
| View All Stores | ✅ | ✅ | Own Only | Own Only |
| Deactivate Store | ✅ | ❌ | ❌ | ❌ |
| **👥 USERS** |
| Create Super User | ✅ | ❌ | ❌ | ❌ |
| Create Accounts | ✅ | ❌ | ❌ | ❌ |
| Create Store Manager | ✅ | ❌ | ❌ | ❌ |
| Create Cashier | ✅ | ❌ | ✅ (own store) | ❌ |
| Edit Any User | ✅ | ❌ | ❌ | ❌ |
| Edit Store Users | ✅ | ❌ | ✅ (own store) | ❌ |
| Deactivate Users | ✅ | ❌ | ✅ (own store) | ❌ |
| **💰 SALES** |
| Create | ✅ (any store) | ✅ (any store) | ✅ (own store) | ✅ (own store) |
| View | ✅ (all stores) | ✅ (all stores) | ✅ (own store) | ✅ (own store) |
| Edit | ✅ (any) | ❌ | ✅ (own store) | ❌ |
| Delete | ✅ (any) | ❌ | ❌ | ❌ |
| Approve | ✅ (any) | ✅ (any) | ❌ | ❌ |
| **💸 EXPENSES** |
| Create | ✅ (any store) | ✅ (any store) | ✅ (own store) | ✅ (own store) |
| View | ✅ (all stores) | ✅ (all stores) | ✅ (own store) | ✅ (own store) |
| Edit | ✅ (any) | ❌ | ✅ (own store) | ❌ |
| Delete | ✅ (any) | ❌ | ❌ | ❌ |
| Approve | ✅ (any) | ✅ (any) | ❌ | ❌ |
| **📊 REPORTS** |
| View All Stores | ✅ | ✅ | ❌ | ❌ |
| View Own Store | ✅ | ✅ | ✅ | ✅ |
| Financial Reports | ✅ | ✅ | Own Store | Own Store |
| System Reports | ✅ | ✅ | ❌ | ❌ |

---

## 🏗️ **Implementation Strategy**

### **Phase 1: Database & Backend (High Priority)**
1. **User Store Assignment Logic**
2. **API Route Protection** 
3. **Row Level Security (RLS) Policies**
4. **Store Selection for Multi-Store Users**

### **Phase 2: Frontend UI (High Priority)**  
1. **Role-Based UI Components**
2. **Store Selection Dropdowns**
3. **Data Filtering & Display**
4. **User Management Interface**

### **Phase 3: Testing & Validation (High Priority)**
1. **Role-Based Testing**
2. **Security Validation** 
3. **User Experience Testing**

---

## 💾 **Database Implementation**

### **User Store Assignment Rules:**
```sql
-- Super Users & Accounts: store_id = NULL (access all stores)
-- Store Managers & Cashiers: store_id = assigned_store_id
```

### **Store Selection Logic:**
- **Super Users/Accounts**: Must select store for data entry operations
- **Store Managers/Cashiers**: Auto-assigned to their store
- **Data Viewing**: Filter by user's access level

### **RLS Policy Strategy:**
```sql
-- Example RLS Policies:
-- Super Users: Full access to all records
-- Accounts: View/approve all, create with store selection
-- Store Managers: Full CRUD for own store only  
-- Cashiers: Create/view for own store only
```

---

## 🔧 **Backend API Changes**

### **Enhanced Route Protection:**
```javascript
// Store Management
POST   /stores              [super_user]
GET    /stores              [super_user, accounts_incharge] 
PATCH  /stores/:id          [super_user]

// User Management  
POST   /users/super         [super_user]
POST   /users/accounts      [super_user]
POST   /users/manager       [super_user]
POST   /users/cashier       [super_user, store_manager]

// Data Operations with Store Context
GET    /sales               [role-based filtering]
POST   /sales               [role-based + store selection]
PATCH  /sales/:id           [role-based + ownership check]
DELETE /sales/:id           [super_user only]
```

### **Store Selection Middleware:**
```javascript
// For super users and accounts creating data
const requireStoreSelection = (req, res, next) => {
  if (needsStoreSelection(req.user.role) && !req.body.store_id) {
    return res.status(400).json({ error: 'Store selection required' })
  }
  next()
}
```

---

## 🎨 **Frontend UI Implementation**

### **Role-Based Component Rendering:**
```typescript
// Store Selection Dropdown
{(user.role === 'super_user' || user.role === 'accounts_incharge') && (
  <StoreSelector 
    stores={stores}
    selectedStore={selectedStore}
    onChange={setSelectedStore}
    required
  />
)}

// Action Buttons Based on Permissions
{canEdit && <EditButton />}
{canDelete && <DeleteButton />}  
{canApprove && <ApproveButton />}
```

### **Data Filtering Logic:**
```typescript
// Sales/Expenses Loading
const loadData = async () => {
  const params: any = { limit: 50 }
  
  // Super users and accounts can filter by store
  if (isMultiStoreUser && selectedStoreId) {
    params.store_id = selectedStoreId
  }
  // Store managers/cashiers automatically filtered by backend
  
  const data = await salesApi.getAll(params)
  setSales(data)
}
```

### **User Management Interface:**
```typescript
// User Creation Forms
const CreateUserForm = ({ userType }: { userType: UserRole }) => {
  // Different forms based on user type being created
  // Store assignment dropdown for managers/cashiers
  // Role-specific validation
}
```

---

## 🔐 **Security Implementation**

### **Backend Route Guards:**
```javascript
// Comprehensive role checking
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }
  next()
}

// Store ownership validation
const requireStoreAccess = (req, res, next) => {
  const { storeId } = req.params
  if (!canAccessStore(req.user, storeId)) {
    return res.status(403).json({ error: 'Store access denied' })
  }
  next()
}
```

### **Data Ownership Validation:**
```javascript
// Check if user can access specific record
const canAccessRecord = (user, record) => {
  switch (user.role) {
    case 'super_user': return true
    case 'accounts_incharge': return true  
    case 'store_manager': return record.store_id === user.store_id
    case 'cashier': return record.store_id === user.store_id
    default: return false
  }
}
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Core Infrastructure**
- [ ] **Update RLS policies** for new permission model
- [ ] **Enhance API route protection** with role-based guards  
- [ ] **Implement store selection logic** for multi-store users
- [ ] **Add user creation endpoints** with role validation
- [ ] **Update data queries** with proper filtering

### **Phase 2: User Interface**
- [ ] **Add store selection dropdowns** to all data entry forms
- [ ] **Implement role-based UI rendering** (show/hide based on permissions)
- [ ] **Create user management interface** for different user types
- [ ] **Add approval workflow UI** for accounts and super users
- [ ] **Update data tables** to show store information

### **Phase 3: Advanced Features** 
- [ ] **Multi-store reporting** for super users and accounts
- [ ] **Bulk operations** with store selection
- [ ] **Advanced user management** (transfer between stores, etc.)
- [ ] **Audit logging** for all admin operations
- [ ] **Store performance dashboards**

### **Phase 4: Testing & Security**
- [ ] **Role-based access testing** for all user types
- [ ] **Security penetration testing** 
- [ ] **User experience testing** with real workflows
- [ ] **Performance testing** with multiple stores
- [ ] **Data integrity validation**

---

## 🎯 **Success Criteria**

### **Functional Requirements:**
- ✅ Super users can manage all stores and users
- ✅ Accounts can oversee all financial data across stores  
- ✅ Store managers control their location's operations
- ✅ Cashiers can only enter data for their assigned store
- ✅ Proper separation of duties maintained

### **Security Requirements:**
- ✅ Users cannot access data outside their permission level
- ✅ Store boundaries properly enforced
- ✅ Role changes require proper authorization
- ✅ All administrative actions logged

### **User Experience:**
- ✅ Intuitive role-based interfaces
- ✅ Clear store selection for multi-store users
- ✅ Efficient workflows for each user type
- ✅ Minimal UI changes for existing users

---

## 🚀 **Next Steps**

1. **Start with Phase 1** - Core infrastructure changes
2. **Test thoroughly** after each phase
3. **Get user feedback** before proceeding to next phase
4. **Document everything** for future maintenance

**Let's implement this step by step, starting with the database and backend changes!**

---

## 🎯 **User Creation & Store Assignment Pattern (Implemented)**

### **Flexible User Management Approach**

We've implemented a clean, scalable pattern for user creation and store assignment:

#### **🏗️ User Creation Logic:**

1. **Create Users First** - All users created with basic info (username, password, email, name, role)
2. **Assign Stores Later** - Store assignment can happen during creation OR after stores are set up
3. **Role-Based Store Rules**:
   - **Super Users & Accounts**: `store_id = NULL` (automatic multi-store access)
   - **Store Managers & Cashiers**: `store_id = assigned_store_id` (or NULL initially)

#### **🎨 Frontend Implementation:**

```typescript
// User Creation Form Features:
- Email field (required, validated)
- Role selection with super user restrictions
- Conditional store dropdown (only for managers/cashiers)
- "No store assigned (assign later)" option
- Role change resets store selection automatically
```

#### **🔧 Backend Implementation:**

```javascript
// POST /auth/users - Comprehensive user creation
- Role-based permission validation
- Automatic store assignment logic:
  * Super users → store_id = NULL (multi-store)
  * Accounts → store_id = NULL (multi-store)
  * Managers/Cashiers → store_id = provided || NULL
- Username and email uniqueness checks
- Password hashing and security
```

#### **📋 Store Assignment Workflow:**

1. **During User Creation**:
   - Select role first
   - Store dropdown appears for managers/cashiers
   - Can select store OR leave unassigned

2. **After Store Creation**:
   - Edit existing users to assign stores
   - Reassign users between stores if needed
   - Flexible management as business grows

#### **✅ Benefits of This Pattern:**

- **Flexibility**: Hire people before knowing exact store assignment
- **Scalability**: Easy to reassign users as business expands
- **RBAC Compliance**: Proper role hierarchy with correct access levels
- **Real-World Workflow**: Matches actual business processes
- **Future-Proof**: Supports multi-store expansion seamlessly

#### **🔐 Security Features:**

- Store managers can only create cashiers for their own store
- Super users can create any role with proper store logic
- Email validation and uniqueness enforcement
- Role-based UI restrictions and backend validation