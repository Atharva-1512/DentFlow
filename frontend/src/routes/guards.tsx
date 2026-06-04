import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

export const AuthGuard: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated requests to login
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

interface RoleGuardProps {
  allowedRoles: ('SUPER_ADMIN' | 'CLINIC_OWNER')[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user, impersonatedClinic } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a Super Admin is impersonating a clinic, they can access owner views
  const isSuperAdminImpersonating = user.role === 'SUPER_ADMIN' && !!impersonatedClinic;
  const isAllowed = allowedRoles.includes(user.role) || (isSuperAdminImpersonating && allowedRoles.includes('CLINIC_OWNER'));

  if (!isAllowed) {
    // Redirect unauthorized roles back to safe dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const SubscriptionGuard: React.FC = () => {
  const { user, subscription } = useAuth();

  // Super Admins bypass subscription verification checks (impersonation contexts handled dynamically)
  if (user?.role === 'SUPER_ADMIN') {
    return <Outlet />;
  }

  if (!subscription) {
    return <Navigate to="/subscription" replace />;
  }

  const { status, grace_period_end_date } = subscription;

  if (status === 'ACTIVE' || status === 'TRIAL') {
    return <Outlet />;
  }

  if (status === 'PAYMENT_DUE') {
    if (grace_period_end_date && new Date(grace_period_end_date) >= new Date()) {
      return <Outlet />;
    }
  }

  // Redirect expired/cancelled clinics to billing configuration portal
  return <Navigate to="/subscription" replace />;
};
export default AuthGuard;
