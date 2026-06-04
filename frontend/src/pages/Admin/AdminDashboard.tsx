import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
  Alert,
  Button,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Business as ClinicIcon,
  CheckCircle as ActiveIcon,
  EventNote as EventIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Clinic } from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { setImpersonatedClinic } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch admin profile details from /accounts/me/
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['admin_profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/me/');
      return res.data;
    },
  });

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        Failed to load administration dashboard. Please reload the page.
      </Alert>
    );
  }

  const clinics: Clinic[] = userData?.all_clinics ?? [];

  // Calculate statistics from the clinics array
  const totalClinics = clinics.length;
  const activeClinics = clinics.filter((c) => c.is_active).length;
  const expiredClinics = clinics.filter((c) => !c.is_active).length;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const trialClinics = clinics.filter(
    (c) => c.is_active && new Date(c.created_at) >= sevenDaysAgo
  ).length;

  const filteredClinics = clinics.filter((c) => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term);
  });

  const handleImpersonate = async (clinic: Clinic) => {
    await setImpersonatedClinic(clinic);
    navigate('/dashboard');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, mb: 3 }}>
        System Administration Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #64748B', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Total Clinics
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={50} /> : totalClinics}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'grey.200', color: 'grey.700', width: 48, height: 48 }}>
                <ClinicIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #10B981', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Active Clinics
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={50} /> : activeClinics}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                <ActiveIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #2563EB', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Trial Clinics
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={50} /> : trialClinics}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                <EventIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #EF4444', boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
                  Expired Clinics
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
                  {isLoading ? <Skeleton width={50} /> : expiredClinics}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'error.light', color: 'error.main', width: 48, height: 48 }}>
                <ErrorIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Registry Table */}
      <Paper sx={{ p: 3, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Outfit' }}>
            Registered Clinics Registry
          </Typography>
          <TextField
            size="small"
            placeholder="Quick search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            id="admin-dashboard-search"
          />
        </Box>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Skeleton height={50} />
            <Skeleton height={50} />
            <Skeleton height={50} />
          </Box>
        ) : filteredClinics.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No registered clinics found.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Clinic Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Slug</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date Created</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClinics.map((clinic: Clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{clinic.name}</TableCell>
                    <TableCell>{clinic.slug}</TableCell>
                    <TableCell>{new Date(clinic.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={clinic.is_active ? 'Active' : 'Expired'}
                        size="small"
                        color={clinic.is_active ? 'success' : 'error'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleImpersonate(clinic)}
                        disabled={!clinic.is_active}
                        id={`impersonate-${clinic.id}`}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        Impersonate
                      </Button>
                    </TableCell>
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

export default AdminDashboard;
