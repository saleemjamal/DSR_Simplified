import { Typography, Card, CardContent, Alert } from '@mui/material'

const Vouchers = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>Gift Voucher Management</Typography>
        <Alert severity="info">
          Gift voucher system will be implemented in the next development phase.
          This will include voucher creation, redemption, and balance tracking.
        </Alert>
      </CardContent>
    </Card>
  )
}

export default Vouchers