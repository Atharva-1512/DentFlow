import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
  Chip,
  Tab,
  Tabs,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Fab,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Settings as SettingsIcon,
  ReceiptLong as ReceiptIcon,
  AccountBalanceWallet as AccountsIcon,
  Campaign as CampaignIcon,
  BarChart as ReportsIcon,
  Description as PrescriptionIcon,
  Inventory as InventoryIcon,
  Science as LabWorkIcon,
  MonetizationOn as BillingIcon,
  Add as AddIcon,
  PersonAdd as AddPatientIcon,
  Event as AddApptIcon,
  Schedule as AddWalkInIcon,
  CurrencyRupee as AddPaymentIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toastRef } from '../context/ToastContext';

// ==========================================
// Accounts Menu Dialog
// ==========================================
interface AccountsDialogProps {
  open: boolean;
  onClose: () => void;
}

const AccountsDialog: React.FC<AccountsDialogProps> = ({ open, onClose }) => {
  const handleAction = (actionType: 'INCOME' | 'EXPENSE') => {
    toastRef.show(`${actionType} recorded successfully (Mocked).`, 'success');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 700, fontFamily: 'Outfit' }}>
        Accounts & Ledger
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3, alignItems: 'center' }}>
        <Button
          variant="contained"
          color="success"
          fullWidth
          size="large"
          onClick={() => handleAction('INCOME')}
          sx={{ py: 2, fontSize: '1.1rem', fontWeight: 600 }}
        >
          Income
        </Button>
        <Button
          variant="contained"
          color="error"
          fullWidth
          size="large"
          onClick={() => handleAction('EXPENSE')}
          sx={{ py: 2, fontSize: '1.1rem', fontWeight: 600 }}
        >
          Expense
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================
// Clinic Owner / Doctor Dashboard
// ==========================================
const ClinicOwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useAuth();
  const [activeTab, setActiveTab] = useState<number>(0); // 0 = Menu, 1 = Schedule
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Fetch metrics/records
  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await api.get('/patients/');
      return res.data;
    },
  });

  const { data: todayApptsData, isLoading: loadingToday } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const res = await api.get('/appointments/?today=true');
      return res.data;
    },
  });

  const { data: visitsData } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const res = await api.get('/visits/');
      return res.data;
    },
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const res = await api.get('/visits/bills/collections/');
      return res.data;
    },
  });

  const isLoading = loadingPatients || loadingToday;

  const totalPatients = patientsData?.count ?? 0;
  const todayCount = todayApptsData?.count ?? 0;
  const totalVisits = visitsData?.count ?? 0;
  const totalCollections = collectionsData?.total_collections ?? 0;
  const todayAppointmentsList = todayApptsData?.results ?? [];

  // FAB quick actions configuration
  const quickActions = [
    { icon: <AddPatientIcon sx={{ color: 'primary.main' }} />, name: 'Add Patient', action: () => navigate('/patients/new') },
    { icon: <AddApptIcon sx={{ color: 'primary.main' }} />, name: 'Add Appointment', action: () => navigate('/calendar') },
    { icon: <AddWalkInIcon sx={{ color: 'primary.main' }} />, name: 'Add Walk In', action: () => navigate('/patients/new') },
    { icon: <AddPaymentIcon sx={{ color: 'primary.main' }} />, name: 'Add Payment', action: () => navigate('/quick-bill') },
  ];

  // Grid Menu configuration
  const gridMenuItems = [
    { text: 'Patients', icon: <PeopleIcon sx={{ fontSize: 32, color: '#3182CE' }} />, path: '/patients' },
    { text: 'Quick Bill', icon: <ReceiptIcon sx={{ fontSize: 32, color: '#38A169' }} />, path: '/quick-bill' },
    { text: 'Settings', icon: <SettingsIcon sx={{ fontSize: 32, color: '#4A5568' }} />, path: '/settings' },
    { text: 'Appointments', icon: <CalendarIcon sx={{ fontSize: 32, color: '#DD6B20' }} />, path: '/appointments/today' },
    { text: 'Accounts', icon: <AccountsIcon sx={{ fontSize: 32, color: '#805AD5' }} />, action: () => toastRef.show('Accounts feature is coming soon!', 'info') },
    { text: 'Campaign', icon: <CampaignIcon sx={{ fontSize: 32, color: 'primary.main' }} />, action: () => toastRef.show('Campaign feature is coming soon!', 'info') },
    { text: 'Reports', icon: <ReportsIcon sx={{ fontSize: 32, color: '#319795' }} />, action: () => toastRef.show('Reports feature is coming soon!', 'info') },
    { text: 'Prescription', icon: <PrescriptionIcon sx={{ fontSize: 32, color: '#D69E2E' }} />, action: () => toastRef.show('Prescription feature is coming soon!', 'info') },
    { text: 'Inventory', icon: <InventoryIcon sx={{ fontSize: 32, color: '#4A5568' }} />, action: () => toastRef.show('Inventory feature is coming soon!', 'info') },
    { text: 'Billing', icon: <BillingIcon sx={{ fontSize: 32, color: 'primary.main' }} />, path: '/billing' },
    { text: 'Lab Work', icon: <LabWorkIcon sx={{ fontSize: 32, color: '#3182CE' }} />, action: () => toastRef.show('Lab Work feature is coming soon!', 'info') },
  ];

  return (
    <Box sx={{ pb: 8, position: 'relative' }}>
      {/* Summary Cards Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* New Patients Card */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: '#3182CE', color: '#FFFFFF', borderRadius: 3, boxShadow: 2, py: 1 }}>
            <CardContent sx={{ textAlign: 'center', '&:last-child': { pb: 1 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                {totalPatients} ({totalPatients})
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                New Patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Patient Visits Card */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: 'primary.main', color: '#FFFFFF', borderRadius: 3, boxShadow: 2, py: 1 }}>
            <CardContent sx={{ textAlign: 'center', '&:last-child': { pb: 1 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                {totalVisits}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                Patient Visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Total Collections Card */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ bgcolor: '#D69E2E', color: '#FFFFFF', borderRadius: 3, boxShadow: 2, py: 1 }}>
            <CardContent sx={{ textAlign: 'center', '&:last-child': { pb: 1 } }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                Rs. {totalCollections.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
                Collections
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Menu vs Schedule */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 600, py: 1.5, textTransform: 'none' },
          }}
        >
          <Tab label="Menu" />
          <Tab label={`Schedule (${todayCount})`} />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {activeTab === 0 ? (
        // Grid Menu
        <Grid container spacing={2}>
          {gridMenuItems.map((item) => (
            <Grid key={item.text} size={{ xs: 6, sm: 4, md: 3, lg: 2.18 }}>
              <Card
                sx={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  py: 1.5,
                  transition: 'all 0.2s',
                  border: '1px solid #E2E8F0',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderColor: 'primary.light',
                  },
                }}
                onClick={() => {
                  if (item.path) navigate(item.path);
                  else if (item.action) item.action();
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: { xs: '10px !important', sm: '16px !important' } }}>
                  {item.icon}
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                    {item.text}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Schedule List
        <Paper sx={{ p: 2, boxShadow: 1, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontFamily: 'Outfit' }}>
            Today's Scheduled Appointments
          </Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Skeleton height={50} />
              <Skeleton height={50} />
            </Box>
          ) : todayAppointmentsList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">No appointments scheduled for today.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todayAppointmentsList.map((appt: any) => (
                    <TableRow key={appt.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{appt.appointment_time}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{appt.patient_name}</TableCell>
                      <TableCell>{appt.consulting_doctor}</TableCell>
                      <TableCell>{appt.appointment_reason || 'Regular checkup'}</TableCell>
                      <TableCell>
                        <Chip
                          label={appt.status}
                          size="small"
                          color={appt.status === 'COMPLETED' ? 'success' : appt.status === 'SCHEDULED' ? 'primary' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Floating Action Button (FAB) Custom Actions Menu */}
      <Box sx={{ position: 'fixed', bottom: 32, right: 24, zIndex: 1100 }}>
        {/* Backdrop overlay when open */}
        {fabOpen && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1090,
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => setFabOpen(false)}
          />
        )}
        <Stack
          spacing={1.5}
          sx={{
            position: 'absolute',
            bottom: 72,
            right: 0,
            zIndex: 1100,
            display: fabOpen ? 'flex' : 'none',
            alignItems: 'flex-end',
          }}
        >
          {quickActions.map((action) => (
            <Stack key={action.name} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  bgcolor: 'background.paper',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  boxShadow: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {action.name}
                </Typography>
              </Box>
              <Fab
                size="small"
                color="default"
                sx={{ bgcolor: '#FFFFFF', '&:hover': { bgcolor: '#F1F5F9' } }}
                onClick={() => {
                  action.action();
                  setFabOpen(false);
                }}
              >
                {action.icon}
              </Fab>
            </Stack>
          ))}
        </Stack>
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            width: 56,
            height: 56,
            zIndex: 1100,
            transform: fabOpen ? 'rotate(45deg)' : 'none',
            transition: 'transform 0.2s',
          }}
          onClick={() => setFabOpen(!fabOpen)}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Trial Expiry Banner */}
      {subscription?.status === 'TRIAL' && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: '#F0FDFA',
            borderTop: '1px solid',
            borderColor: 'primary.light',
            py: 1,
            textAlign: 'center',
            cursor: 'pointer',
            zIndex: 1000,
          }}
          onClick={() => navigate('/subscription')}
        >
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
            Trial period will expire on {subscription?.next_billing_date || 'soon'}.{' '}
            <span style={{ textDecoration: 'underline' }}>Click here to Upgrade</span>
          </Typography>
        </Paper>
      )}

      {/* Accounts Dialog */}
      <AccountsDialog open={accountsOpen} onClose={() => setAccountsOpen(false)} />
    </Box>
  );
};

// ==========================================
// Parent Dashboard Selector
// ==========================================
export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    const AdminDashboardLazy = React.lazy(() => import('./Admin/AdminDashboard'));
    return (
      <React.Suspense fallback={<CircularProgress />}>
        <AdminDashboardLazy />
      </React.Suspense>
    );
  }

  return <ClinicOwnerDashboard />;
};

export default Dashboard;
