import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Autocomplete,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  Science as ScienceIcon,
  TrendingUp as ExpenseIcon,
  PendingActions as PendingIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { toastRef } from '../context/ToastContext';
import type { LabWorkOrder, Patient } from '../types';

export const LabWork: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dialog States
  const [openOrderDialog, setOpenOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<LabWorkOrder | null>(null);

  // Form States
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [labName, setLabName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().substring(0, 10));
  const [deliveryDate, setDeliveryDate] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED'>('PENDING');
  const [notes, setNotes] = useState('');

  // Payment Installment Modal States
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [payOrder, setPayOrder] = useState<LabWorkOrder | null>(null);
  const [additionalPayAmount, setAdditionalPayAmount] = useState('');

  // Fetch Patients List for Autocomplete
  const { data: patientsData } = useQuery({
    queryKey: ['patients_autocomplete'],
    queryFn: async () => {
      const res = await api.get('/patients/');
      return res.data?.results || [];
    },
  });

  // Fetch Lab Work Orders List
  const { data: labOrders, isLoading } = useQuery<LabWorkOrder[]>({
    queryKey: ['lab_works'],
    queryFn: async () => {
      const res = await api.get('/visits/lab-work/');
      return res.data || [];
    },
  });

  // Create Lab Work Order Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: Partial<LabWorkOrder>) => {
      const res = await api.post('/visits/lab-work/', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_works'] });
      toastRef.show('Lab work order created successfully.', 'success');
      handleCloseDialog();
    },
    onError: () => {
      toastRef.show('Failed to create lab work order.', 'error');
    },
  });

  // Update Lab Work Order Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LabWorkOrder> }) => {
      const res = await api.put(`/visits/lab-work/${id}/`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_works'] });
      toastRef.show('Lab work order updated successfully.', 'success');
      handleCloseDialog();
      setOpenPayDialog(false);
    },
    onError: () => {
      toastRef.show('Failed to update lab work order.', 'error');
    },
  });

  // Delete Lab Work Order Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/visits/lab-work/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab_works'] });
      toastRef.show('Lab work order deleted successfully.', 'info');
    },
    onError: () => {
      toastRef.show('Failed to delete lab work order.', 'error');
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingOrder(null);
    setSelectedPatient(null);
    setPatientName('');
    setPatientMobile('');
    setLabName('');
    setWorkDescription('');
    setOrderDate(new Date().toISOString().substring(0, 10));
    setDeliveryDate('');
    setTotalCost('');
    setAmountPaid('');
    setStatus('PENDING');
    setNotes('');
    setOpenOrderDialog(true);
  };

  const handleOpenEditDialog = (order: LabWorkOrder) => {
    setEditingOrder(order);
    setSelectedPatient(null);
    setPatientName(order.patient_name || '');
    setPatientMobile(order.patient_mobile || '');
    setLabName(order.lab_name || '');
    setWorkDescription(order.work_description || '');
    setOrderDate(order.order_date || new Date().toISOString().substring(0, 10));
    setDeliveryDate(order.delivery_date || '');
    setTotalCost(order.total_cost.toString());
    setAmountPaid(order.amount_paid.toString());
    setStatus(order.status || 'PENDING');
    setNotes(order.notes || '');
    setOpenOrderDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenOrderDialog(false);
    setEditingOrder(null);
  };

  const handleSaveOrder = () => {
    const finalPatientName = selectedPatient ? selectedPatient.full_name : patientName;
    if (!finalPatientName.trim()) {
      toastRef.show('Please select or enter a patient name.', 'error');
      return;
    }
    if (!workDescription.trim()) {
      toastRef.show('Please describe the required lab work.', 'error');
      return;
    }

    const costNum = parseFloat(totalCost) || 0;
    const paidNum = parseFloat(amountPaid) || 0;

    const payload: Partial<LabWorkOrder> = {
      patient_id: selectedPatient?.id || editingOrder?.patient_id,
      patient_name: finalPatientName,
      patient_mobile: selectedPatient ? selectedPatient.mobile_number : patientMobile,
      lab_name: labName,
      work_description: workDescription,
      order_date: orderDate,
      delivery_date: deliveryDate,
      total_cost: costNum,
      amount_paid: paidNum,
      status: status,
      notes: notes,
    };

    if (editingOrder && editingOrder.id) {
      updateMutation.mutate({ id: editingOrder.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleOpenPayModal = (order: LabWorkOrder) => {
    setPayOrder(order);
    setAdditionalPayAmount('');
    setOpenPayDialog(true);
  };

  const handleSavePayment = () => {
    if (!payOrder || !payOrder.id) return;
    const addAmt = parseFloat(additionalPayAmount);
    if (isNaN(addAmt) || addAmt <= 0) {
      toastRef.show('Please enter a valid payment amount.', 'error');
      return;
    }

    const newTotalPaid = payOrder.amount_paid + addAmt;
    const newPending = Math.max(0, payOrder.total_cost - newTotalPaid);
    let newStatus = payOrder.status;
    if (newTotalPaid >= payOrder.total_cost && payOrder.total_cost > 0) {
      newStatus = 'COMPLETED';
    } else if (newTotalPaid > 0 && newStatus === 'PENDING') {
      newStatus = 'IN_PROGRESS';
    }

    updateMutation.mutate({
      id: payOrder.id,
      data: {
        amount_paid: newTotalPaid,
        pending_amount: newPending,
        status: newStatus,
      },
    });
  };

  // Filter lab orders
  const filteredOrders = (labOrders || []).filter((order) => {
    const matchesSearch =
      order.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.lab_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.work_description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalExpensed = filteredOrders.reduce((sum, o) => sum + Number(o.total_cost || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + Number(o.amount_paid || 0), 0);
  const totalPending = filteredOrders.reduce((sum, o) => sum + Number(o.pending_amount || 0), 0);

  const getStatusChipColor = (st: string) => {
    switch (st) {
      case 'COMPLETED':
        return 'success';
      case 'RECEIVED':
        return 'info';
      case 'IN_PROGRESS':
        return 'warning';
      case 'CANCELLED':
        return 'default';
      default:
        return 'error';
    }
  };

  const calculatedPendingInForm = Math.max(
    0,
    (parseFloat(totalCost) || 0) - (parseFloat(amountPaid) || 0)
  );

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            startIcon={<BackIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Dashboard
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
              Lab Work Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track dental lab work orders, expensed vendor costs, payments made, and pending lab balances.
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
          sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
        >
          + Add New Lab Order
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Lab Orders
                </Typography>
                <ScienceIcon color="primary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {filteredOrders.length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Dental lab work items
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'secondary.main', bgcolor: 'rgba(156, 39, 176, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Expensed (Lab Cost)
                </Typography>
                <ExpenseIcon color="secondary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                ₹{totalExpensed.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Total lab expense commitment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'success.main', bgcolor: 'rgba(76, 175, 80, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Amount Paid to Labs
                </Typography>
                <DoneIcon color="success" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                ₹{totalPaid.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Total lab payments cleared
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: totalPending > 0 ? 'error.main' : 'grey.300', bgcolor: totalPending > 0 ? 'rgba(211, 47, 47, 0.04)' : 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Pending Lab Balance
                </Typography>
                <PendingIcon color={totalPending > 0 ? 'error' : 'action'} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: totalPending > 0 ? 'error.main' : 'text.primary' }}>
                ₹{totalPending.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Outstanding payable to labs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3, boxShadow: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <SearchIcon sx={{ color: 'text.secondary', mr: 1.5 }} />
          <TextField
            fullWidth
            variant="standard"
            placeholder="Search by Patient Name, Lab Name, or Work Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{ input: { disableUnderline: true } }}
          />
        </Box>

        <TextField
          select
          size="small"
          label="Status Filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All Statuses</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
          <MenuItem value="RECEIVED">Work Received</MenuItem>
          <MenuItem value="COMPLETED">Completed & Paid</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </Paper>

      {/* Lab Work Orders Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={50} />
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No lab work orders found. Click "+ Add New Lab Order" to record a lab item.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Order Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lab Work Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lab / Vendor Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Expensed Cost (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'success.main' }} align="right">Amount Paid (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Pending Amount (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => {
                  const pending = Math.max(0, order.total_cost - order.amount_paid);
                  return (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {order.patient_name}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{order.work_description}</TableCell>
                      <TableCell>{order.lab_name || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ₹{order.total_cost.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        ₹{order.amount_paid.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: pending > 0 ? 'error.main' : 'text.secondary' }}>
                        ₹{pending.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status.replace('_', ' ')}
                          size="small"
                          color={getStatusChipColor(order.status)}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton color="success" size="small" onClick={() => handleOpenPayModal(order)} title="Record Payment">
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                          <IconButton color="primary" size="small" onClick={() => handleOpenEditDialog(order)} title="Edit Order">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton color="error" size="small" onClick={() => order.id && deleteMutation.mutate(order.id)} title="Delete Order">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* CREATE / EDIT LAB WORK DIALOG */}
      <Dialog
        open={openOrderDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          {editingOrder ? 'Edit Lab Work Order' : 'Create New Lab Work Order'}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
            Patient & Lab Details
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                options={patientsData || []}
                getOptionLabel={(option: Patient) => `${option.full_name} (${option.mobile_number})`}
                value={selectedPatient}
                onChange={(_e, val) => {
                  setSelectedPatient(val);
                  if (val) {
                    setPatientName(val.full_name);
                    setPatientMobile(val.mobile_number);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Existing Patient"
                    placeholder="Search registered patients..."
                    size="small"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Patient Full Name *"
                value={selectedPatient ? selectedPatient.full_name : patientName}
                onChange={(e) => {
                  if (!selectedPatient) setPatientName(e.target.value);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Lab Vendor Name"
                placeholder="e.g. Apex Dental Craft Lab"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Lab Work Required *"
                placeholder="e.g. Zirconia Crown, Aligners Set 1-10, PFM Bridge..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Target Delivery Date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
            Financial Expense & Status
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Amount to be Expensed (Lab Cost ₹) *"
                type="number"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Amount Paid (₹)"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Pending Amount (Calculated ₹)"
                type="number"
                value={calculatedPendingInForm}
                disabled
                slotProps={{
                  input: {
                    style: { fontWeight: 700, color: calculatedPendingInForm > 0 ? '#d32f2f' : '#2e7d32' },
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Order Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <MenuItem value="PENDING">Pending (Order Sent)</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="RECEIVED">Work Received from Lab</MenuItem>
                <MenuItem value="COMPLETED">Completed & Fully Paid</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Special Instructions / Notes"
                placeholder="Shade A2, Margin details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveOrder} disabled={createMutation.isPending || updateMutation.isPending}>
            {editingOrder ? 'Save Order Changes' : 'Create Lab Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* RECORD LAB PAYMENT DIALOG */}
      {payOrder && (
        <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Record Payment to Lab Vendor
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Patient: <strong>{payOrder.patient_name}</strong> | Lab: <strong>{payOrder.lab_name}</strong>
            </Typography>
            <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 2, mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>TOTAL LAB COST</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>₹{payOrder.total_cost.toLocaleString('en-IN')}</Typography>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PREVIOUSLY PAID</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>₹{payOrder.amount_paid.toLocaleString('en-IN')}</Typography>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>CURRENT OUTSTANDING</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: 'error.main' }}>
                ₹{Math.max(0, payOrder.total_cost - payOrder.amount_paid).toLocaleString('en-IN')}
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              label="Additional Payment Amount (₹)"
              type="number"
              value={additionalPayAmount}
              onChange={(e) => setAdditionalPayAmount(e.target.value)}
              placeholder="Enter amount paid today"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenPayDialog(false)}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleSavePayment}>
              Save Payment
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default LabWork;
