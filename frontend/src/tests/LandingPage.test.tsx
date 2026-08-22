import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingPage from '../pages/Landing/LandingPage';
import { useAuth } from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  default: null,
}));

describe('LandingPage Component (Bolt Frontend)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      subscription: null,
      isAuthenticated: false,
      loading: false,
      impersonatedClinic: null,
      setImpersonatedClinic: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });
  });

  const renderLandingPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render the brand header and main hero value proposition', () => {
    renderLandingPage();

    // Check brand logo
    expect(screen.getAllByText(/Dent/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Flow/i)[0]).toBeInTheDocument();

    // Check main value proposition headline
    expect(screen.getAllByText(/The Next-Generation/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/AI Practice Management/i)[0]).toBeInTheDocument();
  });

  it('should render public action buttons (Log In, Register)', () => {
    renderLandingPage();

    expect(screen.getAllByRole('button', { name: /Log In/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Register/i })[0]).toBeInTheDocument();
  });

  it('should show "Open Dashboard" when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { username: 'dr_sharma', role: 'CLINIC_OWNER' } as any,
      subscription: { status: 'ACTIVE' } as any,
      isAuthenticated: true,
      loading: false,
      impersonatedClinic: null,
      setImpersonatedClinic: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });

    renderLandingPage();

    expect(screen.getByRole('button', { name: /Open Dashboard/i })).toBeInTheDocument();
  });

  it('should allow switching between feature tabs', async () => {
    renderLandingPage();

    // Check tabs
    const affordableTab = screen.getByRole('button', { name: /Affordable & Efficient/i });
    fireEvent.click(affordableTab);

    expect(await screen.findByText(/Powerful clinic software without the enterprise price tag/i)).toBeInTheDocument();

    const billingTab = screen.getByRole('button', { name: /Billing & Insurance/i });
    fireEvent.click(billingTab);

    expect(await screen.findByText(/Fast claims, split payments, instant receipts/i)).toBeInTheDocument();
  });

  it('should allow switching between practice solution tiers', async () => {
    renderLandingPage();

    const soloButtons = screen.getAllByText(/Solo Practitioners/i);
    fireEvent.click(soloButtons[0]);

    const descriptions = await screen.findAllByText(/Everything a single-chair practice needs/i);
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it('should navigate to /login when Log In is clicked', () => {
    renderLandingPage();

    const loginBtns = screen.getAllByRole('button', { name: /Log In/i });
    fireEvent.click(loginBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to /register when Register is clicked', () => {
    renderLandingPage();

    const registerBtns = screen.getAllByRole('button', { name: /Register/i });
    fireEvent.click(registerBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });
});
