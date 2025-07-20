import { createTheme } from '@mui/material/styles'

// Anthropic-inspired color palette
const palette = {
  primary: {
    main: '#2D3748',
    light: '#4A5568',
    dark: '#1A202C',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#3182CE',
    light: '#63B3ED',
    dark: '#2C5282',
    contrastText: '#FFFFFF'
  },
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF'
  },
  text: {
    primary: '#1A202C',
    secondary: '#4A5568',
    disabled: '#718096'
  },
  success: {
    main: '#38A169',
    light: '#68D391',
    dark: '#2F855A'
  },
  warning: {
    main: '#D69E2E',
    light: '#F6E05E',
    dark: '#B7791F'
  },
  error: {
    main: '#E53E3E',
    light: '#FC8181',
    dark: '#C53030'
  },
  info: {
    main: '#3182CE',
    light: '#63B3ED',
    dark: '#2C5282'
  },
  grey: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923'
  }
}

// Anthropic-inspired typography
const typography = {
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    color: palette.text.primary
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: palette.text.primary
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.3,
    color: palette.text.primary
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: palette.text.primary
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
    color: palette.text.primary
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 500,
    lineHeight: 1.4,
    color: palette.primary.main
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
    color: palette.text.secondary
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
    color: palette.text.secondary
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
    color: palette.text.primary
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
    color: palette.text.primary
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
    color: palette.text.disabled
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5,
    textTransform: 'none' as const
  }
}

// Anthropic-inspired shadows
const shadows = [
  'none',
  '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
  '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06)',
  '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
  '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)',
  '0 25px 50px rgba(0,0,0,0.25)'
] as const

export const anthropicTheme = createTheme({
  palette,
  typography,
  shadows,
  shape: {
    borderRadius: 8
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }
        },
        contained: {
          background: 'linear-gradient(135deg, #2D3748 0%, #4A5568 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1A202C 0%, #2D3748 100%)'
          }
        },
        outlined: {
          borderColor: palette.grey[300],
          color: palette.text.primary,
          '&:hover': {
            borderColor: palette.primary.main,
            backgroundColor: 'rgba(45, 55, 72, 0.04)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
          borderRadius: 12,
          border: `1px solid ${palette.grey[200]}`,
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06)'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: palette.grey[300]
            },
            '&:hover fieldset': {
              borderColor: palette.grey[400]
            },
            '&.Mui-focused fieldset': {
              borderColor: palette.primary.main,
              borderWidth: 2
            }
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          fontSize: '0.75rem'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: palette.grey[50],
            fontWeight: 600,
            fontSize: '0.875rem',
            color: palette.text.primary,
            borderBottom: `2px solid ${palette.grey[200]}`
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(45, 55, 72, 0.02)'
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(49, 130, 206, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(49, 130, 206, 0.12)'
            }
          }
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&:hover': {
            backgroundColor: 'rgba(45, 55, 72, 0.04)'
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(49, 130, 206, 0.08)',
            borderLeft: `3px solid ${palette.secondary.main}`,
            '&:hover': {
              backgroundColor: 'rgba(49, 130, 206, 0.12)'
            }
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: palette.background.paper,
          color: palette.text.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
          borderBottom: `1px solid ${palette.grey[200]}`
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${palette.grey[200]}`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.06)'
        }
      }
    }
  }
})

export default anthropicTheme