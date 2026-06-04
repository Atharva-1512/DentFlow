import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard, RoleGuard, SubscriptionGuard } from '../routes/guards';
import { useAuth } from '../context/AuthContext';

// Mock useAuth hook
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  default: null,
}));

describe('Route Guards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderGuard = (guardElement: React.ReactNode) => {
    return render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/subscription" element={<div>Subscription Page</div>} />
          <Route element={guardElement}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  describe('AuthGuard', () => {
    it('should show CircularProgress spinner when auth state is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: true,
        isAuthenticated: false,
        user: null,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<AuthGuard />);

      // CircularProgress is represented by a progressbar role in MUI
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to /login when user is not authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: false,
        user: null,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<AuthGuard />);

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow access to child routes when user is authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: {} as any,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<AuthGuard />);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('RoleGuard', () => {
    it('should redirect to /dashboard when user role is not allowed', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'CLINIC_OWNER' } as any,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<RoleGuard allowedRoles={['SUPER_ADMIN']} />);

      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should allow access when user role is allowed', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'SUPER_ADMIN' } as any,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<RoleGuard allowedRoles={['SUPER_ADMIN']} />);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
    });
  });

  describe('SubscriptionGuard', () => {
    it('should bypass checks and allow access if the user is a SUPER_ADMIN', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'SUPER_ADMIN' } as any,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<SubscriptionGuard />);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect to /subscription if subscription context is missing for Clinic Owner', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'CLINIC_OWNER' } as any,
        subscription: null,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<SubscriptionGuard />);

      expect(screen.getByText('Subscription Page')).toBeInTheDocument();
    });

    it('should allow access if subscription status is TRIAL or ACTIVE', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'CLINIC_OWNER' } as any,
        subscription: { status: 'ACTIVE' } as any,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<SubscriptionGuard />);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should allow access if subscription is PAYMENT_DUE but grace period is active', () => {
      // Set grace period end date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'CLINIC_OWNER' } as any,
        subscription: {
          status: 'PAYMENT_DUE',
          grace_period_end_date: tomorrow.toISOString(),
        } as any,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<SubscriptionGuard />);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect to /subscription if subscription is PAYMENT_DUE but grace period has expired', () => {
      // Set grace period end date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'CLINIC_OWNER' } as any,
        subscription: {
          status: 'PAYMENT_DUE',
          grace_period_end_date: yesterday.toISOString(),
        } as any,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<SubscriptionGuard />);

      expect(screen.getByText('Subscription Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to /subscription if subscription status is EXPIRED or CANCELLED', () => {
      vi.mocked(useAuth).mockReturnValue({
        loading: false,
        isAuthenticated: true,
        user: { role: 'CLINIC_OWNER' } as any,
        subscription: { status: 'EXPIRED' } as any,
        impersonatedClinic: null,
        setImpersonatedClinic: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        fetchCurrentSubscription: vi.fn(),
      });

      renderGuard(<SubscriptionGuard />);

      expect(screen.getByText('Subscription Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
