import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Snackbar,
  Alert as MuiAlert,
  Avatar,
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  LinkOff as LinkOffIcon,
  Schedule as ScheduleIcon,
  PhoneAndroid as PhoneIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus =
  | 'INITIALIZING'
  | 'QR_REQUIRED'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'SERVICE_UNAVAILABLE';

interface WhatsAppState {
  status: SessionStatus;
  connected_number: string | null;
  connected_name: string | null;
  last_activity: string | null;
  qr_data_url: string | null;
  warning?: string;
}

interface ReminderStats {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  pending: number;
  last_sent_at: string | null;
}

// ─── Status chip config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'default' | 'info'; icon: JSX.Element }
> = {
  CONNECTED: {
    label: 'Connected',
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
  },
  QR_REQUIRED: {
    label: 'Scan QR Code',
    color: 'warning',
    icon: <QrCodeIcon fontSize="small" />,
  },
  INITIALIZING: {
    label: 'Initializing…',
    color: 'info',
    icon: <CircularProgress size={12} color="inherit" />,
  },
  RECONNECTING: {
    label: 'Reconnecting…',
    color: 'info',
    icon: <CircularProgress size={12} color="inherit" />,
  },
  DISCONNECTED: {
    label: 'Disconnected',
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
  },
  SERVICE_UNAVAILABLE: {
    label: 'Service Unavailable',
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ClinicSettings: React.FC = () => {
  const [wa, setWa] = useState<WhatsAppState>({
    status: 'DISCONNECTED',
    connected_number: null,
    connected_name: null,
    last_activity: null,
    qr_data_url: null,
  });
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch status ──────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/notifications/whatsapp/status/');
      setWa(res.data);
    } catch {
      // Keep last known state
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/notifications/whatsapp/stats/');
      setStats(res.data.reminders);
    } catch {
      // Non-critical
    }
  }, []);

  // ─── Polling ───────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      await fetchStatus();
    }, 3000);
  }, [fetchStatus, stopPolling]);

  // Start polling whenever status is transient (not stable)
  useEffect(() => {
    const isTransient = ['INITIALIZING', 'QR_REQUIRED', 'RECONNECTING'].includes(wa.status);
    if (isTransient) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [wa.status, startPolling, stopPolling]);

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStatus(), fetchStats()]);
      setLoading(false);
    };
    init();
  }, [fetchStatus, fetchStats]);

  // ─── Connect ───────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    try {
      await api.post('/notifications/whatsapp/connect/');
      await fetchStatus();
      setSuccessMsg('Starting WhatsApp session. Scan the QR code below.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start WhatsApp session.');
    } finally {
      setConnecting(false);
    }
  };

  // ─── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setErrorMsg(null);
    try {
      await api.post('/notifications/whatsapp/disconnect/');
      setWa((prev) => ({
        ...prev,
        status: 'DISCONNECTED',
        connected_number: null,
        connected_name: null,
        qr_data_url: null,
      }));
      setSuccessMsg('WhatsApp disconnected. You can reconnect anytime.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to disconnect.');
    } finally {
      setDisconnecting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const statusCfg = STATUS_CONFIG[wa.status] ?? STATUS_CONFIG.DISCONNECTED;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Avatar
          sx={{
            bgcolor: '#25D366',
            width: 48,
            height: 48,
            boxShadow: '0 4px 14px rgba(37,211,102,0.4)',
          }}
        >
          <WhatsAppIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            WhatsApp Reminders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect your clinic's WhatsApp to send appointment reminders
          </Typography>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {wa.warning && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {wa.warning}
        </Alert>
      )}

      {/* ── Session Card ── */}
      <Card
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor:
            wa.status === 'CONNECTED'
              ? 'success.main'
              : wa.status === 'QR_REQUIRED'
              ? 'warning.main'
              : 'divider',
          boxShadow:
            wa.status === 'CONNECTED'
              ? '0 0 0 2px rgba(76,175,80,0.15)'
              : wa.status === 'QR_REQUIRED'
              ? '0 0 0 2px rgba(255,152,0,0.15)'
              : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Status header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Connection Status
            </Typography>
            <Chip
              icon={statusCfg.icon}
              label={statusCfg.label}
              color={statusCfg.color}
              size="small"
              sx={{ fontWeight: 600, px: 0.5 }}
            />
          </Box>

          {/* CONNECTED state */}
          {wa.status === 'CONNECTED' && (
            <Box>
              <Alert
                severity="success"
                icon={<CheckCircleIcon />}
                sx={{ mb: 3, borderRadius: 2 }}
              >
                <Typography fontWeight={600}>WhatsApp Connected!</Typography>
                <Typography variant="body2">
                  All reminders will be sent from this clinic's WhatsApp account.
                </Typography>
              </Alert>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  mb: 3,
                  p: 2,
                  bgcolor: 'success.50',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'success.100',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon color="success" fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Connected Number</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      +{wa.connected_number || '—'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WhatsAppIcon sx={{ color: '#25D366' }} fontSize="small" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Display Name</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {wa.connected_name || '—'}
                    </Typography>
                  </Box>
                </Box>
                {wa.last_activity && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, gridColumn: '1 / -1' }}>
                    <ScheduleIcon color="action" fontSize="small" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Last Activity</Typography>
                      <Typography variant="body2">
                        {new Date(wa.last_activity).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              <Button
                variant="outlined"
                color="error"
                startIcon={disconnecting ? <CircularProgress size={16} /> : <LinkOffIcon />}
                onClick={handleDisconnect}
                disabled={disconnecting}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect WhatsApp'}
              </Button>
            </Box>
          )}

          {/* QR_REQUIRED state */}
          {wa.status === 'QR_REQUIRED' && (
            <Box>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography fontWeight={600} gutterBottom>
                  Scan with your clinic's WhatsApp
                </Typography>
                <Typography variant="body2">
                  Open WhatsApp on your clinic's phone → tap the three dots (⋮) → Linked Devices → Link a Device → scan below.
                </Typography>
              </Alert>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  py: 3,
                }}
              >
                {wa.qr_data_url ? (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#fff',
                      borderRadius: 3,
                      border: '2px solid',
                      borderColor: 'warning.main',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      mb: 2,
                    }}
                  >
                    <img
                      src={wa.qr_data_url}
                      alt="WhatsApp QR Code"
                      style={{ width: 220, height: 220, display: 'block' }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 220,
                      height: 220,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: 'warning.main',
                      borderRadius: 3,
                      mb: 2,
                    }}
                  >
                    <CircularProgress size={40} color="warning" />
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary">
                  QR code refreshes automatically every 30 seconds
                </Typography>
              </Box>
            </Box>
          )}

          {/* INITIALIZING / RECONNECTING state */}
          {(wa.status === 'INITIALIZING' || wa.status === 'RECONNECTING') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography color="text.secondary">
                {wa.status === 'INITIALIZING' ? 'Starting WhatsApp session…' : 'Reconnecting session…'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                This may take 10–30 seconds
              </Typography>
            </Box>
          )}

          {/* DISCONNECTED / SERVICE_UNAVAILABLE state */}
          {(wa.status === 'DISCONNECTED' || wa.status === 'SERVICE_UNAVAILABLE') && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography fontWeight={600} gutterBottom>
                  WhatsApp Not Connected
                </Typography>
                <Typography variant="body2">
                  Appointment reminders will be{' '}
                  <strong>skipped</strong> until you connect this clinic's WhatsApp account.
                  Reminders are always sent from your clinic's own number — never from a shared DentFlow number.
                </Typography>
              </Alert>

              <Button
                variant="contained"
                startIcon={connecting ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />}
                onClick={handleConnect}
                disabled={connecting || wa.status === 'SERVICE_UNAVAILABLE'}
                sx={{
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#1da851' },
                  fontWeight: 600,
                  textTransform: 'none',
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                }}
              >
                {connecting ? 'Starting…' : 'Connect WhatsApp'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Reminder Stats Card ── */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Reminder Statistics
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: 2,
              }}
            >
              {[
                { label: 'Total', value: stats.total, color: 'text.primary' },
                { label: 'Sent ✅', value: stats.sent, color: 'success.main' },
                { label: 'Pending ⏳', value: stats.pending, color: 'info.main' },
                { label: 'Skipped ⚠️', value: stats.skipped, color: 'warning.main' },
                { label: 'Failed ❌', value: stats.failed, color: 'error.main' },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={{ color: item.color, fontFamily: 'Outfit' }}
                  >
                    {item.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
            {stats.last_sent_at && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Last reminder sent:{' '}
                {new Date(stats.last_sent_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Schedule Info Card ── */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Reminder Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            DentFlow automatically sends the following WhatsApp messages — always from your clinic's connected number:
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Box component="li" sx={{ mb: 1.5 }}>
              <Typography variant="body2">
                <strong>7:00 PM IST (evening before)</strong> — Clinic receives tomorrow's full appointment list
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1.5 }}>
              <Typography variant="body2">
                <strong>7:00 AM IST (day of appointment)</strong> — Clinic receives today's appointment list
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body2">
                <strong>7:00 AM IST (day of appointment)</strong> — Patient receives their personal reminder
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Alert severity="info" icon={<WhatsAppIcon />} sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Your patients see your clinic's WhatsApp profile as the sender.</strong> DentFlow never uses a shared company number. Each clinic operates with complete isolation.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setSuccessMsg(null)} severity="success" variant="filled">
          {successMsg}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default ClinicSettings;
