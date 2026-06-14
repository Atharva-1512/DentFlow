import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClinicsList from '../pages/Admin/ClinicsList';
import AdminSubscriptions from '../pages/Admin/AdminSubscriptions';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  default: null,
}));

// Mock api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Super Admin Portal Components', () => {
  let queryClient: QueryClient;
  const mockSetImpersonatedClinic = vi.fn();

  const mockAdminUser = {
    id: 'user-admin',
    username: 'super_admin',
    email: 'admin@dentflow.com',
    role: 'SUPER_ADMIN' as const,
    clinic: null,
    all_clinics: [
      {
        id: 'clinic-1',
        name: 'Alpha Dental Care',
        slug: 'alpha-dental',
        is_active: true,
        created_at: '2026-05-01T10:00:00Z',
      },
      {
        id: 'clinic-2',
        name: 'Beta Dental Clinic',
        slug: 'beta-dental',
        is_active: false,
        created_at: '2026-05-01T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockSetImpersonatedClinic.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      subscription: null,
      isAuthenticated: true,
      loading: false,
      impersonatedClinic: null,
      setImpersonatedClinic: mockSetImpersonatedClinic,
      login: vi.fn(),
      logout: vi.fn(),
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });

    vi.mocked(api.get).mockResolvedValue({ data: mockAdminUser });
  });

  describe('ClinicsList Component', () => {
    const renderClinicsList = () => {
      return render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ClinicsList />
          </MemoryRouter>
        </QueryClientProvider>
      );
    };

    it('renders clinic list and responds to search queries', async () => {
      renderClinicsList();

      expect(await screen.findByText('Clinics Overview')).toBeInTheDocument();
      expect(await screen.findByText('Alpha Dental Care')).toBeInTheDocument();
      expect(await screen.findByText('Beta Dental Clinic')).toBeInTheDocument();

      // Search for alpha clinic only
      const searchInput = screen.getByPlaceholderText('Search clinics by name or slug...');
      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      expect(await screen.findByText('Alpha Dental Care')).toBeInTheDocument();
      expect(screen.queryByText('Beta Dental Clinic')).not.toBeInTheDocument();
    });

    it('triggers impersonation and redirects to dashboard on click', async () => {
      renderClinicsList();

      const impersonateBtn = await waitFor(() => {
        const btn = document.getElementById('impersonate-clinic-clinic-1');
        if (!btn) throw new Error('Not ready');
        return btn;
      });
      expect(impersonateBtn).toBeInTheDocument();
      fireEvent.click(impersonateBtn);

      expect(mockSetImpersonatedClinic).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'clinic-1', name: 'Alpha Dental Care' })
      );
    });
  });

  describe('AdminSubscriptions Component', () => {
    const renderAdminSubscriptions = () => {
      return render(
        <QueryClientProvider client={queryClient}>
          <AdminSubscriptions />
        </QueryClientProvider>
      );
    };

    it('renders platform stats and correct MRR calculations', async () => {
      renderAdminSubscriptions();

      expect(await screen.findByText('Subscriptions & Platform Billing')).toBeInTheDocument();

      // Est. MRR (Alpha is active, Beta is expired) -> 1 * 199 = 199 INR
      const mrrElements = await screen.findAllByText('199 INR');
      expect(mrrElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Active Trials')).toBeInTheDocument();
      expect(screen.getByText('Expired Accounts')).toBeInTheDocument();

      // Check status chips in table
      expect(await screen.findByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  describe('AdminDashboard Component', () => {
    const renderAdminDashboard = () => {
      return render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );
    };

    it('renders summary cards and registries', async () => {
      renderAdminDashboard();

      expect(await screen.findByText('System Administration Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Clinics')).toBeInTheDocument();
      expect(screen.getByText('Active Clinics')).toBeInTheDocument();
      expect(screen.getByText('Expired Clinics')).toBeInTheDocument();

      // Table check
      expect(await screen.findByText('Alpha Dental Care')).toBeInTheDocument();
      
      const impersonateBtn = document.getElementById('impersonate-clinic-1');
      expect(impersonateBtn).toBeInTheDocument();
      fireEvent.click(impersonateBtn!);

      expect(mockSetImpersonatedClinic).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'clinic-1' })
      );
    });
  });
});
