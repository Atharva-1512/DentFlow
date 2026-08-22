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
  allowedRoles: ('SUPER_ADMIN' | 'CLINIC_OWNER' | 'PATIENT')[];
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
  return <Outlet />;
};
export default AuthGuard;
