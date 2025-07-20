import { useState, useEffect } from 'react'
import {
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  LinearProgress,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  PersonOff as PersonOffIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import { storesApi, authApi } from '../services/api'
import { Store, User } from '../types'
import { useAuth } from '../hooks/useAuth'

const Admin = () => {
  const [tabValue, setTabValue] = useState(0)
  const [stores, setStores] = useState<Store[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createStoreDialogOpen, setCreateStoreDialogOpen] = useState(false)
  const [editStoreDialogOpen, setEditStoreDialogOpen] = useState(false)
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false)
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  
  const { user: currentUser, refreshProfile } = useAuth()
  const [storeFormData, setStoreFormData] = useState({
    store_code: '',
    store_name: '',
    address: '',
    phone: '',
    manager_id: '',
    petty_cash_limit: 5000,
    timezone: 'Asia/Kolkata'
  })
  
  const [editStoreFormData, setEditStoreFormData] = useState({
    store_code: '',
    store_name: '',
    address: '',
    phone: '',
    manager_id: '',
    petty_cash_limit: 5000,
    timezone: 'Asia/Kolkata',
    is_active: true
  })
  
  const [userFormData, setUserFormData] = useState({
    role: 'cashier',
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  })
  
  const [editUserFormData, setEditUserFormData] = useState({
    first_name: '',
    last_name: '',
    role: 'cashier',
    is_active: true
  })
  
  const [resetPasswordForm, setResetPasswordForm] = useState({
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    loadStores()
    loadUsers()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const storesData = await storesApi.getAll()
      setStores(storesData)
    } catch (err: any) {
      setError('Failed to load stores')
      console.error('Load stores error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const usersData = await authApi.getUsers()
      // Show different users based on current user's role
      if (currentUser?.role === 'super_user') {
        setUsers(usersData) // Super users see all users
      } else if (currentUser?.role === 'accounts_incharge') {
        setUsers(usersData) // Accounts see all users for oversight
      } else {
        // Store managers see only their store's users
        const storeUsers = usersData.filter(user => 
          user.role === 'cashier' || user.id === currentUser?.id
        )
        setUsers(storeUsers)
      }
    } catch (err: any) {
      console.error('Load users error:', err)
    }
  }

  const handleCreateStore = async () => {
    try {
      setError('')
      setSubmitting(true)
      
      const response = await storesApi.create(storeFormData)
      setStores(prev => [...prev, response.store])
      setCreateStoreDialogOpen(false)
      setStoreFormData({
        store_code: '',
        store_name: '',
        address: '',
        phone: '',
        manager_id: '',
        petty_cash_limit: 5000,
        timezone: 'Asia/Kolkata'
      })
      setSuccess('Store created successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create store')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStoreInputChange = (field: string, value: string | number) => {
    setStoreFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEditStoreInputChange = (field: string, value: string | number | boolean) => {
    setEditStoreFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEditStore = (store: Store) => {
    setSelectedStore(store)
    setEditStoreFormData({
      store_code: store.store_code,
      store_name: store.store_name,
      address: store.address || '',
      phone: store.phone || '',
      manager_id: store.manager_id || '',
      petty_cash_limit: store.petty_cash_limit,
      timezone: store.timezone,
      is_active: store.is_active
    })
    setEditStoreDialogOpen(true)
  }

  const handleUpdateStore = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (!selectedStore) return
      
      const response = await storesApi.update(selectedStore.id, editStoreFormData)
      setStores(prev => prev.map(store => 
        store.id === selectedStore.id ? response.store : store
      ))
      setEditStoreDialogOpen(false)
      setSelectedStore(null)
      setSuccess('Store updated successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update store')
    } finally {
      setSubmitting(false)
    }
  }

  // User Management Functions
  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditUserFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
    })
    setEditUserDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (!selectedUser) return
      
      const response = await authApi.updateUser(selectedUser.id, editUserFormData)
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? response.user : user
      ))
      setEditUserDialogOpen(false)
      setSelectedUser(null)
      setSuccess('User updated successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      // Check required fields
      if (!userFormData.email || !userFormData.first_name || !userFormData.last_name) {
        setError('Email, first name, and last name are required')
        return
      }
      
      // Password only required for cashiers (local auth)
      if (userFormData.role === 'cashier') {
        if (!userFormData.password) {
          setError('Password is required for cashier accounts')
          return
        }
        if (userFormData.password.length < 6) {
          setError('Password must be at least 6 characters')
          return
        }
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userFormData.email)) {
        setError('Please enter a valid email address')
        return
      }
      
      await authApi.createUser(userFormData)
      
      setCreateUserDialogOpen(false)
      setUserFormData({
        role: 'cashier',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
      })
      setSuccess('User account created successfully')
      await loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user account')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setSubmitting(true)
      setError('')
      
      await authApi.updateUserStatus(userId, !currentStatus)
      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      await loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (!resetPasswordForm.new_password || !resetPasswordForm.confirm_password) {
        setError('Both password fields are required')
        return
      }
      
      if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
        setError('Passwords do not match')
        return
      }
      
      if (resetPasswordForm.new_password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      
      if (!selectedUser) return
      
      await authApi.resetUserPassword(selectedUser.id, resetPasswordForm.new_password)
      
      setResetPasswordDialogOpen(false)
      setSelectedUser(null)
      setResetPasswordForm({
        new_password: '',
        confirm_password: ''
      })
      setSuccess('Password reset successfully')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSyncStoreAssignments = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      const result = await authApi.syncStoreAssignments()
      setSuccess(`${result.message} (${result.total_synced}/${result.total_stores} stores synced)`)
      
      // Reload users to reflect changes
      await loadUsers()
      
      // If current user might be affected, refresh their profile
      if (currentUser?.role === 'store_manager') {
        try {
          await refreshProfile()
          console.log('Profile refreshed after store sync')
        } catch (profileError) {
          console.error('Failed to refresh profile after sync:', profileError)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync store assignments')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAuthDebug = async () => {
    try {
      const debugInfo = await authApi.debug()
      console.log('=== AUTH DEBUG INFO ===')
      console.log('Token User:', debugInfo.tokenUser)
      console.log('Database User:', debugInfo.dbUser)
      console.log('Current User from Context:', currentUser)
      
      setSuccess(`Debug info logged to console. Check browser dev tools.`)
    } catch (err: any) {
      console.error('Auth debug failed:', err)
      setError(`Auth debug failed: ${err.response?.data?.error || err.message}`)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_user': return 'error'
      case 'accounts_incharge': return 'secondary'
      case 'store_manager': return 'primary'
      case 'cashier': return 'default'
      default: return 'default'
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'super_user': return 'Super User'
      case 'accounts_incharge': return 'Accounts In-charge'
      case 'store_manager': return 'Store Manager'
      case 'cashier': return 'Cashier'
      default: return role
    }
  }

  const canManageUsers = currentUser?.role === 'store_manager' || currentUser?.role === 'accounts_incharge' || currentUser?.role === 'super_user'

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>System Administration</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<BusinessIcon />} label="Store Management" />
          <Tab icon={<PeopleIcon />} label="User Management" />
        </Tabs>
      </Card>

      {/* Store Management Tab */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Store Locations</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateStoreDialogOpen(true)}
              >
                Create Store
              </Button>
            </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Store Code</TableCell>
                  <TableCell>Store Name</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Petty Cash Limit</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <Chip label={store.store_code} size="small" />
                    </TableCell>
                    <TableCell>{store.store_name}</TableCell>
                    <TableCell>{store.address || '-'}</TableCell>
                    <TableCell>{store.phone || '-'}</TableCell>
                    <TableCell>
                      {store.manager ? 
                        `${store.manager.first_name} ${store.manager.last_name}` : 
                        'Not assigned'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={store.is_active ? 'Active' : 'Inactive'} 
                        color={store.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>₹{store.petty_cash_limit}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small"
                        onClick={() => handleEditStore(store)}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No stores found. Create your first store to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* User Management Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">User Management</Typography>
              </Box>
              <Box display="flex" gap={1}>
                {canManageUsers && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateUserDialogOpen(true)}
                  >
                    Create User Account
                  </Button>
                )}
                {currentUser?.role === 'super_user' && (
                  <>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleSyncStoreAssignments}
                      disabled={submitting}
                    >
                      {submitting ? 'Syncing...' : 'Sync Store Assignments'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="info"
                      onClick={handleAuthDebug}
                      size="small"
                    >
                      Debug Auth
                    </Button>
                  </>
                )}
              </Box>
            </Box>

            {loading ? (
              <LinearProgress />
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Auth Type</TableCell>
                      <TableCell>Store</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell>Created</TableCell>
                      {canManageUsers && <TableCell align="center">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>
                          {user.username || user.email}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getRoleDisplay(user.role)}
                            color={getRoleColor(user.role) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.authentication_type === 'local' ? 'Local' : 'Google SSO'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {user.stores ? `${user.stores.store_code} - ${user.stores.store_name}` : 'All Stores'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            color={user.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {user.last_login 
                            ? format(new Date(user.last_login), 'MMM dd, yyyy HH:mm')
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        {canManageUsers && (
                          <TableCell align="center">
                            <Box display="flex" gap={1}>
                              <Tooltip title="Edit User">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleEditUser(user)}
                                  disabled={submitting}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={user.is_active ? 'Deactivate User' : 'Activate User'}>
                                <IconButton
                                  color={user.is_active ? 'error' : 'success'}
                                  size="small"
                                  onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                  disabled={submitting}
                                >
                                  {user.is_active ? <PersonOffIcon /> : <PersonIcon />}
                                </IconButton>
                              </Tooltip>
                              
                              {user.authentication_type === 'local' && (
                                <Tooltip title="Reset Password">
                                  <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={() => {
                                      setSelectedUser(user)
                                      setResetPasswordDialogOpen(true)
                                    }}
                                    disabled={submitting}
                                  >
                                    <LockIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canManageUsers ? 9 : 8} align="center">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Store Dialog */}
      <Dialog open={createStoreDialogOpen} onClose={() => setCreateStoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Store</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Store Code"
              placeholder="e.g., AN001, DL001"
              value={storeFormData.store_code}
              onChange={(e) => handleStoreInputChange('store_code', e.target.value.toUpperCase())}
              helperText="2-10 uppercase letters/numbers only"
              required
            />
            <TextField
              label="Store Name"
              value={storeFormData.store_name}
              onChange={(e) => handleStoreInputChange('store_name', e.target.value)}
              required
            />
            <TextField
              label="Address"
              multiline
              rows={2}
              value={storeFormData.address}
              onChange={(e) => handleStoreInputChange('address', e.target.value)}
            />
            <TextField
              label="Phone"
              value={storeFormData.phone}
              onChange={(e) => handleStoreInputChange('phone', e.target.value)}
            />
            <FormControl>
              <InputLabel>Store Manager</InputLabel>
              <Select
                value={storeFormData.manager_id}
                onChange={(e) => handleStoreInputChange('manager_id', e.target.value)}
                label="Store Manager"
              >
                <MenuItem value="">No manager assigned</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Petty Cash Limit"
              type="number"
              value={storeFormData.petty_cash_limit}
              onChange={(e) => handleStoreInputChange('petty_cash_limit', Number(e.target.value))}
              InputProps={{ startAdornment: '₹' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateStoreDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateStore} 
            variant="contained"
            disabled={submitting || !storeFormData.store_code || !storeFormData.store_name}
          >
            {submitting ? 'Creating...' : 'Create Store'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={editStoreDialogOpen} onClose={() => setEditStoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Store: {selectedStore?.store_code}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Store Code"
              value={editStoreFormData.store_code}
              disabled
              helperText="Store code cannot be changed"
            />
            <TextField
              label="Store Name"
              value={editStoreFormData.store_name}
              onChange={(e) => handleEditStoreInputChange('store_name', e.target.value)}
              required
            />
            <TextField
              label="Address"
              multiline
              rows={2}
              value={editStoreFormData.address}
              onChange={(e) => handleEditStoreInputChange('address', e.target.value)}
            />
            <TextField
              label="Phone"
              value={editStoreFormData.phone}
              onChange={(e) => handleEditStoreInputChange('phone', e.target.value)}
            />
            <FormControl>
              <InputLabel>Store Manager</InputLabel>
              <Select
                value={editStoreFormData.manager_id}
                onChange={(e) => handleEditStoreInputChange('manager_id', e.target.value)}
                label="Store Manager"
              >
                <MenuItem value="">No manager assigned</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.role})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Petty Cash Limit"
              type="number"
              value={editStoreFormData.petty_cash_limit}
              onChange={(e) => handleEditStoreInputChange('petty_cash_limit', Number(e.target.value))}
              InputProps={{ startAdornment: '₹' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editStoreFormData.is_active}
                  onChange={(e) => handleEditStoreInputChange('is_active', e.target.checked)}
                />
              }
              label="Store Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditStoreDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateStore} 
            variant="contained"
            disabled={submitting || !editStoreFormData.store_name}
          >
            {submitting ? 'Updating...' : 'Update Store'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onClose={() => setCreateUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create User Account</DialogTitle>
        <DialogContent>
          {/* Debug info */}
          <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.100', fontSize: '0.8rem' }}>
            Current role: {userFormData.role} | Password field: {userFormData.role === 'cashier' ? 'visible' : 'hidden'}
          </Box>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {/* 1. Role Selection (first - controls other fields) */}
            <FormControl fullWidth>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={userFormData.role}
                label="Role"
                onChange={(event) => {
                  console.log('Event triggered:', event.target.value)
                  const selectedRole = event.target.value
                  console.log('Selected role:', selectedRole)
                  
                  setUserFormData({
                    ...userFormData,
                    role: selectedRole,
                    password: selectedRole === 'cashier' ? userFormData.password : ''
                  })
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 224,
                    },
                  },
                }}
              >
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="store_manager">Store Manager</MenuItem>
                <MenuItem value="accounts_incharge">Accounts In-charge</MenuItem>
                <MenuItem value="super_user">Super User</MenuItem>
              </Select>
            </FormControl>

            {/* 2. Email */}
            <TextField
              label="Email"
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              fullWidth
              required
              placeholder="user@poppatjamals.com"
              helperText="Username will be auto-generated from email"
            />

            {/* 3. Password (only for cashiers) */}
            {userFormData.role === 'cashier' && (
              <TextField
                label="Password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                fullWidth
                required
                helperText="Minimum 6 characters (local authentication)"
              />
            )}

            {/* 4. First Name */}
            <TextField
              label="First Name"
              value={userFormData.first_name}
              onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
              fullWidth
              required
            />

            {/* 5. Last Name */}
            <TextField
              label="Last Name"
              value={userFormData.last_name}
              onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateUserDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onClose={() => setEditUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User: {selectedUser?.first_name} {selectedUser?.last_name}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="First Name"
              value={editUserFormData.first_name}
              onChange={(e) => setEditUserFormData({ ...editUserFormData, first_name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Last Name"
              value={editUserFormData.last_name}
              onChange={(e) => setEditUserFormData({ ...editUserFormData, last_name: e.target.value })}
              fullWidth
              required
            />

            {currentUser?.role === 'super_user' && (
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editUserFormData.role}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="cashier">Cashier</MenuItem>
                  <MenuItem value="store_manager">Store Manager</MenuItem>
                  <MenuItem value="accounts_incharge">Accounts In-charge</MenuItem>
                  <MenuItem value="super_user">Super User</MenuItem>
                </Select>
              </FormControl>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={editUserFormData.is_active}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, is_active: e.target.checked })}
                />
              }
              label="User Active"
            />

            {selectedUser?.authentication_type === 'google' && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This user uses Google SSO authentication. Username and password are managed by Google.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={submitting || !editUserFormData.first_name || !editUserFormData.last_name}
          >
            {submitting ? 'Updating...' : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password for {selectedUser?.first_name} {selectedUser?.last_name}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="New Password"
              type="password"
              value={resetPasswordForm.new_password}
              onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, new_password: e.target.value })}
              fullWidth
              required
              helperText="Minimum 6 characters"
            />

            <TextField
              label="Confirm New Password"
              type="password"
              value={resetPasswordForm.confirm_password}
              onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirm_password: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Admin