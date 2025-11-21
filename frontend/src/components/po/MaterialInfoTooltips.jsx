import React, { useState } from 'react'; // Explicit React import added
import {
  Tooltip,
  IconButton,
  CircularProgress,
  Typography,
  Stack,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import api from '../../services/api'; // Adjust path as needed

/**
 * Tooltip for displaying Raw Material (RM) balance summary.
 */
export const RawMaterialInfo = ({ raw_material_id }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleFetch = async () => {
    if (summary || loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/material-balance/summary/${raw_material_id}`);
      setSummary(res.data);
    } catch (err) {
      setSummary({ total_ordered: '-', total_received: '-', total_balance: '-' });
    } finally {
      setLoading(false);
    }
  };

  const tooltipTitle = loading ? (
    <CircularProgress size={16} color="inherit" />
  ) : summary ? (
    <Stack>
      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Material Balance Summary</Typography>
      <Typography variant="caption">Ordered: {summary.total_ordered}</Typography>
      <Typography variant="caption">Received: {summary.total_received}</Typography>
      <Typography variant="caption">Balance: {summary.total_balance}</Typography>
    </Stack>
  ) : 'Show RM summary';

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      open={open}
      onOpen={() => { setOpen(true); handleFetch(); }}
      onClose={() => setOpen(false)}
    >
      <IconButton size="small" sx={{ p: 0.2 }}>
        <InfoOutlinedIcon fontSize="small" color="action" />
      </IconButton>
    </Tooltip>
  );
};

/**
 * Tooltip for displaying Packing Material (PM) balance summary.
 */
export const PackingMaterialInfo = ({ packing_material_id }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleFetch = async () => {
    if (summary || loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/material-balance/pmsummary/${packing_material_id}`);
      setSummary(res.data);
    } catch (err) {
      setSummary({ total_ordered: '-', total_received: '-', total_balance: '-' });
    } finally {
      setLoading(false);
    }
  };
  
  const tooltipTitle = loading ? (
    <CircularProgress size={16} color="inherit" />
  ) : summary ? (
    <Stack>
      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Material Balance Summary</Typography>
      <Typography variant="caption">Ordered: {summary.total_ordered}</Typography>
      <Typography variant="caption">Received: {summary.total_received}</Typography>
      <Typography variant="caption">Balance: {summary.total_balance}</Typography>
    </Stack>
  ) : 'Show PM summary';

  return (
    <Tooltip
      title={tooltipTitle}
      arrow
      open={open}
      onOpen={() => { setOpen(true); handleFetch(); }}
      onClose={() => setOpen(false)}
    >
      <IconButton size="small" sx={{ p: 0.2 }}>
        <InfoOutlinedIcon fontSize="small" color="action" />
      </IconButton>
    </Tooltip>
  );
};