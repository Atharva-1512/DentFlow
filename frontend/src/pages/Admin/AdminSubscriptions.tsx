import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Alert,
  Avatar,
} from '@mui/material';
import {
  AttachMoney as RevenueIcon,
  People as TrialIcon,
  ErrorOutlined as ExpiredIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import type { Clinic } from '../../types';

export const AdminSubscriptions: React.FC = () => {
  // Fetch admin profile containing all clinics
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['admin_profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/me/');
      return res.data;
    },
  });

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        Failed to load subscription metrics. Please reload the page.
      </Alert>
    );
  }

  const clinics: Clinic[] = userData?.all_clinics ?? [];

  // Calculation utilities
  const getSubscriptionDetails = (clinic: Clinic) => {
    const createdDate = new Date(clinic.created_at);
    const now = new Date();
    const trialEndDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isTrial = clinic.is_active && diffDays > 0;
    
    if (!clinic.is_active) {
      return { status: 'Expired', color: 'error' as const, mrr: 0, trialDays: 0, label: 'Access Locked' };
    }
    if (isTrial) {
      return { status: 'Trial', color: 'primary' as const, mrr: 0, trialDays: diffDays, label: `${diffDays} Days Left` };
    }
    return { status: 'Active', color: 'success' as const, mrr: 199, trialDays: 0, label: 'Paid Starter Plan' };
  };

  // Compile totals
  let activeCount = 0;
  let trialCount = 0;
  let expiredCount = 0;
  let totalMRR = 0;

  const clinicsWithSubDetails = clinics.map((c) => {
    const details = getSubscriptionDetails(c);
    if (details.status === 'Active') {
      activeCount++;
      totalMRR += details.mrr;
    } else if (details.status === 'Trial') {
      trialCount++;
    } else {
      expiredCount++;
    }
    return { ...c, details };
  });

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Subscriptions & Platform Billing
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor Monthly Recurring Revenue (MRR), active trials, and payment statuses across all clinics.
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderLeft: '4px solid #10B981', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Estimated Platform MRR
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={80} /> : `${totalMRR.toLocaleString()} INR`}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                <RevenueIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderLeft: '4px solid #2563EB', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Active Trials
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={40} /> : trialCount}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                <TrialIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderLeft: '4px solid #EF4444', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Expired Accounts
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={40} /> : expiredCount}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'error.light', color: 'error.main', width: 48, height: 48 }}>
                <ExpiredIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Subscription Breakdown Table */}
      <Paper sx={{ width: '100%', boxShadow: 2, overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 3, pb: 1, fontWeight: 600, fontFamily: 'Outfit' }}>
          Clinic Subscriptions Breakdown
        </Typography>
        {isLoading ? (
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rectangular" height={50} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={250} />
          </Box>
        ) : clinicsWithSubDetails.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">No subscriptions found.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Clinic Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Subscription State</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Plan Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clinicsWithSubDetails.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{clinic.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={clinic.details.status}
                        size="small"
                        color={clinic.details.color}
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>{clinic.details.label}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {clinic.details.mrr > 0 ? `${clinic.details.mrr.toLocaleString()} INR` : '0 INR'}
                    </TableCell>
                    <TableCell>{new Date(clinic.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AdminSubscriptions;
