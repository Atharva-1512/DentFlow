import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import { AuthGuard, RoleGuard } from './guards';
import { Typography, Card, Container, Box, CircularProgress } from '@mui/material';

import LandingPage from '../pages/Landing/LandingPage';

// Import real page components
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import PatientList from '../pages/Patients/PatientList';
import PatientDetail from '../pages/Patients/PatientDetail';
import UnifiedVisitForm from '../pages/Patients/UnifiedVisitForm';
import TodayAppointments from '../pages/Appointments/TodayAppointments';
import UpcomingAppointments from '../pages/Appointments/UpcomingAppointments';
import ClinicSettings from '../pages/ClinicSettings';
import ClinicsList from '../pages/Admin/ClinicsList';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import QuickBill from '../pages/QuickBill';
import Billing from '../pages/Billing';
import Accounts from '../pages/Accounts';
import LabWork from '../pages/LabWork';

// Lazy-loaded Calendar page component
const Calendar = React.lazy(() => import('../pages/Calendar'));

// Placeholder for profile setting component
const ProfilePlaceholder = () => (
  <Container maxWidth="lg">
    <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 3 }}>Profile Settings</Typography>
    <Card sx={{ p: 3 }}><Typography>User Settings Placeholder</Typography></Card>
  </Container>
);

// --- App Router Component ---

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public SaaS Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<LandingPage />} />

      {/* Public / Guest Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Routes Wrapper */}
      <Route element={<AuthGuard />}>
        <Route element={<MainLayout />}>
          {/* Common Dashboard (Role-specific view handled inside component) */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Clinic Owner Only Pages */}
          <Route element={<RoleGuard allowedRoles={['CLINIC_OWNER']} />}>
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/new" element={<UnifiedVisitForm />} />
            <Route path="/quick-bill" element={<QuickBill />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/lab-work" element={<LabWork />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/appointments/today" element={<TodayAppointments />} />
            <Route path="/appointments/upcoming" element={<UpcomingAppointments />} />
            <Route path="/calendar" element={
              <React.Suspense fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                  <CircularProgress />
                </Box>
              }>
                <Calendar />
              </React.Suspense>
            } />
            <Route path="/settings" element={<ClinicSettings />} />
          </Route>

          {/* Super Admin Only Administration Pages */}
          <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="/admin/clinics" element={<ClinicsList />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* User Profile Page (Common) */}
          <Route path="/profile" element={<ProfilePlaceholder />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
