import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Alert,
  Chip,
  Avatar,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  EventNote as EventIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { calculateAge } from '../utils/date';
import type { Patient, Appointment } from '../types';
import AdminDashboard from './Admin/AdminDashboard';

// ==========================================
// Clinic Owner Dashboard Component
// ==========================================
const ClinicOwnerDashboard: React.FC = () => {
  // 1. Fetch total patients
  const {
    data: patientsData,
    isLoading: loadingPatients,
    error: patientsError,
  } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await api.get('/patients/');
      return res.data; // PaginatedResponse<Patient>
    },
  });

  // 2. Fetch today's appointments
  const {
    data: todayApptsData,
    isLoading: loadingToday,
    error: todayError,
  } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: async () => {
      const res = await api.get('/appointments/?today=true');
      return res.data; // PaginatedResponse<Appointment>
    },
  });

  // 3. Fetch upcoming appointments
  const {
    data: upcomingApptsData,
    isLoading: loadingUpcoming,
    error: upcomingError,
  } = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: async () => {
      const res = await api.get('/appointments/?upcoming=true');
      return res.data; // PaginatedResponse<Appointment>
    },
  });

  const isLoading = loadingPatients || loadingToday || loadingUpcoming;
  const isError = patientsError || todayError || upcomingError;

  if (isError) {
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        Failed to load dashboard metrics. Please reload the page or contact support.
      </Alert>
    );
  }

  const totalPatients = patientsData?.count ?? 0;
  const todayCount = todayApptsData?.count ?? 0;
  const upcomingCount = upcomingApptsData?.count ?? 0;
  const recentPatientsList = patientsData?.results?.slice(0, 5) ?? [];
  const todayAppointmentsList = todayApptsData?.results?.slice(0, 5) ?? [];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 3 }}>
        Clinic Overview
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderLeft: '4px solid #2563EB', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Total Patients
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={60} /> : totalPatients}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                <PeopleIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderLeft: '4px solid #10B981', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Today's Appointments
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={60} /> : todayCount}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                <CalendarIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ borderLeft: '4px solid #F59E0B', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Upcoming Schedule
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={60} /> : upcomingCount}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main', width: 48, height: 48 }}>
                <EventIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Tables */}
      <Grid container spacing={3}>
        {/* Today's Appointments Table */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: '100%', boxShadow: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontFamily: 'Outfit' }}>
              Today's Schedule
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Box>
            ) : todayAppointmentsList.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No appointments scheduled for today.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {todayAppointmentsList.map((appt: Appointment) => (
                      <TableRow key={appt.id}>
                        <TableCell>{appt.appointment_time}</TableCell>
                        <TableCell>{appt.consulting_doctor}</TableCell>
                        <TableCell>{appt.appointment_type_display}</TableCell>
                        <TableCell>
                          <Chip
                            label={appt.status}
                            size="small"
                            color={
                              appt.status === 'COMPLETED'
                                ? 'success'
                                : appt.status === 'SCHEDULED'
                                ? 'primary'
                                : 'error'
                            }
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
        </Grid>

        {/* Recent Patients Table */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: '100%', boxShadow: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontFamily: 'Outfit' }}>
              Recent Patients
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </Box>
            ) : recentPatientsList.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No patients registered yet.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Age</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentPatientsList.map((patient: Patient) => (
                      <TableRow key={patient.id}>
                        <TableCell sx={{ fontWeight: 500 }}>{patient.full_name}</TableCell>
                        <TableCell>
                          {patient.date_of_birth ? calculateAge(patient.date_of_birth) : patient.age}
                        </TableCell>
                        <TableCell>{patient.mobile_number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==========================================
// Parent Route Dashboard Component
// ==========================================
export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return <AdminDashboard />;
  }

  return <ClinicOwnerDashboard />;
};

export default Dashboard;
