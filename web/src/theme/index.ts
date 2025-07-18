import { createTheme } from '@mui/material/styles'

// Poppat Jamals brand colors from DESIGN.md
const theme = createTheme({
  palette: {
    primary: {
      main: '#1565C0',      // Deep Blue - Main brand
      light: '#42A5F5',     // Light Blue - Accents  
      dark: '#0D47A1',      // Dark Blue - Headers
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#FF8F00',      // Amber - Alerts/Actions
      light: '#FFB74D',     // Light Amber - Highlights
      dark: '#E65100',      // Dark Amber - Warnings
      contrastText: '#ffffff'
    },
    background: {
      default: '#F5F5F5',   // Secondary background
      paper: '#FFFFFF'      // Card/paper background
    },
    text: {
      primary: '#212121',   // Main text
      secondary: '#757575'  // Secondary text
    },
    success: {
      main: '#2E7D32',      // Green - Completed actions
      light: '#4CAF50',     // Light Green - Success messages
    },
    warning: {
      main: '#F57C00',      // Orange - Pending/Review
      light: '#FF9800',     // Light Orange - Warnings
    },
    error: {
      main: '#C62828',      // Red - Errors/Rejected
      light: '#F44336',     // Light Red - Error messages
    },
    info: {
      main: '#1976D2',      // Blue - Information
      light: '#2196F3',     // Light Blue - Info messages
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',   // 40px - Page titles
      fontWeight: 500
    },
    h2: {
      fontSize: '2rem',     // 32px - Section headers
      fontWeight: 500
    },
    h3: {
      fontSize: '1.5rem',   // 24px - Card titles
      fontWeight: 500
    },
    h4: {
      fontSize: '1.25rem',  // 20px - Subsection headers
      fontWeight: 500
    },
    h5: {
      fontSize: '1.125rem', // 18px - Component titles
      fontWeight: 500
    },
    h6: {
      fontSize: '1rem',     // 16px - Small headers
      fontWeight: 500
    },
    body1: {
      fontSize: '1rem',     // 16px - Default body text
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem', // 14px - Secondary text
      lineHeight: 1.4
    },
    caption: {
      fontSize: '0.75rem'   // 12px - Captions, labels
    },
    button: {
      fontSize: '0.875rem', // 14px - Button text
      fontWeight: 500,
      textTransform: 'none'  // Keep original case
    }
  },
  spacing: 8, // Base spacing unit: 8px
  shape: {
    borderRadius: 8 // Default border radius
  },
  components: {
    // Button customizations
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,    // Touch target size
          borderRadius: 8,
          textTransform: 'none'
        },
        containedPrimary: {
          boxShadow: '0 2px 8px rgba(21, 101, 192, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(21, 101, 192, 0.4)'
          }
        }
      }
    },
    // Card customizations
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E0E0E0'
        }
      }
    },
    // Input field customizations
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            minHeight: 44,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1565C0'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: '#1565C0'
            }
          }
        }
      }
    },
    // AppBar customizations
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1565C0',
          boxShadow: '0 2px 8px rgba(21, 101, 192, 0.2)'
        }
      }
    }
  }
})

export default theme