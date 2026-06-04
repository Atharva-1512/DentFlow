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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

const registerSchema = zod.object({
  clinic_name: zod.string().min(1, 'Clinic name is required'),
  username: zod.string().min(1, 'Username is required'),
  email: zod.string().email('Enter a valid email'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
  mobile_number: zod.string().min(10, 'Enter a valid WhatsApp number'),
});

type RegisterFormData = zod.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMessage(null);
    try {
      await api.post('/accounts/register/', data);
      // After registration, log the user in
      await api.post('/token/', { username: data.username, password: data.password });
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
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h5"
        align="center"
        gutterBottom
        sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}
      >
        Register Your Clinic
      </Typography>
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
        Create your DentFlow account and start your 30-day free trial.
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          {...register('clinic_name')}
          label="Clinic Name"
          fullWidth
          margin="normal"
          error={!!errors.clinic_name}
          helperText={errors.clinic_name?.message}
          disabled={isSubmitting}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        <TextField
          {...register('username')}
          label="Username"
          fullWidth
          margin="normal"
          error={!!errors.username}
          helperText={errors.username?.message}
          disabled={isSubmitting}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        <TextField
          {...register('email')}
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          error={!!errors.email}
          helperText={errors.email?.message}
          disabled={isSubmitting}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        <TextField
          {...register('mobile_number')}
          label="WhatsApp Number"
          placeholder="+91XXXXXXXXXX"
          fullWidth
          margin="normal"
          error={!!errors.mobile_number}
          helperText={errors.mobile_number?.message || 'This number will receive appointment summaries'}
          disabled={isSubmitting}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        <TextField
          {...register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          error={!!errors.password}
          helperText={errors.password?.message}
          disabled={isSubmitting}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
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
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={isSubmitting}
          sx={{ py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '1rem' }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
        </Button>

        <Button
          variant="text"
          fullWidth
          onClick={() => navigate('/login')}
          sx={{ mt: 2, textTransform: 'none' }}
        >
          Already have an account? Sign In
        </Button>
      </form>
    </Box>
  );
};

export default Register;
