import { Box, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

/**
 * Reusable page header component
 * @param {string} title - Page title
 * @param {string} subtitle - Optional subtitle
 * @param {function} onAdd - Optional add button handler
 * @param {string} addButtonText - Text for add button
 * @param {node} actions - Optional custom action buttons
 */
const PageHeader = ({
  title,
  subtitle,
  onAdd,
  addButtonText = 'Add New',
  actions,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {actions}
        {onAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
          >
            {addButtonText}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default PageHeader
