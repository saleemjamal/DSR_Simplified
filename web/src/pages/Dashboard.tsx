import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material'
import {
  TrendingUp,
  PendingActions,
  AccountBalance,
  Warning,
  PointOfSale,
  Receipt,
  CardGiftcard,
  Assessment
} from '@mui/icons-material'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi } from '../services/api'
import { format } from 'date-fns'

interface DashboardCard {
  title: string
  value: string | number
  icon: React.ReactElement
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  action?: () => void
  actionText?: string
}

const Dashboard = () => {
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todaySales, setTodaySales] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState({
    todayTotal: 0,
    pendingApprovals: 0,
    cashVariance: 0,
    cashVarianceStatus: 'unknown',
    cashTransactionCount: 0,
    overdueCredits: 0
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    loadDashboardData()
    
    // Refresh profile to ensure store information is current
    if (user && !user.stores && user.role === 'store_manager') {
      console.log('Store manager without store info detected, refreshing profile...')
      refreshProfile()
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load all dashboard data in one consolidated API call (90% faster)
      const { salesSummary, dashboardStats } = await dashboardApi.getData(today)
      
      setTodaySales(salesSummary)
      setDashboardStats(dashboardStats)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getCashVarianceDisplay = () => {
    const { cashVariance, cashVarianceStatus, cashTransactionCount } = dashboardStats

    if (cashTransactionCount === 0) {
      return 'No Transactions'
    }

    switch (cashVarianceStatus) {
      case 'balanced':
        return '✅ Balanced'
      case 'surplus':
        return `+₹${Math.abs(cashVariance).toLocaleString()}`
      case 'deficit':
        return `-₹${Math.abs(cashVariance).toLocaleString()}`
      case 'no_store':
        return 'No Store'
      case 'error':
        return 'Error'
      default:
        return `₹${Math.abs(cashVariance).toLocaleString()}`
    }
  }

  const getCashVarianceColor = (): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    const { cashVarianceStatus, cashTransactionCount } = dashboardStats

    if (cashTransactionCount === 0) {
      return 'secondary'
    }

    switch (cashVarianceStatus) {
      case 'balanced':
        return 'success'
      case 'surplus':
        return 'warning'
      case 'deficit':
        return 'error'
      case 'no_store':
      case 'error':
        return 'secondary'
      default:
        return 'primary'
    }
  }

  const getRoleSpecificCards = (): DashboardCard[] => {
    const baseCards: DashboardCard[] = [
      {
        title: "Today's Sales",
        value: `₹${dashboardStats.todayTotal.toLocaleString()}`,
        icon: <TrendingUp />,
        color: 'primary',
        action: () => window.location.href = '/sales',
        actionText: 'View Sales'
      }
    ]

    if (user?.role === 'cashier') {
      return baseCards
    }

    // Manager and admin cards
    const managerCards: DashboardCard[] = [
      {
        title: 'Pending Approvals',
        value: dashboardStats.pendingApprovals,
        icon: <PendingActions />,
        color: 'warning',
        action: () => window.location.href = '/expenses',
        actionText: 'Review'
      },
      {
        title: 'Cash Reconciliation',
        value: getCashVarianceDisplay(),
        icon: <AccountBalance />,
        color: getCashVarianceColor(),
        action: dashboardStats.cashTransactionCount > 0 ? () => console.log('Cash details clicked') : undefined,
        actionText: dashboardStats.cashTransactionCount > 0 ? 'View Details' : undefined
      }
    ]

    if (user?.role === 'super_user' || user?.role === 'accounts_incharge') {
      managerCards.push({
        title: 'Overdue Credits',
        value: dashboardStats.overdueCredits,
        icon: <Warning />,
        color: 'error',
        action: () => window.location.href = '/reports',
        actionText: 'Review'
      })
    }

    return [...baseCards, ...managerCards]
  }

  const getQuickActions = () => {
    const actions = [
      {
        title: 'Record Sale',
        description: 'Add new sales entry',
        icon: <PointOfSale />,
        color: 'primary' as const,
        path: '/sales'
      }
    ]

    if (user?.role !== 'cashier') {
      actions.push(
        {
          title: 'Add Expense',
          description: 'Record business expense',
          icon: <Receipt />,
          color: 'secondary' as const,
          path: '/expenses'
        },
        {
          title: 'Gift Voucher',
          description: 'Create or redeem voucher',
          icon: <CardGiftcard />,
          color: 'success' as const,
          path: '/vouchers'
        },
        {
          title: 'View Reports',
          description: 'Daily and monthly reports',
          icon: <Assessment />,
          color: 'info' as const,
          path: '/reports'
        }
      )
    }

    return actions
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Loading Dashboard...</Typography>
        <LinearProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Welcome Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          {getGreeting()}, {user?.first_name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
          {user?.role === 'super_user' || user?.role === 'accounts_incharge' ? 
            ' • Multi-Store Access' : 
            user?.stores ? ` • Store: ${user.stores.store_name}` : ' • No Store Assigned'
          }
        </Typography>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        {getRoleSpecificCards().map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: card.action ? 'pointer' : 'default'
              }}
              onClick={card.action}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" color={`${card.color}.main`}>
                      {card.value}
                    </Typography>
                    {card.actionText && (
                      <Button size="small" color={card.color} sx={{ mt: 1 }}>
                        {card.actionText}
                      </Button>
                    )}
                  </Box>
                  <Box color={`${card.color}.main`}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Today's Sales Breakdown */}
      {todaySales.length > 0 && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Sales by Tender Type
                </Typography>
                <Grid container spacing={2}>
                  {todaySales.map((sale, index) => (
                    <Grid item xs={6} sm={4} md={3} key={index}>
                      <Box textAlign="center" p={2}>
                        <Typography variant="h6" color="primary">
                          ₹{sale.total_amount.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sale.tender_type.toUpperCase()}
                        </Typography>
                        <Chip 
                          label={`${sale.count} transactions`} 
                          size="small" 
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {getQuickActions().map((action, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      color={action.color}
                      startIcon={action.icon}
                      onClick={() => window.location.href = action.path}
                      sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {action.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Cash Reconciliation Details */}
      {(user?.role !== 'cashier' && dashboardStats.cashTransactionCount > 0) && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AccountBalance sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Cash Reconciliation Details
                  </Typography>
                  <Chip 
                    label={dashboardStats.cashVarianceStatus || 'Unknown'} 
                    color={getCashVarianceColor()} 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Today's cash transactions and variance calculation for {format(new Date(), 'MMM dd, yyyy')}
                </Typography>
                <Box display="flex" gap={4} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Cash Transactions
                    </Typography>
                    <Typography variant="h6">
                      {dashboardStats.cashTransactionCount}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Variance Amount
                    </Typography>
                    <Typography variant="h6" color={getCashVarianceColor() === 'success' ? 'success.main' : getCashVarianceColor() === 'error' ? 'error.main' : 'warning.main'}>
                      {getCashVarianceDisplay()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      {dashboardStats.cashVarianceStatus === 'balanced' ? '✅ All balanced' :
                       dashboardStats.cashVarianceStatus === 'surplus' ? '📈 Cash surplus' :
                       dashboardStats.cashVarianceStatus === 'deficit' ? '📉 Cash deficit' :
                       '❓ Calculating...'}
                    </Typography>
                  </Box>
                </Box>
                {dashboardStats.cashVarianceStatus === 'balanced' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Perfect! Your cash is perfectly balanced today.
                  </Alert>
                )}
                {(dashboardStats.cashVarianceStatus === 'surplus' || dashboardStats.cashVarianceStatus === 'deficit') && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Cash variance detected. Please verify your cash count and transactions.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* No Sales Today */}
      {todaySales.length === 0 && (
        <Alert severity="info" sx={{ mb: 4 }}>
          No sales recorded today. Start by adding your first sale entry.
        </Alert>
      )}

      {/* Important Reminders */}
      {user?.role !== 'cashier' && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Reminders
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Alert severity="warning" variant="outlined">
                Daily sales entry deadline: 12:00 PM (for previous day)
              </Alert>
              <Alert severity="info" variant="outlined">
                Remember to reconcile cash at end of day
              </Alert>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default Dashboard