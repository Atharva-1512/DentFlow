import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  CreditCard as CardIcon,
  Cancel as CancelIcon,
  CalendarToday as DateIcon,
  AccessTime as TrialIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import {
  useSubscription,
  useCreateSubscription,
  useCancelSubscription,
  useSimulateWebhook,
} from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
console.log('MUI IMPORTS CHECK:', {
  Box: !!Box,
  Typography: !!Typography,
  Paper: !!Paper,
  Grid: !!Grid,
  Card: !!Card,
  CardContent: !!CardContent,
  CardActions: !!CardActions,
  Button: !!Button,
  Chip: !!Chip,
  CircularProgress: !!CircularProgress,
  Alert: !!Alert,
  Divider: !!Divider,
  List: !!List,
  ListItem: !!ListItem,
  ListItemIcon: !!ListItemIcon,
  ListItemText: !!ListItemText,
  Dialog: !!Dialog,
  DialogTitle: !!DialogTitle,
  DialogContent: !!DialogContent,
  DialogContentText: !!DialogContentText,
  DialogActions: !!DialogActions,
});

console.log('ICONS IMPORTS CHECK:', {
  CheckIcon: !!CheckIcon,
  CardIcon: !!CardIcon,
  CancelIcon: !!CancelIcon,
  DateIcon: !!DateIcon,
  TrialIcon: !!TrialIcon,
  PaymentIcon: !!PaymentIcon,
  SecurityIcon: !!SecurityIcon,
});

