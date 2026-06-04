import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import api, { impersonationContext } from '../services/api';
import { setTokens, clearTokens } from '../utils/token';
import { toastRef } from '../context/ToastContext';

// Helper component to access useAuth context value in tests
let currentAuth: ReturnType<typeof useAuth> | null = null;
const AuthConsumer = () => {
  currentAuth = useAuth();
  return null;
};

describe('AuthContext & AuthProvider', () => {
  const mockOwnerUser = {
    id: 'user-1',
    username: 'owner_bob',
    email: 'bob@clinic.com',
    role: 'CLINIC_OWNER',
    clinic: {
      id: 'clinic-1',
      name: 'Bob Dental Care',
      slug: 'bob-dental',
      is_active: true,
    },
  };

  const mockAdminUser = {
    id: 'user-admin',
    username: 'super_admin',
    email: 'admin@dentflow.com',
    role: 'SUPER_ADMIN',
    clinic: null,
  };

  const mockSubscription = {
    id: 'sub-1',
    status: 'ACTIVE',
    trial_days_remaining: 0,
    next_billing_date: '2026-12-31',
    grace_period_end_date: null,
    plan: {
      name: 'Premium',
      price: 19900,
      billing_cycle: 'MONTHLY',
    },
  };

  beforeEach(() => {
    localStorage.clear();
    clearTokens();
    impersonationContext.clinicId = null;
    currentAuth = null;
    vi.restoreAllMocks();
    vi.spyOn(toastRef, 'show').mockImplementation(() => {});
  });

  // Test 1: Start as unauthenticated when no token exists
  it('should initialize with loading=false and user=null when no tokens exist', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Initial state is loading=true, then checks token, and sets loading=false
    await waitFor(() => {
      expect(currentAuth?.loading).toBe(false);
    });

    expect(currentAuth?.user).toBeNull();
    expect(currentAuth?.subscription).toBeNull();
    expect(currentAuth?.isAuthenticated).toBe(false);
  });

  // Test 2: Restore session on mount if token exists
  it('should restore owner user profile and subscription on mount if tokens exist', async () => {
    setTokens('my-access', 'my-refresh');

    const getSpy = vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/accounts/me/') {
        return { data: mockOwnerUser };
      }
      if (url === '/subscriptions/current/') {
        return { data: mockSubscription };
      }
      return { data: {} };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentAuth?.loading).toBe(false);
    });

    expect(getSpy).toHaveBeenCalledWith('/accounts/me/');
    expect(getSpy).toHaveBeenCalledWith('/subscriptions/current/');
    expect(currentAuth?.user).toEqual(mockOwnerUser);
    expect(currentAuth?.subscription).toEqual(mockSubscription);
    expect(currentAuth?.isAuthenticated).toBe(true);
  });

  // Test 3: Restore session for Admin (no subscription call)
  it('should restore admin profile on mount but NOT call subscription endpoint', async () => {
    setTokens('my-access', 'my-refresh');

    const getSpy = vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/accounts/me/') {
        return { data: mockAdminUser };
      }
      return { data: {} };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentAuth?.loading).toBe(false);
    });

    expect(getSpy).toHaveBeenCalledWith('/accounts/me/');
    expect(getSpy).not.toHaveBeenCalledWith('/subscriptions/current/');
    expect(currentAuth?.user).toEqual(mockAdminUser);
    expect(currentAuth?.subscription).toBeNull();
  });

  // Test 4: Login flow
  it('should support logging in successfully and fetching profiles', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: { access: 'new-acc', refresh: 'new-ref' },
    });

    const getSpy = vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/accounts/me/') {
        return { data: mockOwnerUser };
      }
      if (url === '/subscriptions/current/') {
        return { data: mockSubscription };
      }
      return { data: {} };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentAuth?.loading).toBe(false);
    });

    await act(async () => {
      await currentAuth?.login('owner_bob', 'password123');
    });

    expect(postSpy).toHaveBeenCalledWith('/token/', { username: 'owner_bob', password: 'password123' });
    expect(getSpy).toHaveBeenCalledWith('/accounts/me/');
    expect(getSpy).toHaveBeenCalledWith('/subscriptions/current/');
    expect(currentAuth?.user).toEqual(mockOwnerUser);
    expect(currentAuth?.subscription).toEqual(mockSubscription);
  });

  // Test 5: Logout flow
  it('should clear everything on logout', async () => {
    setTokens('acc', 'ref');
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/accounts/me/') {
        return { data: mockOwnerUser };
      }
      if (url === '/subscriptions/current/') {
        return { data: mockSubscription };
      }
      return { data: {} };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentAuth?.loading).toBe(false);
    });

    act(() => {
      currentAuth?.logout();
    });

    expect(currentAuth?.user).toBeNull();
    expect(currentAuth?.subscription).toBeNull();
    expect(currentAuth?.isAuthenticated).toBe(false);
    expect(impersonationContext.clinicId).toBeNull();
  });

  // Test 6: Super Admin Impersonation
  it('should support clinic impersonation, loading clinic subscription, and clearing it', async () => {
    setTokens('admin-acc', 'admin-ref');
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/accounts/me/') {
        return { data: mockAdminUser };
      }
      if (url === '/subscriptions/current/') {
        return { data: mockSubscription };
      }
      return { data: {} };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(currentAuth?.loading).toBe(false);
    });

    const targetClinic = {
      id: 'clinic-target-id',
      name: 'Impersonated Clinic',
      slug: 'impersonated-slug',
      is_active: true,
    };

    // Impersonate
    await act(async () => {
      await currentAuth?.setImpersonatedClinic(targetClinic);
    });

    expect(impersonationContext.clinicId).toBe('clinic-target-id');
    expect(currentAuth?.impersonatedClinic).toEqual(targetClinic);
    expect(currentAuth?.subscription).toEqual(mockSubscription);

    // Stop impersonation
    await act(async () => {
      await currentAuth?.setImpersonatedClinic(null);
    });

    expect(impersonationContext.clinicId).toBeNull();
    expect(currentAuth?.impersonatedClinic).toBeNull();
    expect(currentAuth?.subscription).toBeNull(); // restored to null for Super Admin
  });
});
