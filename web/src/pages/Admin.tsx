import { Typography, Card, CardContent, Alert } from '@mui/material'

const Admin = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>System Administration</Typography>
        <Alert severity="info">
          Administration interface will be implemented in the next development phase.
          This will include user management, system settings, and audit logs.
        </Alert>
      </CardContent>
    </Card>
  )
}

export default Admin