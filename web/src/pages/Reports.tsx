import { Typography, Card, CardContent, Alert } from '@mui/material'

const Reports = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>Reports & Analytics</Typography>
        <Alert severity="info">
          Comprehensive reporting system will be implemented in the next development phase.
          This will include daily sales reports, cash reconciliation, and expense analysis.
        </Alert>
      </CardContent>
    </Card>
  )
}

export default Reports