import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Subscription from '../pages/Subscription';
import api from '../services/api';

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  impersonationContext: { clinicId: null },
}));

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', username: 'owner_bob', email: 'bob@clinic.com' },
  }),
}));

// Mock useToast
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const mockSubscriptionTrial = {
  id: 'sub-1',
  clinic: 'clinic-1',
  plan: {
    id: 'plan-1',
    name: 'Starter Plan',
    code: 'starter',
    price: 2999.00,
    billing_cycle: 'monthly',
    is_active: true,
  },
  status: 'TRIAL',
  trial_start_date: '2026-06-01',
  trial_end_date: '2026-06-08T00:00:00Z',
  start_date: null,
  next_billing_date: null,
  grace_period_end_date: null,
  cancelled_at: null,
  trial_days_remaining: 5,
};

const mockSubscriptionActive = {
  ...mockSubscriptionTrial,
  status: 'ACTIVE',
  trial_days_remaining: 0,
  next_billing_date: '2026-07-01',
};

const mockCheckoutSessionMock = {
  checkout_url: null,
  razorpay_subscription_id: 'sub_mock_12345',
  razorpay_key_id: 'rzp_test_placeholder_key',
  amount: 2999.00,
  plan_name: 'Starter Plan',
  is_mock: true,
  detail: 'Mock subscription checkout initialized.',
};

describe('Subscription Billing Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          retryDelay: 0,
        },
      },
    });
  });

  const renderSubscription = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Subscription />
      </QueryClientProvider>
    );
  };

  it('renders billing page title and plan options', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSubscriptionTrial });
    renderSubscription();

    expect(await screen.findByText('Subscription & Billing')).toBeInTheDocument();
    expect(screen.getAllByText('Starter Plan')[0]).toBeInTheDocument();
    expect(screen.getByText('2,999 INR')).toBeInTheDocument();
  });

  it('renders free trial stats accurately', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSubscriptionTrial });
    renderSubscription();

    expect(await screen.findByText('Free Trial Active')).toBeInTheDocument();
    expect(screen.getByText('5 Days')).toBeInTheDocument();
    expect(screen.getByText('Subscribe Now')).toBeInTheDocument();
  });

  it('renders active subscription stats accurately', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockSubscriptionActive });
    renderSubscription();

    expect(await screen.findByText('Active Subscription')).toBeInTheDocument();
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('Subscribed')).toBeDisabled();
    expect(screen.getByText('Cancel Renewal')).toBeInTheDocument();
  });

  it('triggers mock checkout dialog and simulates payment success', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockSubscriptionTrial });
    vi.mocked(api.post).mockImplementation(async (url: string, _data?: any) => {
      if (url.includes('/create/')) {
        return { data: mockCheckoutSessionMock };
      }
      if (url.includes('/webhooks/razorpay/')) {
        return { data: { status: 'processed' } };
      }
      return { data: {} };
    });

    renderSubscription();

    // Click subscribe to open mock payment overlay
    const subscribeBtn = await screen.findByText('Subscribe Now');
    fireEvent.click(subscribeBtn);

    // Verify mock dialog elements show
    expect(await screen.findByText('Mock Sandbox Checkout')).toBeInTheDocument();
    expect(screen.getByText('sub_mock_12345')).toBeInTheDocument();

    // Trigger payment capture simulation
    const simulateBtn = screen.getByText('Simulate Sandbox Payment');
    fireEvent.click(simulateBtn);

    // Check webhook and current update queries triggered
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/webhooks/razorpay/', expect.any(Object));
      expect(mockCheckoutOpenStateClosed()).toBe(true);
    });
  });

  it('opens cancel verification dialog and confirms cancellation', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockSubscriptionActive });
    vi.mocked(api.post).mockResolvedValueOnce({ data: { detail: 'Cancelled' } });

    renderSubscription();

    // Click cancel button
    const cancelBtn = await screen.findByText('Cancel Renewal');
    fireEvent.click(cancelBtn);

    // Verify verification dialog displays
    expect(await screen.findByText('Cancel Subscription Renewal?')).toBeInTheDocument();

    // Confirm cancel action
    const confirmBtn = screen.getByText('Confirm Cancellation');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/subscriptions/cancel/');
    });
  });

  it('renders error alert on info fetch failures', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    renderSubscription();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  // Helper to assert modal overlay closed
  const mockCheckoutOpenStateClosed = () => {
    return screen.queryByText('Mock Sandbox Checkout') === null;
  };
});
