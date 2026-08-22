import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Button,
  Tabs,
  Tab,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EventIcon from '@mui/icons-material/Event';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import HistoryIcon from '@mui/icons-material/History';
import PaymentIcon from '@mui/icons-material/Payment';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import { usePatient, usePatientTimeline, usePatientBills } from '../../hooks/useApi';
import { EditPatientModal } from '../../components/Patients/EditPatientModal';
import type { Bill } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`patient-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

/**
 * PatientDetail page renders comprehensive patient information, medical history,
 * past visit records, past appointments, and complete payment history.
 */
const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch patient data
  const {
    data: patient,
    isLoading: patientLoading,
    isError: patientError,
    error: patientErrorObj,
  } = usePatient(id ?? '');

  // Fetch timeline data
  const {
    data: timeline,
    isLoading: timelineLoading,
    isError: timelineError,
    error: timelineErrorObj,
  } = usePatientTimeline(id ?? '');

  // Fetch patient bills data
  const {
    data: billsData,
    isLoading: billsLoading,
  } = usePatientBills(id ?? '');

  const loading = patientLoading || timelineLoading;
  const error = patientError || timelineError;

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {(patientErrorObj as any)?.message || (timelineErrorObj as any)?.message || 'Failed to load patient data.'}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={80} thickness={4} />
      </Box>
    );
  }

  if (!patient) {
    return null;
  }

  const bills: Bill[] = billsData?.results || [];

  // Calculate financial totals
  const totalBilled = bills.reduce((acc, b) => acc + Number(b.grand_total || 0), 0);
  const totalPaid = bills.reduce((acc, b) => acc + Number(b.amount_paid || 0), 0);
  const totalOutstanding = bills.reduce((acc, b) => acc + Number(b.outstanding_balance || 0), 0);

  // Extract visits and appointments from timeline
  const visitEvents = timeline?.filter((item) => item.type === 'VISIT') || [];
  const appointmentEvents = timeline?.filter((item) => item.type === 'APPOINTMENT') || [];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusChipColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'COMPLETED':
        return 'success';
      case 'PARTIALLY_PAID':
      case 'SCHEDULED':
        return 'warning';
      case 'UNPAID':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderTimelineItem = (item: any, index: number) => {
    const isVisit = item.type === 'VISIT';
    const isAppt = item.type === 'APPOINTMENT';
    const isPayment = item.type === 'PAYMENT';

    const dateObj = new Date(item.date);
    const date = isNaN(dateObj.getTime()) ? item.date : dateObj.toLocaleDateString();
    const time = isAppt && !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    let color: 'primary' | 'secondary' | 'success' | 'info' = 'primary';
    if (isAppt) color = 'secondary';
    if (isPayment) color = 'success';

    return (
      <TimelineItem key={item.id || index}>
        <TimelineOppositeContent sx={{ flex: 0.25, m: 'auto 0' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {date}
            {time && <><br />{time}</>}
          </Typography>
          {item.payment_mode && (
            <Chip
              label={item.payment_mode}
              size="small"
              color="success"
              variant="outlined"
              sx={{ mt: 0.5, fontSize: '0.7rem' }}
            />
          )}
        </TimelineOppositeContent>
        <TimelineSeparator>
          <TimelineDot color={color} />
          {timeline && index < timeline.length - 1 && <TimelineConnector />}
        </TimelineSeparator>
        <TimelineContent sx={{ py: '12px', px: 2 }}>
          <Card variant="outlined" sx={{ background: 'rgba(var(--mui-palette-background-paperChannel) / 0.85)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {item.title}
                </Typography>
                {item.status && (
                  <Chip
                    label={item.status}
                    size="small"
                    color={getStatusChipColor(item.status)}
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                  />
                )}
              </Box>
              {item.doctor && (
                <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                  Doctor: {item.doctor}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {item.description}
              </Typography>
              {item.prescription && (
                <Typography variant="body2" color="primary" sx={{ mt: 1, fontStyle: 'italic' }}>
                  <strong>Prescription:</strong> {item.prescription}
                </Typography>
              )}
              {item.notes && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {item.notes}
                </Typography>
              )}
            </CardContent>
          </Card>
        </TimelineContent>
      </TimelineItem>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Patient Header Card */}
      <Card sx={{ mb: 4, background: 'rgba(var(--mui-palette-background-paperChannel) / 0.9)', borderRadius: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" component="div" sx={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: { xs: '1.8rem', sm: '2.125rem' } }}>
              {patient.full_name}{' '}
              {patient.patient_id && (
                <Typography component="span" variant="h5" sx={{ color: 'text.secondary', fontWeight: 500, ml: 1 }}>
                  ({patient.patient_id})
                </Typography>
              )}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/patients/new?patient_id=${patient.id}`)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                id="patient-schedule-followup-btn"
              >
                Schedule Follow-up / New Visit
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ReceiptLongIcon />}
                onClick={() => navigate(`/quick-bill?patient_id=${patient.id}`)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                id="patient-create-quick-bill-btn"
              >
                Create Quick Bill
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                id="patient-edit-profile-btn"
              >
                Edit Profile
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            {patient.patient_id && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">Patient ID</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{patient.patient_id}</Typography>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Gender / Age</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'},{' '}
                {patient.date_of_birth
                  ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
                  : patient.age}{' '}
                yrs
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Mobile Number</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{patient.mobile_number}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">Consulting Doctor</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{patient.consulting_doctor_name || 'N/A'}</Typography>
            </Grid>

            {patient.address && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography variant="body1">{patient.address}</Typography>
              </Grid>
            )}
            {patient.chief_complaint && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Chief Complaint</Typography>
                <Typography variant="body1">{patient.chief_complaint}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="patient details tabs"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="Overview" />
          <Tab icon={<MedicalInformationIcon />} iconPosition="start" label={`Visit Records (${visitEvents.length})`} />
          <Tab icon={<EventIcon />} iconPosition="start" label={`Appointments (${appointmentEvents.length})`} />
          <Tab icon={<PaymentIcon />} iconPosition="start" label={`Payment History (${bills.length})`} />
          <Tab icon={<HistoryIcon />} iconPosition="start" label={`Full Timeline (${timeline?.length || 0})`} />
        </Tabs>
      </Box>

      {/* TAB 0: OVERVIEW */}
      <CustomTabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Medical & Clinical Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Chief Complaint:
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                  {patient.chief_complaint || 'No specific chief complaint recorded.'}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Patient Notes & Medical History:
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {patient.notes || 'No extra notes documented.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            {/* Financial Summary Card */}
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3, background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  Billing & Payment Overview
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Total Billed:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>₹{totalBilled.toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Total Paid:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>₹{totalPaid.toLocaleString()}</Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Outstanding Balance:</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: totalOutstanding > 0 ? 'error.main' : 'success.main' }}>
                    ₹{totalOutstanding.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  Patient Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(`/patients/new?patient_id=${patient.id}`)}
                  >
                    Add Visit / Diagnosis
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={() => navigate(`/quick-bill?patient_id=${patient.id}`)}
                  >
                    Issue Bill / Collect Payment
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CustomTabPanel>

      {/* TAB 1: CLINICAL HISTORY & VISIT RECORDS */}
      <CustomTabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
          Previous Visit & Treatment Records
        </Typography>
        {visitEvents.length > 0 ? (
          <Grid container spacing={2}>
            {visitEvents.map((visit: any, index: number) => {
              const dateObj = new Date(visit.date);
              const formattedDate = isNaN(dateObj.getTime()) ? visit.date : dateObj.toLocaleDateString();
              return (
                <Grid item xs={12} key={visit.id || index}>
                  <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: 1 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'primary.main' }}>
                          {visit.title || 'Visit Consultation'}
                        </Typography>
                        <Chip label={formattedDate} variant="outlined" color="primary" size="small" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                        Consulting Doctor: {visit.doctor || patient.consulting_doctor_name || 'N/A'}
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.primary', mb: 1.5 }}>
                        {visit.description}
                      </Typography>
                      {visit.prescription && (
                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, mt: 1 }}>
                          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
                            Prescription Notes:
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {visit.prescription}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            No past visits recorded for this patient.
          </Paper>
        )}
      </CustomTabPanel>

      {/* TAB 2: APPOINTMENTS */}
      <CustomTabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
          Past & Scheduled Appointments
        </Typography>
        {appointmentEvents.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Doctor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Title / Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointmentEvents.map((appt: any, index: number) => {
                  const dateObj = new Date(appt.date);
                  const formattedDate = isNaN(dateObj.getTime()) ? appt.date : dateObj.toLocaleDateString();
                  const formattedTime = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <TableRow key={appt.id || index} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {formattedDate} {formattedTime && <Typography variant="caption" color="text.secondary" display="block">{formattedTime}</Typography>}
                      </TableCell>
                      <TableCell>{appt.doctor || 'N/A'}</TableCell>
                      <TableCell>{appt.title}</TableCell>
                      <TableCell>{appt.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status || 'SCHEDULED'}
                          color={getStatusChipColor(appt.status)}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            No appointments found for this patient.
          </Paper>
        )}
      </CustomTabPanel>

      {/* TAB 3: PAYMENT & BILLING HISTORY */}
      <CustomTabPanel value={activeTab} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Payment History & Invoices
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ReceiptLongIcon />}
            onClick={() => navigate(`/quick-bill?patient_id=${patient.id}`)}
          >
            Create New Bill
          </Button>
        </Box>

        {/* Financial Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'primary.main', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Billed</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5 }}>
                ₹{totalBilled.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'success.main', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Collected / Paid</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5 }}>
                ₹{totalPaid.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: totalOutstanding > 0 ? 'error.main' : 'grey.300', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">Outstanding Due</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: totalOutstanding > 0 ? 'error.main' : 'text.primary', mt: 0.5 }}>
                ₹{totalOutstanding.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {billsLoading ? (
          <CircularProgress />
        ) : bills.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {bills.map((bill) => (
              <Card key={bill.id} variant="outlined" sx={{ borderRadius: 2.5, boxShadow: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {bill.bill_number || 'INV-00000'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Date: {bill.bill_date} | Doctor: {bill.doctor_name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={bill.status}
                        color={getStatusChipColor(bill.status)}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Box>

                  {/* Treatments Table */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, mt: 2 }}>
                    Billed Treatments:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700 }}>Treatment</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Qty</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bill.treatments?.map((t, idx) => (
                          <TableRow key={t.id || idx}>
                            <TableCell>{t.treatment_name}</TableCell>
                            <TableCell align="center">{t.quantity}</TableCell>
                            <TableCell align="right">₹{Number(t.cost).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Payment History Breakdown */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                    Payment Records (Date & Mode):
                  </Typography>
                  {bill.payments && bill.payments.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Mode of Payment</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Amount Paid</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {bill.payments.map((p, pIdx) => (
                            <TableRow key={p.id || pIdx}>
                              <TableCell sx={{ fontWeight: 600 }}>{p.payment_date}</TableCell>
                              <TableCell>
                                <Chip
                                  label={p.payment_mode || 'UPI'}
                                  color="success"
                                  variant="outlined"
                                  size="small"
                                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                                ₹{Number(p.amount_paid).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      No payment records entered yet.
                    </Typography>
                  )}

                  {/* Bill Summary Footer */}
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="body2">
                      Grand Total: <strong>₹{Number(bill.grand_total).toLocaleString()}</strong>
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Amount Paid: <strong>₹{Number(bill.amount_paid).toLocaleString()}</strong>
                    </Typography>
                    <Typography variant="body2" color={Number(bill.outstanding_balance) > 0 ? 'error.main' : 'text.secondary'}>
                      Balance Due: <strong>₹{Number(bill.outstanding_balance).toLocaleString()}</strong>
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            No bills or payment history found for this patient.
          </Paper>
        )}
      </CustomTabPanel>

      {/* TAB 4: UNIFIED TIMELINE */}
      <CustomTabPanel value={activeTab} index={4}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
          Full Chronological Patient History Timeline
        </Typography>
        <Timeline position="alternate">
          {timeline && timeline.length > 0 ? (
            timeline.map((item, idx) => renderTimelineItem(item, idx))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No history available for this patient.
            </Typography>
          )}
        </Timeline>
      </CustomTabPanel>

      {/* Edit Patient Modal */}
      <EditPatientModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        patient={patient}
      />
    </Box>
  );
};

export default PatientDetail;