export const Subscription: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Queries & Mutations
  const { data: subscription, isLoading, error, refetch } = useSubscription();
  const createSubscription = useCreateSubscription();
  const cancelSubscription = useCancelSubscription();
  const simulateWebhook = useSimulateWebhook();

  // State management
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [mockCheckoutOpen, setMockCheckoutOpen] = useState(false);
  const [mockSessionData, setMockSessionData] = useState<any>(null);

  // Status mapping colors
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Active Subscription', color: 'success' as const, variant: 'filled' as const };
      case 'TRIAL':
        return { label: 'Free Trial Active', color: 'primary' as const, variant: 'outlined' as const };
      case 'PAYMENT_DUE':
        return { label: 'Payment Due', color: 'warning' as const, variant: 'filled' as const };
      case 'EXPIRED':
        return { label: 'Not Subscribed', color: 'error' as const, variant: 'filled' as const };
      case 'CANCELLED':
        return { label: 'Cancelled (Grace/Pending End)', color: 'default' as const, variant: 'outlined' as const };
      default:
        return { label: 'Unknown', color: 'default' as const, variant: 'outlined' as const };
    }
  };

  // Dynamically load Razorpay SDK script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Initiate Subscribe/Renewal Checkout session
  const handleSubscribe = async (planCode: string) => {
    try {
      const data = await createSubscription.mutateAsync(planCode);
      
      // If it's a mock checkout environment (DEBUG=True without API keys)
      if (data.is_mock) {
        setMockSessionData(data);
        setMockCheckoutOpen(true);
        showToast('Mock checkout session initialized in sandbox.', 'info');
        return;
      }

      // Real checkout implementation
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showToast('Failed to load payment gateway SDK. Please try again.', 'error');
        return;
      }

      const options = {
        key: data.razorpay_key_id,
        subscription_id: data.razorpay_subscription_id,
        name: 'DentFlow SaaS',
        description: `${data.plan_name} Subscription`,
        handler: async (_response: any) => {
          showToast('Payment captures successful. Processing activation...', 'success');
          // Wait for webhook update and reload from backend APIs
          setTimeout(() => {
            refetch();
          }, 1500);
        },
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563EB',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to initialize subscription checkout.', 'error');
    }
  };

  // Simulate mock payment webhook capture event locally
  const handleSimulatePayment = async () => {
    if (!mockSessionData) return;
    try {
      const mockEventId = 'evt_mock_' + Math.random().toString(36).substring(7);
      await simulateWebhook.mutateAsync({
        id: mockEventId,
        event: 'payment.captured',
        payload: {
          payload: {
            subscription: {
              entity: {
                id: mockSessionData.razorpay_subscription_id,
              },
            },
          },
        },
      });
      setMockCheckoutOpen(false);
      setMockSessionData(null);
      showToast('Mock payment captured successfully. Plan is now ACTIVE!', 'success');
    } catch (err: any) {
      showToast('Failed to simulate webhook payment capture.', 'error');
    }
  };

  // Cancel renewal of subscription
  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync();
      setCancelDialogOpen(false);
      showToast('Subscription cancelled successfully.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to cancel subscription.', 'error');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={80} thickness={4} />
      </Box>
    );
  }

  if (error || !subscription) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        Failed to retrieve subscription info. Please reload the page.
      </Alert>
    );
  }

  const renderPlanCard = (planCode: string, planName: string, priceText: string, cycleText: string, isPopular = false) => {
    const isCurrentPlan = subscription.plan.code === planCode;
    const isSubscribed = (subscription.status === 'ACTIVE' || subscription.status === 'CANCELLED' || subscription.status === 'PAYMENT_DUE') && isCurrentPlan;

    return (
      <Card sx={{ height: '100%', boxShadow: 2, display: 'flex', flexDirection: 'column', borderRadius: 2, border: isSubscribed ? '2px solid' : '1px solid', borderColor: isSubscribed ? 'primary.main' : 'divider' }}>
        <CardContent sx={{ p: 3, flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                {planName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Perfect for individual practices and small clinics
              </Typography>
            </Box>
            {isPopular && <Chip label="Popular" color="primary" size="small" sx={{ fontWeight: 600 }} />}
            {isSubscribed && <Chip label="Current Plan" color="success" size="small" sx={{ fontWeight: 600 }} />}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', my: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
              {priceText}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              {cycleText}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <List sx={{ py: 0 }}>
            <ListItem disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
              <ListItemText primary={<Typography variant="body2">Unlimited Patient Registrations</Typography>} />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
              <ListItemText primary={<Typography variant="body2">Visual Clinic Calendar & Schedule</Typography>} />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
              <ListItemText primary={<Typography variant="body2">Visits & Medical Timelines logs</Typography>} />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="success" fontSize="small" /></ListItemIcon>
              <ListItemText primary={<Typography variant="body2">Secure HIPAA compliant isolation</Typography>} />
            </ListItem>
          </List>
        </CardContent>

        <CardActions sx={{ p: 3, pt: 0 }}>
          {isSubscribed ? (
            subscription.status === 'ACTIVE' ? (
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button fullWidth variant="outlined" color="primary" disabled startIcon={<CheckIcon />}>
                  Subscribed
                </Button>
                <Button
                  id="cancel-subscription-btn"
                  fullWidth
                  variant="text"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel Renewal
                </Button>
              </Box>
            ) : subscription.status === 'CANCELLED' ? (
              <Button
                id="renew-subscription-btn"
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => handleSubscribe(planCode)}
                loading={createSubscription.isPending}
              >
                Re-Subscribe
              </Button>
            ) : (
              <Button
                id="renew-subscription-btn"
                fullWidth
                variant="contained"
                color="warning"
                onClick={() => handleSubscribe(planCode)}
                loading={createSubscription.isPending}
              >
                Pay Outstanding
              </Button>
            )
          ) : (
            <Button
              id={`subscribe-btn-${planCode}`}
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleSubscribe(planCode)}
              loading={createSubscription.isPending}
            >
              {(subscription.status === 'EXPIRED' || subscription.status === 'PAYMENT_DUE' || subscription.status === 'TRIAL') ? 'Subscribe Now' : 'Switch Plan'}
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  const { label, color, variant } = getStatusConfig(subscription.status);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Subscription & Billing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review subscription status, billing cycles, and plans.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Current Plan Summary Column */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mb: 2 }}>
              Current Status
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Status Badge */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Subscription State
                </Typography>
                <Chip label={label} color={color} variant={variant} sx={{ fontWeight: 600 }} id="subscription-status-chip" />
              </Box>

              {/* Current Plan Info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Pricing Plan
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {subscription.plan.name}
                </Typography>
              </Box>

              {/* Next Billing/Renewal Date */}
              {subscription.next_billing_date && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateIcon color="action" />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Next Billing Date
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {subscription.next_billing_date}
                  </Typography>
                </Box>
              )}

              {/* Grace Period End Date (if status is payment due) */}
              {subscription.status === 'PAYMENT_DUE' && subscription.grace_period_end_date && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'warning.light', p: 2, borderRadius: 1.5, color: 'warning.contrastText' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrialIcon />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Grace Period Deadline
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {new Date(subscription.grace_period_end_date).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Subscription Plan Card Columns */}
        <Grid size={{ xs: 12, md: 6 }}>
          {renderPlanCard('starter', 'Starter Plan (Monthly)', '199 INR', '/ month', false)}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {renderPlanCard('starter_quarterly', 'Starter Plan (3-Months)', '299 INR', '/ 3 months', true)}
        </Grid>
      </Grid>

      {/* Confirmation Dialog for Cancellation */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Cancel Subscription Renewal?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your plan benefits will remain active until the end of your current billing period (
            <strong>{subscription.next_billing_date || 'N/A'}</strong>). After that, access will be locked.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)} variant="outlined">
            Keep Plan
          </Button>
          <Button
            id="confirm-cancel-btn"
            onClick={handleCancelSubscription}
            variant="contained"
            color="error"
            loading={cancelSubscription.isPending}
          >
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mock Sandbox Checkout Dialog Overlay */}
      <Dialog
        open={mockCheckoutOpen}
        onClose={() => setMockCheckoutOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 2, p: 1 } },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontFamily: 'Outfit',
            fontWeight: 700,
            fontSize: '1.25rem',
          }}
        >
          <SecurityIcon color="primary" />
          Mock Sandbox Checkout
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ py: 2 }}>
          <DialogContentText sx={{ mb: 2 }}>
            This local instance is running in development mode. Signature verification is bypassed to enable seamless sandbox payments simulation.
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Subscription ID</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {mockSessionData?.razorpay_subscription_id}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Amount</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {mockSessionData?.amount} INR
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Product</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {mockSessionData?.plan_name}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', gap: 1 }}>
          <Button
            id="simulate-payment-btn"
            onClick={handleSimulatePayment}
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<PaymentIcon />}
            loading={simulateWebhook.isPending}
          >
            Simulate Sandbox Payment
          </Button>
          <Button
            onClick={() => setMockCheckoutOpen(false)}
            variant="text"
            color="secondary"
            fullWidth
            sx={{ m: '0 !important' }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Subscription;
