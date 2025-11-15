import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from '@mui/material'
import { tableStyles } from '../../utils/tableHelpers'

/**
 * Reusable data table component with consistent styling
 * @param {Array} columns - Column definitions [{field, headerName, align, render}]
 * @param {Array} data - Data array to display
 * @param {function} renderRow - Optional custom row renderer
 * @param {object} sx - Additional styles
 */
const DataTable = ({ columns, data, renderRow, sx = {} }) => {
  return (
    <TableContainer component={Paper} sx={sx}>
      <Table>
        <TableHead>
          <TableRow sx={tableStyles.headerRow}>
            {columns.map((column, index) => (
              <TableCell
                key={column.field || index}
                sx={tableStyles.headerCell}
                align={column.align || 'left'}
                width={column.width}
              >
                {column.headerName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              if (renderRow) {
                return renderRow(row, index)
              }
              return (
                <TableRow key={row.id || index} sx={tableStyles.bodyRow(index)}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} align={column.align || 'left'}>
                      {column.render
                        ? column.render(row)
                        : row[column.field] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default DataTable
