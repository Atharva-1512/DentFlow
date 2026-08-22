import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  ReceiptLong as InvoiceIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const registerSchema = zod.object({
  clinic_name: zod.string().min(1, 'Clinic name is required'),
  clinic_address: zod.string().min(1, 'Clinic address is required'),
  username: zod.string().min(1, 'Username is required'),
  email: zod.string().email('Enter a valid email'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
  mobile_number: zod.string().min(10, 'Enter a valid contact number'),
  dci_number: zod.string().optional(),
  gst_number: zod.string().optional(),
  invoice_prefix: zod.string().default('DF-2026/'),
  slot_duration: zod.number().default(30),
  opening_time: zod.string().default('09:00'),
  closing_time: zod.string().default('20:00'),
});

type RegisterFormData = zod.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      invoice_prefix: 'DF-2026/',
      slot_duration: 30,
      opening_time: '09:00',
      closing_time: '20:00',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    try {
      await api.post('/accounts/register/', data);
      // Log in using AuthContext to update session state
      await login(data.username, data.password);
      navigate('/dashboard');
    } catch (error: any) {
      const backendError =
        error.response?.data?.detail ||
        error.response?.data?.mobile_number?.[0] ||
        error.response?.data?.username?.[0] ||
        error.response?.data?.email?.[0] ||
        'Registration failed. Please try again.';
      setErrorMessage(backendError);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto', py: 2 }}>
      <Typography
        variant="h5"
        align="center"
        gutterBottom
        sx={{ fontWeight: 700, mb: 1, color: 'text.primary', fontFamily: 'Outfit' }}
      >
        Register Your Dental Clinic
      </Typography>
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
        Complete your clinic setup and start managing appointments, patients & billing.
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Section 1: Clinic Profile */}
        <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
          CLINIC PROFILE & ADDRESS
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('clinic_name')}
              label="Clinic Name *"
              fullWidth
              size="small"
              error={!!errors.clinic_name}
              helperText={errors.clinic_name?.message}
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('mobile_number')}
              label="Contact Mobile / WhatsApp *"
              placeholder="91XXXXXXXXXX"
              fullWidth
              size="small"
              error={!!errors.mobile_number}
              helperText={errors.mobile_number?.message}
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              {...register('clinic_address')}
              label="Full Clinic Address *"
              fullWidth
              size="small"
              error={!!errors.clinic_address}
              helperText={errors.clinic_address?.message}
              disabled={isSubmitting}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Section 2: Registration & Invoice Preferences */}
        <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
          REGISTRATION & INVOICE SETTINGS
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('dci_number')}
              label="DCI Reg / License Number"
              placeholder="e.g. DCI-MH-12345"
              fullWidth
              size="small"
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('gst_number')}
              label="GST / Tax ID Number (Optional)"
              placeholder="e.g. 27AAAAA0000A1Z5"
              fullWidth
              size="small"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('invoice_prefix')}
              label="Invoice Number Prefix"
              fullWidth
              size="small"
              helperText="Prefix for bills (e.g. DF-2026/)"
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <InvoiceIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              {...register('slot_duration', { valueAsNumber: true })}
              label="Default Slot Duration"
              fullWidth
              size="small"
              disabled={isSubmitting}
              defaultValue={30}
            >
              <MenuItem value={15}>15 Minutes</MenuItem>
              <MenuItem value={30}>30 Minutes (Standard)</MenuItem>
              <MenuItem value={45}>45 Minutes</MenuItem>
              <MenuItem value={60}>60 Minutes (1 Hour)</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* Section 3: Operating Hours */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('opening_time')}
              label="Clinic Opening Time"
              type="time"
              fullWidth
              size="small"
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('closing_time')}
              label="Clinic Closing Time"
              type="time"
              fullWidth
              size="small"
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Section 4: Owner Credentials */}
        <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
          OWNER ACCOUNT LOGIN CREDENTIALS
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('username')}
              label="Login Username *"
              fullWidth
              size="small"
              error={!!errors.username}
              helperText={errors.username?.message}
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              {...register('email')}
              label="Email Address *"
              type="email"
              fullWidth
              size="small"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              {...register('password')}
              label="Password *"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              size="small"
              error={!!errors.password}
              helperText={errors.password?.message || 'Minimum 6 characters'}
              disabled={isSubmitting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={isSubmitting}
          sx={{ py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Register & Launch Clinic Account'}
        </Button>
      </form>

      <Button
        variant="text"
        fullWidth
        onClick={() => navigate('/login')}
        sx={{ mt: 2, textTransform: 'none' }}
      >
        Already have an account? Sign In
      </Button>
    </Box>
  );
};

export default Register;
