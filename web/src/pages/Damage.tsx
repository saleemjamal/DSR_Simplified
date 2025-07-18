import { Typography, Card, CardContent, Alert } from '@mui/material'

const Damage = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>Damage Reports</Typography>
        <Alert severity="info">
          Damage reporting system will be implemented in the next development phase.
          This will include damage entry, supplier tracking, and automated alerts.
        </Alert>
      </CardContent>
    </Card>
  )
}

export default Damage