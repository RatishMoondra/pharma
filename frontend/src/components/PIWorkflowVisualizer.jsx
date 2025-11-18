import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab'
import {
  Description,
  Assignment,
  ShoppingCart,
  Receipt,
  LocalShipping,
  CheckCircle,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { getEOPAsByPI, getPOsByEOPA, getInvoicesByPO } from '../services/api'

/**
 * DocumentNode - Reusable component for each document in the workflow
 */
const DocumentNode = ({ 
  icon, 
  title, 
  number, 
  date, 
  status, 
  vendor, 
  amount,
  onClick, 
  color = 'primary',
  children 
}) => {
  const [expanded, setExpanded] = useState(false)

  const getStatusColor = (status) => {
    if (!status) return 'default'
    const statusLower = status.toLowerCase()
    if (statusLower === 'approved' || statusLower === 'closed' || statusLower === 'completed') return 'success'
    if (statusLower === 'rejected' || statusLower === 'cancelled') return 'error'
    if (statusLower === 'partial') return 'warning'
    return 'info'
  }

  return (
    <Card elevation={3} sx={{ minWidth: 300, maxWidth: 500 }}>
      <CardActionArea onClick={onClick} disabled={!onClick}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            {React.cloneElement(icon, { color, fontSize: 'large' })}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {title}
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {number}
              </Typography>
            </Box>
            {status && (
              <Chip 
                label={status} 
                color={getStatusColor(status)} 
                size="small" 
              />
            )}
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={0.5}>
            {date && (
              <Typography variant="body2" color="text.secondary">
                <strong>Date:</strong> {new Date(date).toLocaleDateString('en-IN')}
              </Typography>
            )}
            {vendor && (
              <Typography variant="body2" color="text.secondary">
                <strong>Vendor:</strong> {vendor}
              </Typography>
            )}
            {amount && (
              <Typography variant="body2" color="text.secondary">
                <strong>Amount:</strong> ₹{parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Typography>
            )}
          </Stack>

          {children && (
            <Box sx={{ mt: 2 }}>
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {expanded ? 'Hide Details' : 'Show Details'}
                </Typography>
              </IconButton>
              <Collapse in={expanded}>
                <Box sx={{ mt: 1, pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
                  {children}
                </Box>
              </Collapse>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

/**
 * PIWorkflowVisualizer - Main component showing PI → EOPA → PO → Invoice flow
 */
const PIWorkflowVisualizer = ({ piId, piData }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [eopas, setEopas] = useState([])
  const [posGrouped, setPosGrouped] = useState({}) // { eopaId: [POs] }
  const [invoicesGrouped, setInvoicesGrouped] = useState({}) // { poId: [Invoices] }

  useEffect(() => {
    if (piId) {
      fetchWorkflowData()
    }
  }, [piId])

  const fetchWorkflowData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Fetch EOPAs for this PI
      const eopasResponse = await getEOPAsByPI(piId)
      const eopasData = eopasResponse.data.data || []
      setEopas(eopasData)

      // Step 2: For each EOPA, fetch POs
      const posData = {}
      for (const eopa of eopasData) {
        try {
          const posResponse = await getPOsByEOPA(eopa.id)
          posData[eopa.id] = posResponse.data.data || []
        } catch (err) {
          console.error(`Failed to fetch POs for EOPA ${eopa.id}:`, err)
          posData[eopa.id] = []
        }
      }
      setPosGrouped(posData)

      // Step 3: For each PO, fetch Invoices
      const invoicesData = {}
      for (const eopaId in posData) {
        const pos = posData[eopaId]
        for (const po of pos) {
          try {
            const invoicesResponse = await getInvoicesByPO(po.id)
            invoicesData[po.id] = invoicesResponse.data.data || []
          } catch (err) {
            console.error(`Failed to fetch invoices for PO ${po.id}:`, err)
            invoicesData[po.id] = []
          }
        }
      }
      setInvoicesGrouped(invoicesData)

    } catch (err) {
      console.error('Failed to fetch workflow data:', err)
      setError(err.response?.data?.message || 'Failed to load workflow data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading workflow data...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.50' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <TimelineIcon fontSize="large" color="primary" />
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              Workflow: {piData?.pi_number || `PI #${piId}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Document flow from Proforma Invoice through EOPA, Purchase Orders, and Vendor Invoices
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Timeline */}
      <Timeline position="right" sx={{ mt: 0 }}>
        {/* PI Node */}
        <TimelineItem>
          <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
            <Typography variant="overline" fontWeight="bold">
              Step 1
            </Typography>
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color="primary" sx={{ p: 1.5 }}>
              <Description />
            </TimelineDot>
            {eopas.length > 0 && <TimelineConnector sx={{ minHeight: 60 }} />}
          </TimelineSeparator>
          <TimelineContent>
            <DocumentNode
              icon={<Description />}
              title="Proforma Invoice (PI)"
              number={piData?.pi_number || `PI #${piId}`}
              date={piData?.pi_date}
              vendor={piData?.partner_vendor?.vendor_name}
              onClick={() => navigate(`/pi/${piId}`)}
              color="primary"
            />
          </TimelineContent>
        </TimelineItem>

        {/* EOPA Nodes */}
        {eopas.map((eopa, eopaIdx) => {
          const pos = posGrouped[eopa.id] || []
          const hasNextEopa = eopaIdx < eopas.length - 1
          const hasPOs = pos.length > 0

          return (
            <React.Fragment key={eopa.id}>
              <TimelineItem>
                <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                  <Typography variant="overline" fontWeight="bold">
                    Step 2.{eopaIdx + 1}
                  </Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="secondary" sx={{ p: 1.5 }}>
                    <Assignment />
                  </TimelineDot>
                  {(hasPOs || hasNextEopa) && <TimelineConnector sx={{ minHeight: 60 }} />}
                </TimelineSeparator>
                <TimelineContent>
                  <DocumentNode
                    icon={<Assignment />}
                    title="EOPA (Estimated Order & Price Approval)"
                    number={eopa.eopa_number}
                    date={eopa.eopa_date}
                    status={eopa.status}
                    onClick={() => navigate(`/eopa`)}
                    color="secondary"
                  >
                    {eopa.items && eopa.items.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {eopa.items.length} item(s) in this EOPA
                      </Typography>
                    )}
                  </DocumentNode>
                </TimelineContent>
              </TimelineItem>

              {/* PO Nodes for this EOPA */}
              {pos.map((po, poIdx) => {
                const invoices = invoicesGrouped[po.id] || []
                const hasNextPO = poIdx < pos.length - 1
                const hasInvoices = invoices.length > 0

                return (
                  <React.Fragment key={po.id}>
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                        <Typography variant="overline" fontWeight="bold">
                          Step 3.{eopaIdx + 1}.{poIdx + 1}
                        </Typography>
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="info" sx={{ p: 1.5 }}>
                          <ShoppingCart />
                        </TimelineDot>
                        {(hasInvoices || hasNextPO) && <TimelineConnector sx={{ minHeight: 60 }} />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <DocumentNode
                          icon={<ShoppingCart />}
                          title={`Purchase Order (${po.po_type})`}
                          number={po.po_number}
                          date={po.po_date}
                          status={po.status}
                          vendor={po.vendor?.vendor_name}
                          onClick={() => navigate(`/po`)}
                          color="info"
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Type:</strong> {po.po_type} (
                              {po.po_type === 'RM' ? 'Raw Material' : 
                               po.po_type === 'PM' ? 'Packaging Material' : 
                               'Finished Goods'})
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Delivery:</strong> {new Date(po.delivery_date).toLocaleDateString('en-IN')}
                            </Typography>
                          </Stack>
                        </DocumentNode>
                      </TimelineContent>
                    </TimelineItem>

                    {/* Invoice Nodes for this PO */}
                    {invoices.map((invoice, invIdx) => {
                      const hasNextInvoice = invIdx < invoices.length - 1

                      return (
                        <TimelineItem key={invoice.id}>
                          <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                            <Typography variant="overline" fontWeight="bold">
                              Step 4.{eopaIdx + 1}.{poIdx + 1}.{invIdx + 1}
                            </Typography>
                          </TimelineOppositeContent>
                          <TimelineSeparator>
                            <TimelineDot color="success" sx={{ p: 1.5 }}>
                              <Receipt />
                            </TimelineDot>
                            {hasNextInvoice && <TimelineConnector sx={{ minHeight: 60 }} />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <DocumentNode
                              icon={<Receipt />}
                              title="Vendor Invoice"
                              number={invoice.invoice_number}
                              date={invoice.received_at}
                              status={invoice.payment_status}
                              vendor={invoice.vendor?.vendor_name}
                              amount={invoice.total_amount}
                              onClick={() => navigate(`/invoices`)}
                              color="success"
                            >
                              <Stack spacing={0.5}>
                                <Typography variant="caption" color="text.secondary">
                                  <strong>Shipped Qty:</strong> {invoice.shipped_quantity}
                                </Typography>
                                {invoice.tax_amount && (
                                  <Typography variant="caption" color="text.secondary">
                                    <strong>Tax:</strong> ₹{parseFloat(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </Typography>
                                )}
                              </Stack>
                            </DocumentNode>
                          </TimelineContent>
                        </TimelineItem>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          )
        })}

        {/* Empty State */}
        {eopas.length === 0 && (
          <TimelineItem>
            <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
              <Typography variant="overline">Pending</Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color="default" />
            </TimelineSeparator>
            <TimelineContent>
              <Alert severity="info">
                No EOPA created yet for this PI. Create an EOPA to continue the workflow.
              </Alert>
            </TimelineContent>
          </TimelineItem>
        )}
      </Timeline>
    </Box>
  )
}

export default PIWorkflowVisualizer
