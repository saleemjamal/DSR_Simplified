import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  Tab,
  Tabs,
  CircularProgress
} from '@mui/material'
import {
  AccountCircle,
  Lock,
  Business,
  Google
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`login-tabpanel-${index}`}
      aria-labelledby={`login-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const Login = () => {
  const [tab, setTab] = useState(0)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, loginGoogle, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }

    try {
      setLoading(true)
      setError('')
      await login({ username, password })
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    // TODO: Implement Google OAuth flow
    // For now, show placeholder
    setError('Google SSO will be implemented in next phase')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={3}>
            <Business sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" color="primary" fontWeight="bold">
              Poppat Jamals
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Daily Reporting System
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tab}
              onChange={(_, newValue) => setTab(newValue)}
              variant="fullWidth"
            >
              <Tab 
                label="Cashier Login" 
                icon={<AccountCircle />}
                iconPosition="start"
              />
              <Tab 
                label="Manager Login" 
                icon={<Google />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Cashier Login Panel */}
          <TabPanel value={tab} index={0}>
            <form onSubmit={handleLocalLogin}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                margin="normal"
                InputProps={{
                  startAdornment: <AccountCircle sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                margin="normal"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, minHeight: 48 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Login as Cashier'
                )}
              </Button>
            </form>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Cashier accounts are created by store managers
            </Typography>
          </TabPanel>

          {/* Manager Login Panel */}
          <TabPanel value={tab} index={1}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Google />}
              onClick={handleGoogleLogin}
              disabled={loading}
              sx={{ 
                mt: 2, 
                mb: 2, 
                minHeight: 48,
                backgroundColor: '#4285f4',
                '&:hover': {
                  backgroundColor: '#357ae8'
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign in with Google'
              )}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              For Store Managers, Accounts Incharge, and Super Users
              <br />
              Requires @poppatjamals.com email
            </Typography>
          </TabPanel>

          <Divider sx={{ my: 2 }} />

          {/* Footer */}
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
            Daily Reporting System v1.0
            <br />
            Contact support for login issues
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Login