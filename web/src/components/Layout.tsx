import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  PointOfSale,
  Receipt,
  CardGiftcard,
  ShoppingCart,
  ReportProblem,
  Assessment,
  Settings,
  AccountCircle,
  Logout,
  Business,
  People,
  CheckCircle,
  Article,
  ExpandLess,
  ExpandMore,
  Payment,
  Analytics,
  AdminPanelSettings
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const DRAWER_WIDTH = 240

interface NavItem {
  text: string
  icon: React.ReactElement
  path?: string
  roles?: string[]
  children?: NavItem[]
  expandable?: boolean
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { 
    text: 'Daily Operations', 
    icon: <PointOfSale />, 
    expandable: true,
    children: [
      { text: 'Sales Entry', icon: <PointOfSale />, path: '/sales' },
      { text: 'Expenses', icon: <Receipt />, path: '/expenses' }
    ]
  },
  { 
    text: 'Transaction Management', 
    icon: <Payment />, 
    expandable: true,
    children: [
      { text: 'Gift Vouchers', icon: <CardGiftcard />, path: '/vouchers' },
      { text: 'Sales Orders', icon: <ShoppingCart />, path: '/sales-orders' },
      { 
        text: 'Hand Bills', 
        icon: <Article />, 
        path: '/hand-bills',
        roles: ['store_manager', 'super_user', 'accounts_incharge']
      }
    ]
  },
  { 
    text: 'Reports & Analytics', 
    icon: <Analytics />, 
    expandable: true,
    children: [
      { text: 'Reports', icon: <Assessment />, path: '/reports' },
      { text: 'Damage Reports', icon: <ReportProblem />, path: '/damage' }
    ]
  },
  { 
    text: 'System Management', 
    icon: <AdminPanelSettings />, 
    expandable: true,
    children: [
      { 
        text: 'Approvals', 
        icon: <CheckCircle />, 
        path: '/approvals',
        roles: ['super_user', 'accounts_incharge']
      },
      { 
        text: 'Administration', 
        icon: <Settings />, 
        path: '/admin',
        roles: ['super_user']
      }
    ]
  }
]

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null)
  const [expandedSections, setExpandedSections] = useState<string[]>(['Transaction Management'])
  
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null)
  }

  const handleLogout = async () => {
    handleProfileMenuClose()
    await logout()
    navigate('/login')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const handleSectionToggle = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    )
  }

  const isCurrentPath = (path?: string) => {
    return path && location.pathname === path
  }

  const isInSection = (section: NavItem) => {
    if (!section.children) return false
    return section.children.some(child => child.path && location.pathname === child.path)
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'store_manager': return 'Store Manager'
      case 'accounts_incharge': return 'Accounts Incharge'
      case 'super_user': return 'Super User'
      case 'cashier': return 'Cashier'
      default: return role
    }
  }

  const drawer = (
    <Box>
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #1565C0 0%, #42A5F5 100%)',
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Business sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Poppat Jamals
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Daily Reporting System
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ pt: 1 }}>
        {navItems.map((item) => (
          <Box key={item.text}>
            {item.expandable ? (
              <>
                {/* Expandable Section Header */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSectionToggle(item.text)}
                    selected={isInSection(item)}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(49, 130, 206, 0.08)',
                        '&:hover': {
                          backgroundColor: 'rgba(49, 130, 206, 0.12)'
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    />
                    {expandedSections.includes(item.text) ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>

                {/* Collapsible Children */}
                <Collapse in={expandedSections.includes(item.text)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children
                      ?.filter(child => !child.roles || hasRole(child.roles))
                      .map((child) => (
                        <ListItem key={child.text} disablePadding>
                          <ListItemButton
                            selected={isCurrentPath(child.path)}
                            onClick={() => child.path && handleNavigation(child.path)}
                            sx={{
                              pl: 6,
                              borderRadius: 2,
                              mx: 1,
                              mb: 0.5,
                              '&.Mui-selected': {
                                backgroundColor: 'rgba(49, 130, 206, 0.12)',
                                borderLeft: '3px solid',
                                borderLeftColor: 'secondary.main',
                                '&:hover': {
                                  backgroundColor: 'rgba(49, 130, 206, 0.16)'
                                }
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText 
                              primary={child.text}
                              primaryTypographyProps={{
                                fontSize: '0.8125rem',
                                fontWeight: isCurrentPath(child.path) ? 500 : 400
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                  </List>
                </Collapse>
              </>
            ) : (
              /* Non-expandable Item */
              <ListItem disablePadding>
                <ListItemButton
                  selected={isCurrentPath(item.path)}
                  onClick={() => item.path && handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(49, 130, 206, 0.12)',
                      borderLeft: '3px solid',
                      borderLeftColor: 'secondary.main',
                      '&:hover': {
                        backgroundColor: 'rgba(49, 130, 206, 0.16)'
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isCurrentPath(item.path) ? 500 : 400
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </Box>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {(() => {
              // Find current page title from hierarchical structure
              for (const item of navItems) {
                if (item.path === location.pathname) {
                  return item.text
                }
                if (item.children) {
                  const child = item.children.find(child => child.path === location.pathname)
                  if (child) {
                    return child.text
                  }
                }
              }
              return 'Dashboard'
            })()}
          </Typography>

          {/* User Profile */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <IconButton
              size="large"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user && getInitials(user.first_name, user.last_name)}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user && getRoleDisplay(user.role)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email || user?.username}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          Profile Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8, // AppBar height
          p: 3
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout