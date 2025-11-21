import React, { useState } from 'react'; // Explicit React import added
import {
  Tooltip,
  IconButton,
  CircularProgress,
  Typography,
  Stack,
  Paper, // Added Paper for structured tooltip content
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import api from '../../services/api'; // Adjust path as needed

// Helper to determine the key for material ID
const getMaterialKey = (type) => {
  if (type === 'RM') return 'raw_material_id';
  if (type === 'PM') return 'packing_material_id';
  return null;
};

/**
 * Common component for displaying Material (RM/PM) balance summary.
 */
const MaterialBalanceInfo = ({ materialId, materialType, materialName }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const apiPath = materialType === 'RM' ? 'summary' : 'pmsummary';

  const handleFetch = async () => {
    if (summary || loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/material-balance/${apiPath}/${materialId}`);
      // Assuming res.data structure is { total_ordered: 100, total_received: 50, total_balance: 50 }
      setSummary(res.data);
    } catch (err) {
      setSummary({ total_ordered: 'N/A', total_received: 'N/A', total_balance: 'N/A' });
    } finally {
      setLoading(false);
    }
  };

  const tooltipTitle = loading ? (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 0.5 }}>
      <CircularProgress size={16} color="inherit" />
      <Typography variant="caption">Loading Balance...</Typography>
    </Stack>
  ) : summary ? (
    <Paper elevation={3} sx={{ p: 1, bgcolor: 'background.paper', borderLeft: '4px solid', borderColor: 'primary.main', minWidth: 200 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'primary.dark' }}>
        {materialName} ({materialType})
      </Typography>
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          <span style={{ fontWeight: 'bold' }}>Ordered:</span> {summary.total_ordered}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          <span style={{ fontWeight: 'bold' }}>Received:</span> {summary.total_received}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ color: 'success.dark', fontWeight: 'bold' }}>
          Balance: {summary.total_balance}
        </Typography>
      </Stack>
    </Paper>
  ) : (
    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
      Click to view {materialType} Balance for {materialName}
    </Typography>
  );

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      open={open}
      onOpen={() => {
        setOpen(true);
        handleFetch();
      }}
      onClose={() => setOpen(false)}
      placement="right"
    >
      <IconButton 
        size="small" 
        sx={{ 
          color: 'info.main', 
          '&:hover': { color: 'info.dark' } 
        }}
      >
        <InfoOutlinedIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
};

// --- Export Components (wrappers for backward compatibility) ---

export const RawMaterialInfo = ({ raw_material_id, raw_material_name }) => (
  <MaterialBalanceInfo 
    materialId={raw_material_id} 
    materialType="RM" 
    materialName={raw_material_name || `RM-${raw_material_id}`}
  />
);

export const PackingMaterialInfo = ({ packing_material_id, packing_material_name }) => (
  <MaterialBalanceInfo 
    materialId={packing_material_id} 
    materialType="PM" 
    materialName={packing_material_name || `PM-${packing_material_id}`}
  />
);