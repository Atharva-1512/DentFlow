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
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ReceiptLong as BillIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as RevenueIcon,
  PendingActions as PendingIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useBills, useUpdateBill } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { toastRef } from '../context/ToastContext';
import type { Bill } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`billing-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { user, impersonatedClinic } = useAuth();

  // Navigation tab state (0: Financial Summary & Daily Log, 1: Invoices Registry)
  const [activeTab, setActiveTab] = useState(0);

  // Period Filter State (CURRENT_MONTH, LAST_MONTH, ALL_TIME)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('CURRENT_MONTH');

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

  // Fetch bills using React Query hook (page_size 1000 for complete accounting analysis)
  const { data: billsData, isLoading, refetch } = useBills(searchTerm, page);
  const updateBillMutation = useUpdateBill();

  const activeClinicName = impersonatedClinic?.name || user?.clinic?.name || 'DentFlow Clinic';

  const allBills: Bill[] = billsData?.results || [];

  // Filter bills based on selected period
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const filteredBills = allBills.filter((bill) => {
    if (selectedPeriod === 'ALL_TIME') return true;
    const bDate = new Date(bill.bill_date);
    if (isNaN(bDate.getTime())) return true;
    if (selectedPeriod === 'CURRENT_MONTH') {
      return bDate.getFullYear() === currentYear && bDate.getMonth() === currentMonth;
    }
    if (selectedPeriod === 'LAST_MONTH') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      return bDate.getFullYear() === lastMonthDate.getFullYear() && bDate.getMonth() === lastMonthDate.getMonth();
    }
    return true;
  });

  // Calculate summary metrics for selected period
  const totalBilledPeriod = filteredBills.reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
  const totalReceivedPeriod = filteredBills.reduce((sum, b) => sum + Number(b.amount_paid || 0), 0);
  const totalPendingPeriod = totalBilledPeriod - totalReceivedPeriod;

  // Build Daily Revenue & Earned Collections Log ("what amount has been earned on which day")
  const dailySummaryMap: {
    [date: string]: {
      date: string;
      billsCount: number;
      billedAmount: number;
      amountEarned: number;
      pendingBalance: number;
    };
  } = {};

  filteredBills.forEach((bill) => {
    const bDateStr = bill.bill_date ? bill.bill_date.substring(0, 10) : 'Unknown';

    if (!dailySummaryMap[bDateStr]) {
      dailySummaryMap[bDateStr] = {
        date: bDateStr,
        billsCount: 0,
        billedAmount: 0,
        amountEarned: 0,
        pendingBalance: 0,
      };
    }
    dailySummaryMap[bDateStr].billsCount += 1;
    dailySummaryMap[bDateStr].billedAmount += Number(bill.grand_total || 0);

    // Sum payments recorded under this bill by their exact payment date
    if (bill.payments && bill.payments.length > 0) {
      bill.payments.forEach((p) => {
        const pDateStr = p.payment_date ? p.payment_date.substring(0, 10) : bDateStr;
        if (!dailySummaryMap[pDateStr]) {
          dailySummaryMap[pDateStr] = {
            date: pDateStr,
            billsCount: 0,
            billedAmount: 0,
            amountEarned: 0,
            pendingBalance: 0,
          };
        }
        dailySummaryMap[pDateStr].amountEarned += Number(p.amount_paid || 0);
      });
    } else {
      dailySummaryMap[bDateStr].amountEarned += Number(bill.amount_paid || 0);
    }
  });

  // Convert map to array sorted chronologically descending (latest first)
  const dailySummaryList = Object.values(dailySummaryMap)
    .map((d) => ({
      ...d,
      pendingBalance: Math.max(0, d.billedAmount - d.amountEarned),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

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

    const treatments = selectedBill.treatments || [];
    const totalCost = treatments.reduce((sum, item) => sum + Number(item.cost) * item.quantity, 0);
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
      payments: newPayments.map((p) => ({
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
    const totalCost = treatments.reduce((sum, item) => sum + Number(item.cost) * item.quantity, 0);
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
      payments: currentPayments.map((p) => ({
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

    // Header Styling (Teal Theme)
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 210, 4, 'F');

    const address = data.clinic_address || 'Clinic Address';
    const contact = data.clinic_contact || 'Clinic Contact';

    // Clinic Info
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

    // Invoice details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 110);
    doc.text(`INVOICE: ${data.bill_number || 'DRAFT'}`, 14, 45);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${data.bill_date ? new Date(data.bill_date).toLocaleDateString() : 'N/A'}`, 14, 51);
    doc.text(`Doctor: ${data.doctor_name || 'N/A'}`, 14, 56);

    // Patient Details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('PATIENT DETAILS', 120, 45);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Name: ${data.patient_name || 'N/A'}`, 120, 51);
    doc.text(`Mobile: ${data.patient_mobile || 'N/A'}`, 120, 56);
    if (data.patient_id) {
      doc.text(`Patient ID: ${data.patient_id}`, 120, 61);
    }

    // Treatments Table
    const billTreatments = data.treatments || [];
    const tableHeaders = [['#', 'Treatment / Procedure Name', 'Date', 'Qty', 'Cost (₹)', 'Total (₹)']];
    const tableBody = billTreatments.map((t, idx) => [
      idx + 1,
      t.treatment_name,
      t.treatment_date ? new Date(t.treatment_date).toLocaleDateString() : '—',
      t.quantity,
      `₹${Number(t.cost).toLocaleString('en-IN')}`,
      `₹${(Number(t.cost) * t.quantity).toLocaleString('en-IN')}`,
    ]);

    autoTable(doc, {
      startY: 68,
      head: tableHeaders,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    // Calculate totals
    const billTotalCost = billTreatments.reduce((sum, item) => sum + Number(item.cost) * item.quantity, 0);
    const billGrandTotal = billTotalCost;
    const billPayments = data.payments || [];
    const billTotalPaid = billPayments.reduce((sum, item) => sum + Number(item.amount_paid), 0);
    const billOutstandingBalance = billGrandTotal - billTotalPaid;

    // Payment Summary & Payment Status
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

    // Payment History (Installments)
    if (billPayments.length > 0) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text('PAYMENT HISTORY (INSTALLMENTS)', 14, currentY);

      const paymentHeaders = [['Date Paid', 'Amount Paid', 'Payment Mode']];
      const paymentBody = billPayments.map((p) => [
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
    }

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
      {/* Page Header */}
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
              Accounts & Billing Summary
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time daily earnings log, monthly revenue summaries, pending balances, and invoice records.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Period Filter</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period Filter"
              onChange={(e) => setSelectedPeriod(e.target.value)}
              sx={{ fontWeight: 600 }}
            >
              <MenuItem value="CURRENT_MONTH">This Month ({now.toLocaleString('default', { month: 'short' })})</MenuItem>
              <MenuItem value="LAST_MONTH">Last Month</MenuItem>
              <MenuItem value="ALL_TIME">All Time</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quick-bill')}
            sx={{ textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            + New Quick Bill
          </Button>
        </Box>
      </Box>

      {/* Financial Overview Cards (Based on Generated Bills & Payments) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Bills Generated
                </Typography>
                <BillIcon color="primary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                ₹{totalBilledPeriod.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {filteredBills.length} total invoice(s) generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'success.main', bgcolor: 'rgba(76, 175, 80, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Amount Received / Earned
                </Typography>
                <RevenueIcon color="success" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                ₹{totalReceivedPeriod.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Total collections collected in period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: totalPendingPeriod > 0 ? 'error.main' : 'grey.300', bgcolor: totalPendingPeriod > 0 ? 'rgba(211, 47, 47, 0.04)' : 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Pending Balance
                </Typography>
                <PendingIcon color={totalPendingPeriod > 0 ? 'error' : 'action'} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: totalPendingPeriod > 0 ? 'error.main' : 'text.primary' }}>
                ₹{totalPendingPeriod.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Outstanding balance due for period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'rgba(156, 39, 176, 0.04)', borderColor: 'secondary.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Collection Rate
                </Typography>
                <WalletIcon color="secondary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                {totalBilledPeriod > 0 ? `${Math.round((totalReceivedPeriod / totalBilledPeriod) * 100)}%` : '100%'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Payment collection efficiency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<CalendarIcon />} iconPosition="start" label={`Daily Earnings Summary (${dailySummaryList.length} days)`} />
          <Tab icon={<BillIcon />} iconPosition="start" label={`Invoices & Payments (${filteredBills.length})`} />
        </Tabs>
      </Box>

      {/* TAB 0: DAILY EARNINGS & COLLECTIONS LOG */}
      <CustomTabPanel value={activeTab} index={0}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Daily Revenue & Earned Amount Breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Summarizes total amount earned on each specific day alongside daily generated bills and pending balances.
          </Typography>
        </Box>

        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 2 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={50} />
            </Box>
          ) : dailySummaryList.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No revenue or billing activity found for the selected period.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Invoices Issued</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Daily Billed Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }} align="right">Amount Earned / Received</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Daily Pending Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailySummaryList.map((row) => (
                    <TableRow key={row.date} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${row.billsCount} Bill(s)`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ₹{row.billedAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        ₹{row.amountEarned.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: row.pendingBalance > 0 ? 'error.main' : 'text.secondary' }}>
                        ₹{row.pendingBalance.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>

      {/* TAB 1: INVOICES & PAYMENTS REGISTRY */}
      <CustomTabPanel value={activeTab} index={1}>
        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', borderRadius: 3, boxShadow: 1 }}>
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
          ) : !filteredBills || filteredBills.length === 0 ? (
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
                  {filteredBills.map((bill: Bill) => {
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
                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 600 }}>
                          ₹{Number(bill.amount_paid).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: outstanding > 0 ? 'error.main' : 'text.secondary' }}>
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
      </CustomTabPanel>

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
                <Typography variant="caption" color="text.secondary">DOCTOR</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBill.doctor_name || '—'}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography variant="caption" color="text.secondary">BILL DATE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(selectedBill.bill_date).toLocaleDateString()}</Typography>
              </Grid>
            </Grid>

            {/* Billed Treatments */}
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
              Treatments Billed
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Treatment</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedBill.treatments?.map((t, idx) => (
                    <TableRow key={t.id || idx}>
                      <TableCell sx={{ fontWeight: 500 }}>{t.treatment_name}</TableCell>
                      <TableCell>{t.treatment_date ? new Date(t.treatment_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell align="center">{t.quantity}</TableCell>
                      <TableCell align="right">₹{Number(t.cost).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Installments History */}
            <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase' }}>
              Payment Records (Installments)
            </Typography>
            {selectedBill.payments && selectedBill.payments.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Date Paid</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Payment Mode</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Amount Paid</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBill.payments.map((p, idx) => (
                      <TableRow key={p.id || idx}>
                        <TableCell>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>
                          <Chip label={p.payment_mode} size="small" variant="outlined" color="success" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                          ₹{Number(p.amount_paid).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleDeleteInstallment(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic' }}>
                No payment installments recorded yet.
              </Typography>
            )}

            {/* Add Installment Section */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(25, 118, 210, 0.02)', borderColor: 'primary.main' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Record New Payment Installment
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Payment Date"
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Amount (₹)"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Payment Mode"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                  >
                    <MenuItem value="UPI">UPI / GPay / PhonePe</MenuItem>
                    <MenuItem value="CASH">Cash</MenuItem>
                    <MenuItem value="CARD">Credit / Debit Card</MenuItem>
                    <MenuItem value="NET_BANKING">Net Banking</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={handleAddInstallment}
                    disabled={updateBillMutation.isPending}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {updateBillMutation.isPending ? 'Saving...' : 'Add Payment'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DownloadIcon />}
              onClick={() => generatePDF(selectedBill)}
            >
              Download PDF Invoice
            </Button>
            <Button variant="contained" onClick={() => setOpenDetailsDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Billing;
