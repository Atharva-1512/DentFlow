import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useBills, useUpdateBill } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { toastRef } from '../context/ToastContext';
import type { Bill, BillTreatment, BillPayment } from '../types';

export const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user, impersonatedClinic } = useAuth();
  
  // Search and Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  
  // View Details Modal States
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  
  // New Installment Form States
  const [payDate, setPayDate] = useState(new Date().toISOString().substring(0, 10));
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'OTHER'>('UPI');

  const { data: billsData, isLoading, refetch } = useBills(searchTerm, page);
  const updateBillMutation = useUpdateBill();

  const activeClinicName = impersonatedClinic?.name || user?.clinic?.name || 'DentFlow Clinic';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleOpenDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setOpenDetailsDialog(true);
    setPayAmount('');
    setPayDate(new Date().toISOString().substring(0, 10));
    setPayMode('UPI');
  };

  const handleAddInstallment = () => {
    if (!selectedBill) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toastRef.show('Please enter a valid amount.', 'error');
      return;
    }

    const currentPayments = selectedBill.payments || [];
    const newPayments = [
      ...currentPayments,
      { payment_date: payDate, amount_paid: amount, payment_mode: payMode },
    ];

    // Recalculate totals
    const treatments = selectedBill.treatments || [];
    const totalCost = treatments.reduce((sum, item) => sum + (Number(item.cost) * item.quantity), 0);
    const grandTotal = totalCost;
    const totalPaid = newPayments.reduce((sum, item) => sum + Number(item.amount_paid), 0);
    const outstanding = grandTotal - totalPaid;

    let computedStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
    if (totalPaid > 0) {
      computedStatus = outstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    }

    const payload: Partial<Bill> = {
      amount_paid: totalPaid,
      status: computedStatus,
      payments: newPayments.map(p => ({
        payment_date: p.payment_date,
        amount_paid: Number(p.amount_paid),
        payment_mode: p.payment_mode,
      })),
    };

    updateBillMutation.mutate(
      { id: selectedBill.id!, data: payload },
      {
        onSuccess: (updatedBill) => {
          toastRef.show('Payment installment recorded successfully.', 'success');
          setSelectedBill(updatedBill);
          setPayAmount('');
          refetch();
        },
        onError: () => {
          toastRef.show('Failed to record payment.', 'error');
        },
      }
    );
  };

  const handleDeleteInstallment = (index: number) => {
    if (!selectedBill) return;
    
    const currentPayments = [...(selectedBill.payments || [])];
    currentPayments.splice(index, 1);

    const treatments = selectedBill.treatments || [];
    const totalCost = treatments.reduce((sum, item) => sum + (Number(item.cost) * item.quantity), 0);
    const grandTotal = totalCost;
    const totalPaid = currentPayments.reduce((sum, item) => sum + Number(item.amount_paid), 0);
    const outstanding = grandTotal - totalPaid;

    let computedStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
    if (totalPaid > 0) {
      computedStatus = outstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    }

    const payload: Partial<Bill> = {
      amount_paid: totalPaid,
      status: computedStatus,
      payments: currentPayments.map(p => ({
        payment_date: p.payment_date,
        amount_paid: Number(p.amount_paid),
        payment_mode: p.payment_mode,
      })),
    };

    updateBillMutation.mutate(
      { id: selectedBill.id!, data: payload },
      {
        onSuccess: (updatedBill) => {
          toastRef.show('Installment removed successfully.', 'success');
          setSelectedBill(updatedBill);
          refetch();
        },
        onError: () => {
          toastRef.show('Failed to delete installment.', 'error');
        },
      }
    );
  };

  const generatePDF = (data: Partial<Bill>) => {
    const doc = new jsPDF();

    // 1. Header Styling (Teal Theme)
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 4, 'F');

    const address = data.clinic_address || 'Clinic Address';
    const contact = data.clinic_contact || 'Clinic Contact';

    // 2. Clinic Info
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 118, 110);
    doc.text(activeClinicName, 14, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(address, 14, 26);
    doc.text(`Contact: ${contact}`, 14, 31);

    // Divider Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 196, 35);

    // 4. Invoice details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 110);
    doc.text('INVOICE / BILL', 14, 43);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Bill Number: ${data.bill_number || 'Draft'}`, 14, 49);
    doc.text(`Bill Date: ${data.bill_date ? new Date(data.bill_date).toLocaleDateString() : '—'}`, 14, 54);

    // 5. Patient & Doctor Details Grid
    const pGender = data.patient_gender || 'M';
    const patientGenderText = pGender === 'M' ? 'Male' : pGender === 'F' ? 'Female' : 'Other';

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('PATIENT DETAILS', 14, 65);
    doc.text('DOCTOR DETAILS', 120, 65);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${data.patient_name || '—'}`, 14, 70);
    doc.text(`Age / Gender: ${data.patient_age || '—'} Yrs (${patientGenderText})`, 14, 75);
    doc.text(`Contact: ${data.patient_mobile || '—'}`, 14, 80);

    doc.text(`Doctor Name: ${data.doctor_name || '—'}`, 120, 70);
    doc.text(`Consultation Date: ${data.bill_date ? new Date(data.bill_date).toLocaleDateString() : '—'}`, 120, 75);

    // 6. Treatment Details Table
    const billTreatments = data.treatments || [];
    const tableHeaders = [['Treatment', 'Date', 'Qty', 'Cost (INR)', 'Total (INR)']] as any;
    const tableBody = billTreatments.map(t => [
      t.treatment_name || '—',
      t.treatment_date ? new Date(t.treatment_date).toLocaleDateString() : '—',
      t.quantity,
      `₹${Number(t.cost).toLocaleString('en-IN')}`,
      `₹${(Number(t.cost) * t.quantity).toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: 90,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    // Calculate totals
    const billTotalCost = billTreatments.reduce((sum, item) => sum + (Number(item.cost) * item.quantity), 0);
    const billGrandTotal = billTotalCost;
    const billPayments = data.payments || [];
    const billTotalPaid = billPayments.reduce((sum, item) => sum + Number(item.amount_paid), 0);
    const billOutstandingBalance = billGrandTotal - billTotalPaid;

    // 7. Payment Summary & Payment Status
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('PAYMENT SUMMARY', 120, currentY);
    doc.text('STATUS', 14, currentY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Treatment Cost: ₹${billTotalCost.toLocaleString('en-IN')}`, 120, currentY + 6);
    doc.text(`Grand Total: ₹${billGrandTotal.toLocaleString('en-IN')}`, 120, currentY + 11);
    doc.text(`Amount Paid: ₹${billTotalPaid.toLocaleString('en-IN')}`, 120, currentY + 16);
    
    doc.setFont('Helvetica', 'bold');
    if (billOutstandingBalance > 0) {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(21, 128, 61);
    }
    doc.text(`Remaining Balance: ₹${billOutstandingBalance.toLocaleString('en-IN')}`, 120, currentY + 21);

    // Status Badge
    doc.setTextColor(30, 41, 59);
    const bStatus = data.status || 'UNPAID';
    const statusText = bStatus === 'PAID' ? 'Fully Paid' : bStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid';
    doc.text(statusText.toUpperCase(), 14, currentY + 6);

    currentY += 30;

    // 8. Payment History (Installments)
    if (billPayments.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('PAYMENT HISTORY (INSTALLMENTS)', 14, currentY);

      const paymentHeaders = [['Date Paid', 'Amount Paid', 'Payment Mode']];
      const paymentBody = billPayments.map(p => [
        p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—',
        `₹${Number(p.amount_paid).toLocaleString('en-IN')}`,
        p.payment_mode,
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: paymentHeaders,
        body: paymentBody,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
      currentY += 10;
    }

    // 9. Doctor Signature Line
    if (currentY > 250) {
      doc.addPage();
      currentY = 30;
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(140, currentY + 12, 190, currentY + 12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(data.doctor_name || '—', 140, currentY + 17);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Consulting Dentist Signature', 140, currentY + 22);

    doc.save(`DentFlow_Invoice_${data.bill_number || 'draft'}.pdf`);
    toastRef.show('Invoice PDF downloaded successfully.', 'success');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PARTIALLY_PAID':
        return 'warning';
      default:
        return 'error';
    }
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
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
              Billing & Invoices
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search and manage invoice histories, record payments, and download bills.
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/quick-bill')}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          New Quick Bill
        </Button>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center', borderRadius: 3, boxShadow: 1 }}>
        <SearchIcon sx={{ color: 'text.secondary', mr: 2 }} />
        <TextField
          fullWidth
          variant="standard"
          placeholder="Search by Patient Name, Phone Number, or Invoice Number..."
          value={searchTerm}
          onChange={handleSearchChange}
          slotProps={{ input: { disableUnderline: true } }}
        />
      </Paper>

      {/* Invoices List Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={50} />
          </Box>
        ) : !billsData?.results || billsData.results.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No bills or invoices matching search criteria.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Patient Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Bill Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Total Cost</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Paid</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Outstanding</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {billsData.results.map((bill: Bill) => {
                  const outstanding = Number(bill.grand_total) - Number(bill.amount_paid);
                  return (
                    <TableRow key={bill.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {bill.bill_number}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{bill.patient_name || '—'}</TableCell>
                      <TableCell>{bill.patient_mobile || '—'}</TableCell>
                      <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                      <TableCell align="right">₹{Number(bill.grand_total).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">₹{Number(bill.amount_paid).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: outstanding > 0 ? 'error.main' : 'success.main' }}>
                        ₹{outstanding.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={bill.status}
                          size="small"
                          color={getStatusColor(bill.status)}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <IconButton color="primary" onClick={() => handleOpenDetails(bill)} size="small">
                            <ViewIcon />
                          </IconButton>
                          <IconButton color="secondary" onClick={() => generatePDF(bill)} size="small">
                            <DownloadIcon />
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

      {/* Invoice Details & Installments dialog */}
      {selectedBill && (
        <Dialog
          open={openDetailsDialog}
          onClose={() => setOpenDetailsDialog(false)}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Invoice: {selectedBill.bill_number}</span>
            <Chip
              label={selectedBill.status}
              color={getStatusColor(selectedBill.status)}
              sx={{ fontWeight: 700 }}
            />
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            {/* Patient Info Summary */}
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
              Patient Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4, bgcolor: '#F8FAFC', p: 2, borderRadius: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">NAME</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBill.patient_name || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">MOBILE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBill.patient_mobile || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">AGE / GENDER</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedBill.patient_age || '—'} Yrs / {selectedBill.patient_gender === 'M' ? 'Male' : selectedBill.patient_gender === 'F' ? 'Female' : 'Other'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">DOCTOR</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBill.doctor_name || '—'}</Typography>
              </Grid>
            </Grid>

            {/* Treatment breakdown */}
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
              Treatment Details
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Treatment</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Cost</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedBill.treatments || []).map((t: BillTreatment, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 500 }}>{t.treatment_name}</TableCell>
                      <TableCell>{new Date(t.treatment_date).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{t.quantity}</TableCell>
                      <TableCell align="right">₹{Number(t.cost).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">₹{(Number(t.cost) * t.quantity).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Installments history */}
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
              Payment History (Installments)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Date Paid</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Amount Paid</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Payment Mode</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(selectedBill.payments || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 2 }}>
                        No payments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (selectedBill.payments || []).map((p: BillPayment, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell align="right">₹{Number(p.amount_paid).toLocaleString('en-IN')}</TableCell>
                        <TableCell>{p.payment_mode}</TableCell>
                        <TableCell align="center">
                          <IconButton color="error" size="small" onClick={() => handleDeleteInstallment(idx)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Record payment block */}
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
              Record New Installment
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#FAFAFA' }}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Payment Date"
                    type="date"
                    size="small"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Amount (₹)"
                    type="number"
                    size="small"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Mode"
                    size="small"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                  >
                    <MenuItem value="UPI">UPI</MenuItem>
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="CARD">Card</MenuItem>
                    <MenuItem value="NET_BANKING">Net Banking</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleAddInstallment}
                    disabled={updateBillMutation.isPending}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Record
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              startIcon={<DownloadIcon />}
              variant="outlined"
              onClick={() => generatePDF(selectedBill)}
              sx={{ textTransform: 'none', fontWeight: 600, mr: 'auto' }}
            >
              Download PDF
            </Button>
            <Button onClick={() => setOpenDetailsDialog(false)} sx={{ fontWeight: 600, textTransform: 'none' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Billing;
