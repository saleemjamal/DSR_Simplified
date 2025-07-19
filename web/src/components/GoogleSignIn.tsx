import React from 'react'
import { Button, CircularProgress } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { supabase } from '../config/supabase'

interface GoogleSignInProps {
  onSuccess: (credential: string) => void
  onError: (error: string) => void
  disabled?: boolean
  loading?: boolean
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ 
  onSuccess, 
  onError, 
  disabled = false,
  loading = false 
}) => {
  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            hd: 'poppatjamals.com'
          }
        }
      })

      if (error) {
        onError(error.message)
        return
      }

      // OAuth will redirect, so we handle success in the callback
    } catch (error: any) {
      console.error('Google Sign-In error:', error)
      onError('Failed to initiate Google Sign-In')
    }
  }

  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      sx={{
        borderColor: '#db4437',
        color: '#db4437',
        '&:hover': {
          borderColor: '#c23321',
          backgroundColor: 'rgba(219, 68, 55, 0.04)'
        },
        '&:disabled': {
          borderColor: 'rgba(0, 0, 0, 0.12)',
          color: 'rgba(0, 0, 0, 0.26)'
        }
      }}
    >
      {loading ? 'Signing in...' : 'Sign in with Google Workspace'}
    </Button>
  )
}

export default GoogleSignIn