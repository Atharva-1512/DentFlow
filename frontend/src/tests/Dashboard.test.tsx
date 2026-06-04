import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../pages/Dashboard';
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

describe('Dashboard Component Router', () => {
  let queryClient: QueryClient;
  const mockSetImpersonatedClinic = vi.fn();

  const mockOwnerUser = {
    id: 'user-1',
    username: 'owner_bob',
    email: 'bob@clinic.com',
    first_name: 'Bob',
    last_name: 'Owner',
    role: 'CLINIC_OWNER' as const,
    clinic: {
      id: 'clinic-1',
      name: 'Bob Dental Care',
      slug: 'bob-dental',
      is_active: true,
      created_at: '2026-06-04T12:00:00Z',
    },
    created_at: '2026-06-04T12:00:00Z',
  };

  const mockAdminUser = {
    id: 'user-admin',
    username: 'super_admin',
    email: 'admin@dentflow.com',
    first_name: 'Super',
    last_name: 'Admin',
    role: 'SUPER_ADMIN' as const,
    clinic: null,
    created_at: '2026-06-04T12:00:00Z',
    all_clinics: [
      {
        id: 'clinic-target-1',
        name: 'Target Clinic Alpha',
        slug: 'target-alpha',
        is_active: true,
        created_at: '2026-06-01T10:00:00Z',
      },
      {
        id: 'clinic-target-2',
        name: 'Target Clinic Beta',
        slug: 'target-beta',
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
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // 1. Clinic Owner View test
  it('should render Clinic Owner dashboard cards and table details when role is CLINIC_OWNER', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockOwnerUser,
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

    // Mock API requests
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/patients/') {
        return {
          data: {
            count: 42,
            results: [
              {
                id: 'p1',
                full_name: 'John Doe',
                age: 30,
                gender: 'M',
                mobile_number: '9876543210',
                created_at: '2026-06-04T12:00:00Z',
              },
            ],
          },
        };
      }
      if (url.includes('/appointments/?today=true')) {
        return {
          data: {
            count: 3,
            results: [
              {
                id: 'a1',
                appointment_time: '10:00 AM',
                consulting_doctor: 'Dr. House',
                appointment_type_display: 'Consultation',
                status: 'SCHEDULED',
              },
            ],
          },
        };
      }
      if (url.includes('/appointments/?upcoming=true')) {
        return {
          data: {
            count: 10,
            results: [],
          },
        };
      }
      return { data: {} };
    });

    renderDashboard();

    // Verify Title
    expect(screen.getByText('Clinic Overview')).toBeInTheDocument();

    // Verify Cards and loading outcomes
    expect(await screen.findByText('42')).toBeInTheDocument(); // Patients
    expect(await screen.findByText('3')).toBeInTheDocument();  // Today's appts
    expect(await screen.findByText('10')).toBeInTheDocument(); // Upcoming appts

    // Verify List content
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Dr. House')).toBeInTheDocument();
  });

  // 2. Super Admin View test
  it('should render Super Admin dashboard stats and clinic actions when role is SUPER_ADMIN', async () => {
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

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/accounts/me/') {
        return { data: mockAdminUser };
      }
      return { data: {} };
    });

    renderDashboard();

    // Verify Title
    expect(screen.getByText('System Administration Dashboard')).toBeInTheDocument();

    // Verify Cards
    expect(await screen.findByText('2')).toBeInTheDocument(); // Total Clinics
    const ones = await screen.findAllByText('1');
    expect(ones.length).toBe(3); // Active, Trial, and Expired stats all show 1

    // Verify Clinics listed
    expect(screen.getByText('Target Clinic Alpha')).toBeInTheDocument();
    expect(screen.getByText('Target Clinic Beta')).toBeInTheDocument();

    // Impersonation trigger
    const impersonateBtn = document.getElementById('impersonate-clinic-target-1');
    expect(impersonateBtn).toBeInTheDocument();
    fireEvent.click(impersonateBtn!);

    expect(mockSetImpersonatedClinic).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Target Clinic Alpha' })
    );
  });
});
