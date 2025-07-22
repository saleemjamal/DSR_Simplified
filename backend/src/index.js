const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const app = express()
const PORT = process.env.PORT || 3004

// Security middleware
app.use(helmet())

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3003',
  credentials: true
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(morgan('combined'))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Poppat Jamals DSR API',
    version: '1.0.0'
  })
})

// API Routes
app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/stores', require('./routes/stores'))
app.use('/api/v1/sales', require('./routes/sales'))
app.use('/api/v1/expenses', require('./routes/expenses'))
app.use('/api/v1/vouchers', require('./routes/vouchers'))
app.use('/api/v1/customers', require('./routes/customers'))
app.use('/api/v1/sales-orders', require('./routes/sales_orders'))
app.use('/api/v1/deposits', require('./routes/deposits'))
app.use('/api/v1/hand-bills', require('./routes/hand_bills'))
app.use('/api/v1/returns', require('./routes/returns'))
app.use('/api/v1/damage', require('./routes/damage'))
app.use('/api/v1/reports', require('./routes/reports'))
app.use('/api/v1/admin', require('./routes/admin'))

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this data already exists'
    })
  }
  
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Foreign key constraint',
      message: 'Referenced record does not exist'
    })
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Poppat Jamals DSR API server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
})