import React, { useState, useEffect } from 'react';
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
  Divider,
  Card,
  CardContent,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useCreateBill, usePatients, usePatientTimeline, usePatientBills } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { toastRef } from '../context/ToastContext';
import type { BillTreatment, BillPayment, Bill } from '../types';

export const QuickBill: React.FC = () => {
  const navigate = useNavigate();
  const { user, impersonatedClinic } = useAuth();
  
  // Patient details form states (Direct inputs)
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'M' | 'F' | 'O'>('M');
  const [patientMobile, setPatientMobile] = useState('');

  const createBillMutation = useCreateBill();

  // Helper to remove any existing "Dr. " prefix
  const cleanDoctorName = (name: string) => {
    return name.replace(/^(Dr\.\s*|Dr\s+)/i, '');
  };

  // Clinic metadata defaults
  const activeClinicName = impersonatedClinic?.name || user?.clinic?.name || 'DentFlow Clinic';
  const defaultAddress = impersonatedClinic?.address || user?.clinic?.address || 'Dental Plaza, Sector 15, City';
  const defaultContact = impersonatedClinic?.notification_whatsapp_number || user?.clinic?.notification_whatsapp_number || '+91 98765 43210';
  
  // Editable form states
  const [clinicAddress, setClinicAddress] = useState(defaultAddress);
  const [clinicContact, setClinicContact] = useState(defaultContact);
  const [billDate, setBillDate] = useState(new Date().toISOString().substring(0, 10));
  const [doctorName, setDoctorName] = useState(() => {
    const rawName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Consultant';
    return cleanDoctorName(rawName);
  });
  
  // Dynamic lists
  const [treatments, setTreatments] = useState<BillTreatment[]>([
    { treatment_name: 'Root Canal', treatment_date: new Date().toISOString().substring(0, 10), quantity: 1, cost: 5000 },
    { treatment_name: 'Crown', treatment_date: new Date().toISOString().substring(0, 10), quantity: 1, cost: 3000 },
  ]);
  const [payments, setPayments] = useState<BillPayment[]>([
    { payment_date: new Date().toISOString().substring(0, 10), amount_paid: 2000, payment_mode: 'UPI' },
  ]);

  // Saved bill reference
  const [savedBillNumber, setSavedBillNumber] = useState<string | null>(null);
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Dialog state for patient history lookup
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historyTab, setHistoryTab] = useState(0);

  // Query to find matched patient profile in DB
  const searchQuery = patientMobile.trim() || patientName.trim();
  const { data: matchedPatientsData } = usePatients(searchQuery, 0);

  // Match strictly by mobile or case-insensitive full name
  const matchedPatient = matchedPatientsData?.results?.find(p => 
    (patientMobile.trim() && p.mobile_number === patientMobile.trim()) ||
    (patientName.trim() && p.full_name.toLowerCase() === patientName.trim().toLowerCase())
  );

  // Fetch timeline (visits + appointments) and bills for matched patient
  const { data: timelineEvents, isLoading: loadingTimeline } = usePatientTimeline(matchedPatient?.id || '');
  const { data: patientBillsData, isLoading: loadingBills } = usePatientBills(matchedPatient?.id || '');

  // Auto-calculation logic
  const totalCost = treatments.reduce((sum, item) => sum + (Number(item.cost) * item.quantity), 0);
  const grandTotal = totalCost;
  const totalPaid = payments.reduce((sum, item) => sum + Number(item.amount_paid), 0);
  const outstandingBalance = grandTotal - totalPaid;

  let computedStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = 'UNPAID';
  if (totalPaid > 0) {
    computedStatus = outstandingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
  }

  // Pre-fill fields once user or clinic object is loaded
  useEffect(() => {
    if (user) {
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      setDoctorName(cleanDoctorName(name) || 'Consultant');
    }
  }, [user]);

  useEffect(() => {
    setClinicAddress(defaultAddress);
  }, [defaultAddress]);

  useEffect(() => {
    setClinicContact(defaultContact);
  }, [defaultContact]);



  const handleAddTreatment = () => {
    setTreatments([
      ...treatments,
      { treatment_name: '', treatment_date: new Date().toISOString().substring(0, 10), quantity: 1, cost: 0 },
    ]);
  };

  const handleRemoveTreatment = (index: number) => {
    const list = [...treatments];
    list.splice(index, 1);
    setTreatments(list);
  };

  const handleTreatmentChange = (index: number, field: keyof BillTreatment, value: any) => {
    const list = [...treatments];
    list[index] = { ...list[index], [field]: value };
    setTreatments(list);
  };

  const handleAddPayment = () => {
    setPayments([
      ...payments,
      { payment_date: new Date().toISOString().substring(0, 10), amount_paid: 0, payment_mode: 'UPI' },
    ]);
  };

  const handleRemovePayment = (index: number) => {
    const list = [...payments];
    list.splice(index, 1);
    setPayments(list);
  };

  const handlePaymentChange = (index: number, field: keyof BillPayment, value: any) => {
    const list = [...payments];
    list[index] = { ...list[index], [field]: value };
    setPayments(list);
  };

  const handleSaveBill = () => {
    if (!patientName.trim()) {
      toastRef.show('Please enter the patient name.', 'error');
      return;
    }
    if (treatments.length === 0) {
      toastRef.show('Please add at least one treatment item.', 'error');
      return;
    }

    // Format payload
    const payload = {
      patient_name: patientName,
      patient_age: patientAge,
      patient_gender: patientGender,
      patient_mobile: patientMobile,
      bill_date: billDate,
      doctor_name: `Dr. ${doctorName.trim()}`,
      total_cost: totalCost,
      grand_total: grandTotal,
      amount_paid: totalPaid,
      status: computedStatus,
      clinic_address: clinicAddress,
      clinic_contact: clinicContact,
      treatments: treatments.map(t => ({
        treatment_name: t.treatment_name,
        treatment_date: t.treatment_date,
        quantity: Number(t.quantity),
        cost: Number(t.cost),
      })),
      payments: payments.map(p => ({
        payment_date: p.payment_date,
        amount_paid: Number(p.amount_paid),
        payment_mode: p.payment_mode,
      })),
    };

    createBillMutation.mutate(payload, {
      onSuccess: (data) => {
        toastRef.show('Invoice generated and saved successfully.', 'success');
        setSavedBillNumber(data.bill_number || 'INV-SAVED');
        setSavedPatientId(data.patient_id || null);
        setIsSaved(true);
      },
      onError: (err: any) => {
        const msg = err.response?.data?.detail || 'Failed to save invoice.';
        toastRef.show(msg, 'error');
      },
    });
  };

  const generatePDF = (data: Partial<Bill>) => {
    const doc = new jsPDF();

    // 1. Header Styling (Primary Medical Teal Color Theme)
    doc.setFillColor(13, 148, 136); // Teal 600
    doc.rect(0, 0, 210, 4, 'F');

    const address = data.clinic_address || clinicAddress;
    const contact = data.clinic_contact || clinicContact;

    // 2. Clinic Info (Top Left)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 118, 110); // Teal 700 (#0F766E)
    doc.text(activeClinicName, 14, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(address, 14, 26);
    doc.text(`Contact: ${contact}`, 14, 31);

    // Divider Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(14, 35, 196, 35);

    // 4. Invoice details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 110);
    doc.text('INVOICE / BILL', 14, 43);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Bill Number: ${data.bill_number || 'Draft (Unsaved)'}`, 14, 49);
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
    doc.text(`Patient ID: ${data.patient_id || 'New Patient'}`, 14, 85);

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
      startY: 95,
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

    // 7. Payment Summary & Payment Status (Side-by-Side)
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

    // 8. Payment History (Installments Table)
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

    doc.setDrawColor(148, 163, 184); // Slate 400
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

  const handleDownloadPDF = () => {
    generatePDF({
      patient_name: patientName,
      patient_age: patientAge,
      patient_gender: patientGender,
      patient_mobile: patientMobile,
      bill_date: billDate,
      doctor_name: `Dr. ${doctorName.trim()}`,
      bill_number: savedBillNumber || undefined,
      patient_id: savedPatientId || matchedPatient?.patient_id || undefined,
      clinic_address: clinicAddress,
      clinic_contact: clinicContact,
      treatments: treatments,
      payments: payments,
      status: computedStatus
    });
  };

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/dashboard')}
          startIcon={<BackIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Dashboard
        </Button>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: { xs: '1.8rem', sm: '2rem', md: '2.125rem' } }}>
            Quick Bill
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and save patient invoices, track installment payments, and print professional PDFs.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Left Form Panel */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mb: 2 }}>
              1. Patient & Header Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Patient Name"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    setIsSaved(false);
                    setSavedBillNumber(null);
                    setSavedPatientId(null);
                  }}
                  required
                  slotProps={{
                    input: {
                      endAdornment: matchedPatient ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => setOpenHistoryDialog(true)}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', px: 1.5, py: 0.5, mr: -1 }}
                        >
                          View History
                        </Button>
                      ) : null
                    }
                  }}
                  helperText={matchedPatient ? "Profile found in registry. Click 'View History' to see past records & invoices." : ""}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Patient Mobile Number"
                  value={patientMobile}
                  onChange={(e) => {
                    setPatientMobile(e.target.value);
                    setIsSaved(false);
                    setSavedBillNumber(null);
                    setSavedPatientId(null);
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Patient Age"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Patient Gender"
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as 'M' | 'F' | 'O')}
                >
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                  <MenuItem value="O">Other</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Consulting Doctor"
                  value={doctorName}
                  onChange={(e) => setDoctorName(cleanDoctorName(e.target.value))}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">Dr.</InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Bill Date"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Clinic Address Header"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Clinic Contact Header"
                  value={clinicContact}
                  onChange={(e) => setClinicContact(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Treatment Breakdown */}
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mt: 4, mb: 2 }}>
              2. Treatment Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {treatments.map((t, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Treatment"
                  value={t.treatment_name}
                  onChange={(e) => handleTreatmentChange(idx, 'treatment_name', e.target.value)}
                  sx={{ flexGrow: 2 }}
                />
                <TextField
                  label="Date"
                  type="date"
                  value={t.treatment_date}
                  onChange={(e) => handleTreatmentChange(idx, 'treatment_date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Qty"
                  type="number"
                  value={t.quantity}
                  onChange={(e) => handleTreatmentChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                  sx={{ width: 80 }}
                />
                <TextField
                  label="Cost (₹)"
                  type="number"
                  value={t.cost}
                  onChange={(e) => handleTreatmentChange(idx, 'cost', parseFloat(e.target.value) || 0)}
                  sx={{ width: 120 }}
                />
                <IconButton color="error" onClick={() => handleRemoveTreatment(idx)} disabled={treatments.length <= 1}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <Button startIcon={<AddIcon />} onClick={handleAddTreatment} sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}>
              Add Treatment Item
            </Button>

            {/* Payment Installments */}
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mt: 4, mb: 2 }}>
              3. Payment Installments (History)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {payments.map((p, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                <TextField
                  label="Payment Date"
                  type="date"
                  value={p.payment_date}
                  onChange={(e) => handlePaymentChange(idx, 'payment_date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Amount Paid (₹)"
                  type="number"
                  value={p.amount_paid}
                  onChange={(e) => handlePaymentChange(idx, 'amount_paid', parseFloat(e.target.value) || 0)}
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  select
                  label="Mode"
                  value={p.payment_mode}
                  onChange={(e) => handlePaymentChange(idx, 'payment_mode', e.target.value)}
                  sx={{ width: 120 }}
                >
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="CASH">Cash</MenuItem>
                  <MenuItem value="CARD">Card</MenuItem>
                  <MenuItem value="NET_BANKING">Net Banking</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
                <IconButton color="error" onClick={() => handleRemovePayment(idx)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <Button startIcon={<AddIcon />} onClick={handleAddPayment} sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}>
              Add Payment Installment
            </Button>
          </Paper>
        </Grid>

        {/* Right Preview Panel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 3, position: 'sticky', top: 90 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit', color: 'primary.main', mb: 2 }}>
                Live Invoice Preview
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Styled Preview block representing invoice layout */}
              <Box sx={{ border: '1px solid #E2E8F0', p: 2, borderRadius: 2, mb: 3, bgcolor: '#FAF5FF', minHeight: 250 }}>
                {/* Clinic Info Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{activeClinicName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{clinicAddress}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Contact: {clinicContact}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ mb: 1.5 }} />

                {/* Bill Header Info */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>INVOICE NUMBER</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{savedBillNumber || 'Draft (Unsaved)'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>BILL DATE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(billDate).toLocaleDateString()}</Typography>
                  </Grid>
                </Grid>

                {/* Patient Summary */}
                <Box sx={{ mb: 2, bgcolor: '#FFFFFF', p: 1.5, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>PATIENT DETAILS</Typography>
                  <Grid container spacing={1} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        Name:{' '}
                        {matchedPatient ? (
                          <span
                            onClick={() => setOpenHistoryDialog(true)}
                            style={{
                              color: '#0D9488',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            {patientName}
                          </span>
                        ) : (
                          <b>{patientName || '—'}</b>
                        )}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>Age: <b>{patientAge ? `${patientAge} Yrs` : '—'}</b></Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>Patient ID: <b>{savedPatientId || matchedPatient?.patient_id || 'New Patient'}</b></Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ display: 'block' }}>Gender: <b>{patientGender === 'M' ? 'Male' : patientGender === 'F' ? 'Female' : 'Other'}</b></Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>Doctor: <b>Dr. {doctorName}</b></Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Treatment details */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>TREATMENT breakdown</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                      <TableRow>
                        <TableCell sx={{ color: '#FFFFFF', fontSize: '0.7rem', py: 0.5 }}>Treatment</TableCell>
                        <TableCell sx={{ color: '#FFFFFF', fontSize: '0.7rem', py: 0.5 }} align="right">Qty</TableCell>
                        <TableCell sx={{ color: '#FFFFFF', fontSize: '0.7rem', py: 0.5 }} align="right">Cost (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {treatments.map((t, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>{t.treatment_name || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }} align="right">{t.quantity}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }} align="right">₹{Number(t.cost).toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Billing Summary */}
                <Grid container spacing={1} sx={{ bgcolor: '#FFFFFF', p: 1.5, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>GRAND TOTAL</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{grandTotal.toLocaleString('en-IN')}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>AMOUNT PAID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{totalPaid.toLocaleString('en-IN')}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>OUTSTANDING</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: outstandingBalance > 0 ? 'error.main' : 'success.main' }}>
                      ₹{outstandingBalance.toLocaleString('en-IN')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>STATUS</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: computedStatus === 'PAID' ? 'success.main' : 'warning.main' }}>
                      {computedStatus}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Action Buttons */}
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<SaveIcon />}
                  onClick={handleSaveBill}
                  disabled={createBillMutation.isPending || isSaved}
                  sx={{ py: 1.2, fontWeight: 600, textTransform: 'none' }}
                >
                  {createBillMutation.isPending ? 'Saving Invoice...' : isSaved ? 'Invoice Saved' : 'Save Invoice'}
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadPDF}
                  disabled={!patientName.trim()}
                  sx={{ py: 1.2, fontWeight: 600, textTransform: 'none' }}
                >
                  Download Invoice PDF
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Patient History Dialog (Visits & Invoices) */}
      <Dialog
        open={openHistoryDialog}
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="md"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700, pb: 1 }}>
          Patient History: {patientName}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Tabs
            value={historyTab}
            onChange={(_, val) => setHistoryTab(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ mb: 2, borderBottom: '1px solid #E2E8F0' }}
          >
            <Tab label="Past Visits & Records" sx={{ fontFamily: 'Outfit', fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Past Invoices & Bills" sx={{ fontFamily: 'Outfit', fontWeight: 600, textTransform: 'none' }} />
          </Tabs>

          {historyTab === 0 ? (
            <Box>
              {loadingTimeline ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
              ) : !timelineEvents || timelineEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No past visit records found for this patient.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Diagnosis & Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {timelineEvents.map((evt: any, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {new Date(evt.date || '').toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: evt.type === 'VISIT' ? 'primary.main' : 'secondary.main' }}>
                              {evt.type}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{evt.title}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-line' }}>
                              {evt.description}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          ) : (
            <Box>
              {loadingBills ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={30} /></Box>
              ) : !patientBillsData?.results || patientBillsData.results.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No past invoices found for this patient.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Invoice Number</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Paid</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {patientBillsData.results.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{b.bill_number}</TableCell>
                          <TableCell>{new Date(b.bill_date).toLocaleDateString()}</TableCell>
                          <TableCell align="right">₹{Number(b.grand_total).toLocaleString('en-IN')}</TableCell>
                          <TableCell align="right">₹{Number(b.amount_paid).toLocaleString('en-IN')}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: b.status === 'PAID' ? 'success.main' : 'warning.main' }}>
                            {b.status}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              variant="outlined"
                              onClick={() => generatePDF(b)}
                              sx={{ textTransform: 'none', py: 0.2 }}
                            >
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)} sx={{ fontWeight: 600, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickBill;
