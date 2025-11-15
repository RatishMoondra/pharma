import { Snackbar, Alert } from '@mui/material'

/**
 * Reusable snackbar notification component
 * @param {boolean} open - Whether snackbar is visible
 * @param {string} message - Message to display
 * @param {string} severity - Alert severity (success, error, warning, info)
 * @param {function} onClose - Close handler
 * @param {number} autoHideDuration - Auto hide duration in ms (default 6000)
 */
const NotificationSnackbar = ({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 6000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity={severity} onClose={onClose} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}

export default NotificationSnackbar
