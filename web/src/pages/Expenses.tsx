import { Typography, Card, CardContent, Alert } from '@mui/material'

const Expenses = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>Expense Management</Typography>
        <Alert severity="info">
          Expense management interface will be implemented in the next development phase.
          This will include expense entry, approval workflows, and categorization.
        </Alert>
      </CardContent>
    </Card>
  )
}

export default Expenses