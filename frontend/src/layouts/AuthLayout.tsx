import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Card, Container, Typography } from '@mui/material';

export const AuthLayout: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Outfit',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: 1,
              mb: 1,
            }}
          >
            DentFlow
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            Multi-Tenant Dental SaaS Platform
          </Typography>
        </Box>
        <Card sx={{ p: 4, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <Outlet />
        </Card>
      </Container>
    </Box>
  );
};

export default AuthLayout;
