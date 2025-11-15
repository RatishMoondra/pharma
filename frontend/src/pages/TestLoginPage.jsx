import { useState } from 'react'
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material'

const TestLoginPage = () => {
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin123' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const testDirectFetch = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      setResult({
        status: response.status,
        ok: response.ok,
        data: JSON.stringify(data, null, 2),
        username: credentials.username,
        password: credentials.password,
        passwordLength: credentials.password.length,
        passwordBytes: Array.from(credentials.password).map(c => c.charCodeAt(0)).join(', ')
      })
    } catch (error) {
      setResult({
        error: error.message,
        username: credentials.username,
        password: credentials.password,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Login Diagnostic Tool
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          This page tests the login endpoint directly with default credentials.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Username"
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type="text"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={testDirectFetch}
            disabled={loading}
            fullWidth
          >
            {loading ? 'Testing...' : 'Test Login'}
          </Button>
        </Box>

        {result && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Results:
            </Typography>
            
            <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
              Status: {result.status} - {result.ok ? 'SUCCESS' : 'FAILED'}
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Credentials Sent:
              </Typography>
              <Typography variant="body2">
                Username: "{result.username}"
              </Typography>
              <Typography variant="body2">
                Password: "{result.password}"
              </Typography>
              <Typography variant="body2">
                Password Length: {result.passwordLength}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Password Bytes: {result.passwordBytes}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Response:
              </Typography>
              <pre style={{ overflow: 'auto', fontSize: '0.75rem' }}>
                {result.data || result.error}
              </pre>
            </Paper>
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Expected credentials:</strong><br />
            Username: admin<br />
            Password: admin123 (no spaces)
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}

export default TestLoginPage
