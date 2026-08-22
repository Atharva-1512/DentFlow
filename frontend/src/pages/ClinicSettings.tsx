import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  MenuItem,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  ReceiptLong as InvoiceIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  MedicalServices as TreatmentIcon,
  CalendarMonth as HolidayIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { toastRef } from '../context/ToastContext';
import type { Clinic, Doctor, TreatmentCatalogItem, HolidayItem } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const ClinicSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);

  // Fetch clinic profile details
  const { data: clinic, isLoading, error } = useQuery<Clinic>({
    queryKey: ['clinic_profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/clinic/');
      return res.data;
    },
  });

  // Local Form States for Settings
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dciNumber, setDciNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('DF-2026/');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [terms, setTerms] = useState('');
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [workingDays, setWorkingDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]);

  // Sync state when clinic data is loaded
  React.useEffect(() => {
    if (clinic) {
      setName(clinic.name || '');
      setPhone(clinic.notification_whatsapp_number || '');
      setAddress(clinic.address || '');
      setDciNumber(clinic.dci_number || '');
      setGstNumber(clinic.gst_number || '');
      setInvoicePrefix(clinic.invoice_prefix || 'DF-2026/');
      setTaxRate(clinic.tax_rate ?? 0);
      setTerms(clinic.terms_and_conditions || 'Thank you for choosing DentFlow Clinic.');
      setSlotDuration(clinic.slot_duration ?? 30);
      setOpeningTime(clinic.opening_time || '09:00');
      setClosingTime(clinic.closing_time || '20:00');
      setBreakStart(clinic.break_start || '13:00');
      setBreakEnd(clinic.break_end || '14:00');
      if (clinic.working_days && clinic.working_days.length > 0) {
        setWorkingDays(clinic.working_days);
      }
    }
  }, [clinic]);

  // Update Clinic Profile Mutation
  const updateClinicMutation = useMutation({
    mutationFn: async (payload: Partial<Clinic>) => {
      const res = await api.put('/accounts/clinic/', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_profile'] });
      toastRef.show('Clinic settings saved successfully.', 'success');
    },
    onError: () => {
      toastRef.show('Failed to save clinic settings.', 'error');
    },
  });

  // Doctor Dialog States
  const [openDoctorDialog, setOpenDoctorDialog] = useState(false);
  const [docName, setDocName] = useState('');
  const [docQual, setDocQual] = useState('BDS, MDS');
  const [docFee, setDocFee] = useState('500');
  const [docSpec, setDocSpec] = useState('General Dentistry');
  const [docShift, setDocShift] = useState('09:00 - 17:00');

  // Treatment Catalog Dialog States
  const [openTreatmentDialog, setOpenTreatmentDialog] = useState(false);
  const [treatName, setTreatName] = useState('');
  const [treatCat, setTreatCat] = useState('General');
  const [treatCost, setTreatCost] = useState('1000');
  const [treatDuration, setTreatDuration] = useState('30 min');

  // Holiday Dialog States
  const [openHolidayDialog, setOpenHolidayDialog] = useState(false);
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().substring(0, 10));
  const [holidayReason, setHolidayReason] = useState('');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error || !clinic) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load clinic settings. Please try again later.</Alert>
      </Container>
    );
  }

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleWorkingDayToggle = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSaveGeneral = () => {
    updateClinicMutation.mutate({
      name,
      notification_whatsapp_number: phone,
      address,
      dci_number: dciNumber,
      gst_number: gstNumber,
      invoice_prefix: invoicePrefix,
      tax_rate: Number(taxRate),
      terms_and_conditions: terms,
    });
  };

  const handleSaveWorkingHours = () => {
    updateClinicMutation.mutate({
      slot_duration: Number(slotDuration),
      opening_time: openingTime,
      closing_time: closingTime,
      break_start: breakStart,
      break_end: breakEnd,
      working_days: workingDays,
    });
  };

  // Add / Delete Doctor
  const handleAddDoctor = () => {
    if (!docName.trim()) {
      toastRef.show('Please enter doctor name.', 'error');
      return;
    }
    const newDoc: Doctor = {
      id: `doc-${Date.now()}`,
      name: docName,
      qualification: docQual,
      fee: parseFloat(docFee) || 500,
      specialization: docSpec,
      shift: docShift,
    };
    const updatedDocs = [...(clinic.doctors || []), newDoc];
    updateClinicMutation.mutate({ doctors: updatedDocs });
    setOpenDoctorDialog(false);
    setDocName('');
  };

  const handleDeleteDoctor = (docId: string) => {
    const updatedDocs = (clinic.doctors || []).filter((d) => d.id !== docId);
    updateClinicMutation.mutate({ doctors: updatedDocs });
  };

  // Add / Delete Treatment Catalog Item
  const handleAddTreatment = () => {
    if (!treatName.trim()) {
      toastRef.show('Please enter procedure name.', 'error');
      return;
    }
    const newTreat: TreatmentCatalogItem = {
      id: `treat-${Date.now()}`,
      name: treatName,
      category: treatCat,
      default_cost: parseFloat(treatCost) || 500,
      duration: treatDuration,
    };
    const updatedTreatments = [...(clinic.treatments_catalog || []), newTreat];
    updateClinicMutation.mutate({ treatments_catalog: updatedTreatments });
    setOpenTreatmentDialog(false);
    setTreatName('');
  };

  const handleDeleteTreatment = (treatId: string) => {
    const updatedTreatments = (clinic.treatments_catalog || []).filter((t) => t.id !== treatId);
    updateClinicMutation.mutate({ treatments_catalog: updatedTreatments });
  };

  // Add / Delete Holiday
  const handleAddHoliday = () => {
    if (!holidayReason.trim()) {
      toastRef.show('Please enter holiday reason.', 'error');
      return;
    }
    const newHoliday: HolidayItem = {
      id: `hol-${Date.now()}`,
      date: holidayDate,
      reason: holidayReason,
    };
    const updatedHolidays = [...(clinic.holidays || []), newHoliday];
    updateClinicMutation.mutate({ holidays: updatedHolidays });
    setOpenHolidayDialog(false);
    setHolidayReason('');
  };

  const handleDeleteHoliday = (holId: string) => {
    const updatedHolidays = (clinic.holidays || []).filter((h) => h.id !== holId);
    updateClinicMutation.mutate({ holidays: updatedHolidays });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, pb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 48,
            height: 48,
            boxShadow: '0 4px 14px rgba(25,118,210,0.3)',
          }}
        >
          <SettingsIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Clinic Settings & Operations Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage clinic branding, operating hours, doctors directory, and procedure price catalog.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 600, py: 1.5, textTransform: 'none' },
          }}
        >
          <Tab icon={<BusinessIcon />} iconPosition="start" label="Branding & Invoicing" />
          <Tab icon={<TimeIcon />} iconPosition="start" label="Working Hours & Calendar" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label={`Doctors Directory (${clinic.doctors?.length || 0})`} />
          <Tab icon={<TreatmentIcon />} iconPosition="start" label={`Procedure Price Catalog (${clinic.treatments_catalog?.length || 0})`} />
        </Tabs>
      </Paper>

      {/* TAB 0: BRANDING & INVOICING */}
      <CustomTabPanel value={activeTab} index={0}>
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontFamily: 'Outfit' }}>
              General Information & Invoice Branding
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Clinic Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone / WhatsApp *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Clinic Address *"
                  multiline
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="DCI Registration / License Number"
                  placeholder="e.g. DCI-MH-12345"
                  value={dciNumber}
                  onChange={(e) => setDciNumber(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GST / Tax Registration ID Number"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Custom Invoice Prefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  helperText="Prefix for generated bill numbers (e.g. DF-2026/)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Default GST / Tax Rate (%)"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  helperText="Tax percentage applied to invoices (0 = Exempted)"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Terms & Conditions (Printed on PDF Invoices)"
                  multiline
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sx={{ textAlign: 'right', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveGeneral}
                  disabled={updateClinicMutation.isPending}
                  sx={{ px: 4, fontWeight: 700 }}
                >
                  {updateClinicMutation.isPending ? 'Saving...' : 'Save General Settings'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </CustomTabPanel>

      {/* TAB 1: WORKING HOURS & CALENDAR */}
      <CustomTabPanel value={activeTab} index={1}>
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 1, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, fontFamily: 'Outfit' }}>
              Working Hours & Appointment Duration
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Default Appointment Slot Duration"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                >
                  <MenuItem value={15}>15 Minutes</MenuItem>
                  <MenuItem value={30}>30 Minutes (Standard)</MenuItem>
                  <MenuItem value={45}>45 Minutes</MenuItem>
                  <MenuItem value={60}>60 Minutes (1 Hour)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Working Days Checklist
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {allDays.map((day) => (
                    <FormControlLabel
                      key={day}
                      control={
                        <Checkbox
                          checked={workingDays.includes(day)}
                          onChange={() => handleWorkingDayToggle(day)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{day.substring(0, 3)}</Typography>}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Clinic Opening Time"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Clinic Closing Time"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Lunch Break Start"
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Lunch Break End"
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid item xs={12} sx={{ textAlign: 'right', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveWorkingHours}
                  disabled={updateClinicMutation.isPending}
                  sx={{ px: 4, fontWeight: 700 }}
                >
                  {updateClinicMutation.isPending ? 'Saving...' : 'Save Hours & Schedule Controls'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Holiday Calendar Card */}
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <HolidayIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  Holiday & Clinic Closure Calendar
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenHolidayDialog(true)}
              >
                + Add Clinic Holiday
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {!clinic.holidays || clinic.holidays.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, italic: true }}>
                No holidays recorded. Click "+ Add Clinic Holiday" to block appointment slots on closure dates.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reason / Festival</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clinic.holidays.map((h) => (
                      <TableRow key={h.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{new Date(h.date).toLocaleDateString()}</TableCell>
                        <TableCell>{h.reason}</TableCell>
                        <TableCell align="center">
                          <IconButton color="error" size="small" onClick={() => handleDeleteHoliday(h.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </CustomTabPanel>

      {/* TAB 2: DOCTORS DIRECTORY */}
      <CustomTabPanel value={activeTab} index={2}>
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PeopleIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  Consulting Dentists & Specialists Directory
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenDoctorDialog(true)}
              >
                + Add Consulting Dentist
              </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />

            {!clinic.doctors || clinic.doctors.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No doctors added yet. Click "+ Add Consulting Dentist" to populate your staff directory.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Doctor Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qualifications</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Specialization</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Shift / Hours</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Consultation Fee</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clinic.doctors.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {doc.name}
                        </TableCell>
                        <TableCell>{doc.qualification}</TableCell>
                        <TableCell>
                          <Chip label={doc.specialization} size="small" variant="outlined" color="primary" />
                        </TableCell>
                        <TableCell>{doc.shift}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                          ₹{Number(doc.fee).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton color="error" size="small" onClick={() => handleDeleteDoctor(doc.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </CustomTabPanel>

      {/* TAB 3: PROCEDURE PRICE CATALOG */}
      <CustomTabPanel value={activeTab} index={3}>
        <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TreatmentIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  Pre-defined Procedure & Treatment Price Catalog
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenTreatmentDialog(true)}
              >
                + Add New Procedure
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Pre-set dental procedures with default pricing for fast 1-click Quick Billing.
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {!clinic.treatments_catalog || clinic.treatments_catalog.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No treatment procedures in catalog. Click "+ Add New Procedure" to populate catalog.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Procedure Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Est. Duration</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Default Cost (₹)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clinic.treatments_catalog.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {t.name}
                        </TableCell>
                        <TableCell>
                          <Chip label={t.category} size="small" variant="outlined" color="info" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>{t.duration}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                          ₹{Number(t.default_cost).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton color="error" size="small" onClick={() => handleDeleteTreatment(t.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </CustomTabPanel>

      {/* DIALOG: ADD DOCTOR */}
      <Dialog open={openDoctorDialog} onClose={() => setOpenDoctorDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Add Consulting Dentist / Specialist
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
          <TextField
            fullWidth
            label="Doctor Name *"
            placeholder="Dr. Full Name"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Qualifications"
                placeholder="BDS, MDS Orthodontics"
                value={docQual}
                onChange={(e) => setDocQual(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Consultation Fee (₹)"
                type="number"
                value={docFee}
                onChange={(e) => setDocFee(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Specialization"
                placeholder="Endodontics, Surgery..."
                value={docSpec}
                onChange={(e) => setDocSpec(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Shift Hours"
                placeholder="09:00 - 17:00"
                value={docShift}
                onChange={(e) => setDocShift(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDoctorDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddDoctor}>
            Save Doctor
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ADD TREATMENT */}
      <Dialog open={openTreatmentDialog} onClose={() => setOpenTreatmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Add Pre-defined Procedure to Price Catalog
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
          <TextField
            fullWidth
            label="Procedure Name *"
            placeholder="e.g. Scaling & Polishing, RCT..."
            value={treatName}
            onChange={(e) => setTreatName(e.target.value)}
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                placeholder="General, Surgery, Hygiene..."
                value={treatCat}
                onChange={(e) => setTreatCat(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Default Cost (₹)"
                type="number"
                value={treatCost}
                onChange={(e) => setTreatCost(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Estimated Duration"
                placeholder="30 min, 60 min..."
                value={treatDuration}
                onChange={(e) => setTreatDuration(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenTreatmentDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTreatment}>
            Save Procedure
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ADD HOLIDAY */}
      <Dialog open={openHolidayDialog} onClose={() => setOpenHolidayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Add Clinic Holiday / Closure Date
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
          <TextField
            fullWidth
            label="Holiday Date"
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth
            label="Reason / Festival"
            placeholder="e.g. Independence Day, Annual Maintenance"
            value={holidayReason}
            onChange={(e) => setHolidayReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenHolidayDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddHoliday}>
            Save Holiday
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ClinicSettings;
