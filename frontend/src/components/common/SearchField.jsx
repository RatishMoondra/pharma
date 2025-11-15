import { TextField, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'

/**
 * Reusable search input component with consistent styling
 * @param {string} value - Current search query value
 * @param {function} onChange - Handler for search query changes
 * @param {string} placeholder - Placeholder text for search field
 * @param {object} sx - Additional Material-UI styles
 */
const SearchField = ({ value, onChange, placeholder = 'Search...', sx = {} }) => {
  return (
    <TextField
      fullWidth
      variant="outlined"
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
      }}
      sx={{
        maxWidth: 600,
        mb: 3,
        '& .MuiOutlinedInput-root': {
          bgcolor: 'white',
        },
        ...sx,
      }}
    />
  )
}

export default SearchField
