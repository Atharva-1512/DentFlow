import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import api from '../services/api';

export const ClinicSettings: React.FC = () => {
  // Fetch clinic profile details
  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ['clinic_profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/clinic/');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load clinic settings. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 48,
            height: 48,
            boxShadow: '0 4px 14px rgba(229,62,62,0.3)',
          }}
        >
          <SettingsIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Clinic Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your clinic details and configurations
          </Typography>
        </Box>
      </Box>

      {/* Clinic Details Card */}
      <Card sx={{ mb: 4, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontFamily: 'Outfit' }}>
            General Information
          </Typography>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BusinessIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Clinic Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {clinic?.name || '—'}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PhoneIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Contact Mobile Number
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {clinic?.notification_whatsapp_number || '—'}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Integrations Alert */}
      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontFamily: 'Outfit' }}>
            Messaging Integrations
          </Typography>
          <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Automatic reminders are currently disabled.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              The WhatsApp messaging microservice has been deactivated as requested. No reminders will be dispatched.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ClinicSettings;
