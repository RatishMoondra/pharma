import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  TrendingUp,
  TrendingDown,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Assessment,
} from '@mui/icons-material';
import api from '../services/api';

const AnalyticsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics data
  const [invoiceMatching, setInvoiceMatching] = useState({ data: [], summary: {} });
  const [discrepancies, setDiscrepancies] = useState({ data: [], summary: {} });
  const [vendorPerformance, setVendorPerformance] = useState({ data: [], summary: {} });

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchingRes, discrepancyRes, performanceRes] = await Promise.all([
        api.get('/api/analytics/invoice-po-matching'),
        api.get('/api/analytics/quantity-discrepancies'),
        api.get('/api/analytics/vendor-performance'),
      ]);

      if (matchingRes.data.success) {
        setInvoiceMatching({
          data: matchingRes.data.data,
          summary: matchingRes.data.summary,
        });
      }

      if (discrepancyRes.data.success) {
        setDiscrepancies({
          data: discrepancyRes.data.data,
          summary: discrepancyRes.data.summary,
        });
      }

      if (performanceRes.data.success) {
        setVendorPerformance({
          data: performanceRes.data.data,
          summary: performanceRes.data.summary,
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Assessment sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold" color="primary">
            Analytics & Insights
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Monitor invoice matching, track discrepancies, and evaluate vendor performance
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Invoice-PO Matching (${invoiceMatching.data.length})`} />
          <Tab label={`Quantity Discrepancies (${discrepancies.data.length})`} />
          <Tab label={`Vendor Performance (${vendorPerformance.data.length})`} />
        </Tabs>
      </Box>

      {/* Tab 0: Invoice-PO Matching */}
      {tabValue === 0 && <InvoiceMatchingTab data={invoiceMatching} />}

      {/* Tab 1: Quantity Discrepancies */}
      {tabValue === 1 && <DiscrepanciesTab data={discrepancies} />}

      {/* Tab 2: Vendor Performance */}
      {tabValue === 2 && <VendorPerformanceTab data={vendorPerformance} />}
    </Container>
  );
};

// Invoice-PO Matching Tab Component
const InvoiceMatchingTab = ({ data }) => {
  const [expandedRow, setExpandedRow] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'matched':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'partial':
        return <Warning sx={{ color: 'warning.main' }} />;
      case 'mismatch':
        return <Error sx={{ color: 'error.main' }} />;
      default:
        return null;
    }
  };

  const getStatusChip = (status) => {
    const config = {
      matched: { label: 'Matched', color: 'success' },
      partial: { label: 'Partial Match', color: 'warning' },
      mismatch: { label: 'Mismatch', color: 'error' },
    };
    const { label, color } = config[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'success.50', borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {data.summary.matched || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Matched
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'warning.50', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {data.summary.partial || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Partial
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'error.50', borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {data.summary.mismatch || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mismatch
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {data.summary.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Invoices
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white' }}>Invoice #</TableCell>
              <TableCell sx={{ color: 'white' }}>PO #</TableCell>
              <TableCell sx={{ color: 'white' }}>Vendor</TableCell>
              <TableCell sx={{ color: 'white' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'center' }}>Match %</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'center' }}>Items</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'center' }}>Discrepancies</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No invoice data available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((row) => (
                <TableRow
                  key={row.invoice_id}
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>{row.invoice_number}</TableCell>
                  <TableCell>{row.po_number}</TableCell>
                  <TableCell>{row.vendor_name}</TableCell>
                  <TableCell>{getStatusChip(row.status)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {getStatusIcon(row.status)}
                      <Typography variant="body2" fontWeight="bold">
                        {row.match_percentage}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">{row.total_items}</TableCell>
                  <TableCell align="center">
                    {row.discrepancies > 0 ? (
                      <Chip label={row.discrepancies} color="error" size="small" />
                    ) : (
                      <Chip label="0" color="success" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Quantity Discrepancies Tab Component
const DiscrepanciesTab = ({ data }) => {
  const getSeverityChip = (severity) => {
    const config = {
      high: { color: 'error', icon: '🔴' },
      medium: { color: 'warning', icon: '🟡' },
      low: { color: 'info', icon: '🟢' },
    };
    const { color, icon } = config[severity] || { color: 'default', icon: '' };
    return (
      <Chip
        label={`${icon} ${severity.toUpperCase()}`}
        color={color}
        size="small"
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

  const getVarianceIcon = (variance) => {
    return variance > 0 ? (
      <TrendingUp sx={{ color: 'error.main' }} />
    ) : (
      <TrendingDown sx={{ color: 'success.main' }} />
    );
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'error.50', borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {data.summary.over_shipments || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Over-Shipments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.50', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {data.summary.under_shipments || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Under-Shipments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'error.100', borderLeft: 4, borderColor: 'error.dark' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="error.dark">
                {data.summary.high_severity || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Severity (&gt;10%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white' }}>PO #</TableCell>
              <TableCell sx={{ color: 'white' }}>Medicine</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'right' }}>Ordered</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'right' }}>Fulfilled</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'right' }}>Variance</TableCell>
              <TableCell sx={{ color: 'white', textAlign: 'center' }}>Variance %</TableCell>
              <TableCell sx={{ color: 'white' }}>Type</TableCell>
              <TableCell sx={{ color: 'white' }}>Severity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No discrepancies found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((row, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    bgcolor: row.severity === 'high' ? 'error.50' : 'inherit',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell>{row.po_number}</TableCell>
                  <TableCell>{row.medicine_name}</TableCell>
                  <TableCell align="right">
                    {parseFloat(row.ordered_quantity).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {parseFloat(row.fulfilled_quantity).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      {getVarianceIcon(row.variance)}
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={row.variance > 0 ? 'error.main' : 'success.main'}
                      >
                        {row.variance > 0 ? '+' : ''}
                        {parseFloat(row.variance).toFixed(2)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={Math.abs(row.variance_percentage) > 10 ? 'error.main' : 'warning.main'}
                    >
                      {row.variance_percentage > 0 ? '+' : ''}
                      {row.variance_percentage.toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.discrepancy_type === 'over_shipment' ? 'Over' : 'Under'}
                      color={row.discrepancy_type === 'over_shipment' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{getSeverityChip(row.severity)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Vendor Performance Tab Component
const VendorPerformanceTab = ({ data }) => {
  const getRatingIcon = (rating) => {
    switch (rating) {
      case 'Excellent':
        return '🟢';
      case 'Average':
        return '🟡';
      case 'Poor':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Excellent':
        return 'success.main';
      case 'Average':
        return 'warning.main';
      case 'Poor':
        return 'error.main';
      default:
        return 'grey.500';
    }
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.50', borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {data.summary.excellent || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🟢 Excellent Vendors (90-100%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'warning.50', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {data.summary.average || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🟡 Average Vendors (70-89%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'error.50', borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {data.summary.poor || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                🔴 Poor Vendors (&lt;70%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vendor Cards Grid */}
      <Grid container spacing={3}>
        {data.data.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No vendor performance data available
              </Typography>
            </Paper>
          </Grid>
        ) : (
          data.data.map((vendor) => (
            <Grid item xs={12} md={6} lg={4} key={vendor.vendor_id}>
              <Card
                sx={{
                  borderTop: 4,
                  borderColor: getRatingColor(vendor.rating),
                  '&:hover': { boxShadow: 6 },
                }}
              >
                <CardContent>
                  {/* Vendor Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {vendor.vendor_name}
                    </Typography>
                    <Typography variant="h4">{getRatingIcon(vendor.rating)}</Typography>
                  </Box>

                  {/* Overall Score */}
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight="bold" color={getRatingColor(vendor.rating)}>
                      {vendor.overall_score.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Overall Score
                    </Typography>
                  </Box>

                  {/* Metrics */}
                  <Box sx={{ mt: 2 }}>
                    {/* On-Time Delivery */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          On-Time Delivery
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {vendor.on_time_delivery_percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 8,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${vendor.on_time_delivery_percentage}%`,
                            bgcolor: vendor.on_time_delivery_percentage >= 90 ? 'success.main' : 'warning.main',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Quantity Accuracy */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Quantity Accuracy
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {vendor.quantity_accuracy_percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 8,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${vendor.quantity_accuracy_percentage}%`,
                            bgcolor: vendor.quantity_accuracy_percentage >= 90 ? 'success.main' : 'warning.main',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Response Time */}
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Avg Response Time
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {vendor.average_response_time.toFixed(1)} days
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 8,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${vendor.response_time_score}%`,
                            bgcolor: vendor.response_time_score >= 90 ? 'success.main' : 'warning.main',
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Stats */}
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-around',
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {vendor.total_pos}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total POs
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {vendor.total_invoices}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Invoices
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;
