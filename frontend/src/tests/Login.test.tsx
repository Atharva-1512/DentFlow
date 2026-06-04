import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../pages/Login';
import { useAuth } from '../context/AuthContext';

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  default: null,
}));

describe('Login Page Component', () => {
  const mockLogin = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogin.mockReset();
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
      login: mockLogin,
      logout: vi.fn(),
      fetchCurrentUser: vi.fn(),
      fetchCurrentSubscription: vi.fn(),
    });
  });

  const renderLogin = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render form fields and submit button', () => {
    renderLogin();

    expect(screen.getByLabelText(/Username or Email/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('should display validation errors when fields are empty', async () => {
    renderLogin();

    const submitBtn = screen.getByRole('button', { name: /Login/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Username or Email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login function with form parameters on successful validation', async () => {
    renderLogin();

    const usernameInput = screen.getByLabelText(/Username or Email/i, { selector: 'input' });
    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'owner_bob' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('owner_bob', 'password123');
    });
  });

  it('should display error alert when API call fails', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: { detail: 'Incorrect credentials error' },
      },
    });

    renderLogin();

    const usernameInput = screen.getByLabelText(/Username or Email/i, { selector: 'input' });
    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' });
    const submitBtn = screen.getByRole('button', { name: /Login/i });

    fireEvent.change(usernameInput, { target: { value: 'wrong_user' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect credentials error');
  });
});
