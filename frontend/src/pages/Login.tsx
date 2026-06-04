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
import { Visibility, VisibilityOff, Email as EmailIcon, Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const loginSchema = zod.object({
  email: zod.string().min(1, 'Username or Email is required'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = zod.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      // Map email form field to username in simple-jwt login payload
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      const backendError = error.response?.data?.detail || 'Invalid username or password. Please try again.';
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
        Sign In
      </Typography>
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Enter your credentials to access your clinic portal.
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} id="login-error-alert">
          {errorMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          {...register('email')}
          label="Username or Email"
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
          sx={{ mb: 2 }}
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
          sx={{
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Login'}
        </Button>
      </form>

      <Button
        variant="text"
        fullWidth
        onClick={() => navigate('/register')}
        sx={{ mt: 2, textTransform: 'none' }}
      >
        Don't have an account? Register your clinic
      </Button>
    </Box>
  );
};

export default Login;
