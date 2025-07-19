import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { supabase } from '../config/supabase'
import { useAuth } from '../hooks/useAuth'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { loginGoogle } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          navigate('/login?error=auth_failed')
          return
        }

        if (data.session?.access_token) {
          // Use the access token to authenticate with our backend
          await loginGoogle(data.session.access_token)
          navigate('/dashboard')
        } else {
          navigate('/login?error=no_session')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [navigate, loginGoogle])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="h6" color="text.secondary">
        Completing sign-in...
      </Typography>
    </Box>
  )
}

export default AuthCallback