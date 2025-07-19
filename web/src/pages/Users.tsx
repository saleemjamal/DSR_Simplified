import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material'
import {
  Add,
  Edit,
  Lock,
  Person,
  PersonOff
} from '@mui/icons-material'
import { format } from 'date-fns'
import { User } from '../types'
import { authApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: ''
  })
  
  const [resetPasswordForm, setResetPasswordForm] = useState({
    new_password: '',
    confirm_password: ''
  })

  const { user } = useAuth()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const usersData = await authApi.getUsers()
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      setSubmitting(true)
      setError('')
      
      if (!createForm.username || !createForm.password || !createForm.first_name || !createForm.last_name) {
        setError('All fields are required')
        return
      }
      
      if (createForm.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      
      await authApi.createCashier(createForm)
      
      setCreateDialogOpen(false)
      setCreateForm({
        username: '',
        password: '',
        first_name: '',
        last_name: ''
      })
      setSuccess('Cashier account created successfully')
      await loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create cashier account')
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'store_manager': return 'primary'
      case 'accounts_incharge': return 'secondary'
      case 'cashier': return 'default'
      default: return 'default'
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'store_manager': return 'Store Manager'
      case 'accounts_incharge': return 'Accounts In-charge'
      case 'cashier': return 'Cashier'
      default: return role
    }
  }

  const canManageUsers = user?.role === 'store_manager' || user?.role === 'accounts_incharge'

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        {canManageUsers && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Cashier Account
          </Button>
        )}
      </Box>

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

      {/* Users Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Store Users
          </Typography>
          
          {loading ? (
            <LinearProgress />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Auth Type</TableCell>
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
                            <Tooltip title={user.is_active ? 'Deactivate User' : 'Activate User'}>
                              <IconButton
                                color={user.is_active ? 'error' : 'success'}
                                size="small"
                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                disabled={submitting}
                              >
                                {user.is_active ? <PersonOff /> : <Person />}
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
                                  <Lock />
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
                      <TableCell colSpan={canManageUsers ? 8 : 7} align="center">
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Cashier Account</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Username"
              value={createForm.username}
              onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              fullWidth
              required
              helperText="Minimum 6 characters"
            />

            <TextField
              label="First Name"
              value={createForm.first_name}
              onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Last Name"
              value={createForm.last_name}
              onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Account'}
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

export default Users