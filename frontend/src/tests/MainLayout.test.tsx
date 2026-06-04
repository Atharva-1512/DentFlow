import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useAuth } from '../context/AuthContext';

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  default: null,
}));

describe('MainLayout Component (App Shell & Navigation)', () => {
  const mockOwnerUser = {
    id: 'user-1',
    username: 'owner_bob',
    email: 'bob@clinic.com',
    role: 'CLINIC_OWNER' as const,
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
    role: 'SUPER_ADMIN' as const,
    clinic: null,
  };

  const mockClinic = {
    id: 'clinic-target',
    name: 'Impersonated Dental Lab',
    slug: 'target-clinic',
    is_active: true,
  };

  const mockLogout = vi.fn();
  const mockSetImpersonatedClinic = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogout.mockReset();
    mockSetImpersonatedClinic.mockReset();
  });

  const renderLayout = () => {
    return render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>
    );
  };

  // 1. Clinic Owner View
  it('should render clinic owner navigation items correctly and exclude admin items', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockOwnerUser,
      subscription: null,
      isAuthenticated: true,
      loading: false,
      impersonatedClinic: null,
      setImpersonatedClinic: mockSetImpersonatedClinic,
      login: vi.fn(),
      logout: mockLogout,
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });

    renderLayout();

    // Verify header title
    expect(screen.getByText('DentFlow')).toBeInTheDocument();

    // Verify Clinic Owner options are visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();

    // Verify Super Admin options are hidden
    expect(screen.queryByText('Clinics')).not.toBeInTheDocument();
    expect(screen.queryByText('Subscriptions Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('System Dashboard')).not.toBeInTheDocument();

    // Impersonation banner must be hidden
    expect(screen.queryByText(/Viewing clinic as owner:/)).not.toBeInTheDocument();
  });

  // 2. Super Admin View (No Impersonation)
  it('should render admin navigation items and exclude owner-specific items when not impersonating', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      subscription: null,
      isAuthenticated: true,
      loading: false,
      impersonatedClinic: null,
      setImpersonatedClinic: mockSetImpersonatedClinic,
      login: vi.fn(),
      logout: mockLogout,
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });

    renderLayout();

    // Verify Admin options are visible
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clinics')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions Overview')).toBeInTheDocument();
    expect(screen.getByText('System Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();

    // Verify Owner-specific items are hidden
    expect(screen.queryByText('Patients')).not.toBeInTheDocument();
    expect(screen.queryByText("Today's Appointments")).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming Appointments')).not.toBeInTheDocument();
    expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
    expect(screen.queryByText('Subscription')).not.toBeInTheDocument();

    // Impersonation banner must be hidden
    expect(screen.queryByText(/Viewing clinic as owner:/)).not.toBeInTheDocument();
  });

  // 3. Super Admin Impersonating a Clinic
  it('should render owner navigation items and show active banner when admin is impersonating', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      subscription: null,
      isAuthenticated: true,
      loading: false,
      impersonatedClinic: mockClinic,
      setImpersonatedClinic: mockSetImpersonatedClinic,
      login: vi.fn(),
      logout: mockLogout,
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });

    renderLayout();

    // Impersonation banner must be visible
    expect(screen.getByText('Viewing clinic as owner: Impersonated Dental Lab')).toBeInTheDocument();

    // Owner navigation options must be visible to let admin test owner dashboards
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Subscription')).toBeInTheDocument();

    // Admin options must be hidden during active clinic owner impersonation
    expect(screen.queryByText('Clinics')).not.toBeInTheDocument();
    expect(screen.queryByText('Subscriptions Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('System Dashboard')).not.toBeInTheDocument();

    // Trigger exit impersonation
    const exitBtn = screen.getByText('Exit Impersonation');
    fireEvent.click(exitBtn);
    expect(mockSetImpersonatedClinic).toHaveBeenCalledWith(null);
  });

  // 4. Logout trigger
  it('should trigger logout when clicking sidebar logout option', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockOwnerUser,
      subscription: null,
      isAuthenticated: true,
      loading: false,
      impersonatedClinic: null,
      setImpersonatedClinic: mockSetImpersonatedClinic,
      login: vi.fn(),
      logout: mockLogout,
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });

    renderLayout();

    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalled();
  });
});
