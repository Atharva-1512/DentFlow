import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  Snackbar,
  Alert as MuiAlert,
} from '@mui/material';
import { Phone as PhoneIcon, Business as BusinessIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const clinicSchema = zod.object({
  name: zod.string().min(1, 'Clinic name is required'),
  notification_whatsapp_number: zod.string().min(10, 'Enter a valid WhatsApp number'),
});

type ClinicFormData = zod.infer<typeof clinicSchema>;

export const ClinicSettings: React.FC = () => {
  const { fetchCurrentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClinicFormData>({
    resolver: zodResolver(clinicSchema),
  });

  useEffect(() => {
    const loadClinic = async () => {
      try {
        const res = await api.get('/accounts/clinic/');
        reset({
          name: res.data.name,
          notification_whatsapp_number: res.data.notification_whatsapp_number || '',
        });
      } catch {
        setErrorMsg('Failed to load clinic settings.');
      } finally {
        setLoading(false);
      }
    };
    loadClinic();
  }, [reset]);

  const onSubmit = async (data: ClinicFormData) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.put('/accounts/clinic/', data);
      setSuccessMsg('Clinic settings updated successfully.');
      await fetchCurrentUser();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.detail || 'Failed to update clinic settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 3 }}>
        Clinic Settings
      </Typography>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            WhatsApp Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This is the number where DentFlow sends your daily appointment summaries.
            Make sure this number is registered on WhatsApp.
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('name')}
              label="Clinic Name"
              fullWidth
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={saving}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              {...register('notification_whatsapp_number')}
              label="WhatsApp Number for Notifications"
              placeholder="+91XXXXXXXXXX"
              fullWidth
              margin="normal"
              error={!!errors.notification_whatsapp_number}
              helperText={
                errors.notification_whatsapp_number?.message ||
                'Daily appointment summaries will be sent to this WhatsApp number'
              }
              disabled={saving}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={saving}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Notification Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your clinic receives WhatsApp summaries at these times:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>
              <Typography variant="body2">
                <strong>7:00 PM IST (day before)</strong> — Tomorrow&apos;s appointment list
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>7:00 AM IST (day of)</strong> — Today&apos;s appointment list
              </Typography>
            </li>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Patients also receive a reminder at <strong>7:00 AM IST</strong> on the day of their appointment.
          </Typography>
        </CardContent>
      </Card>

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
