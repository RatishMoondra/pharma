import { Box, CircularProgress, Typography } from '@mui/material'

/**
 * Reusable loading spinner component
 * @param {string} message - Optional loading message
 * @param {number} py - Vertical padding
 */
const LoadingSpinner = ({ message = 'Loading...', py = 4 }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        py,
      }}
    >
      <CircularProgress />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  )
}

export default LoadingSpinner
