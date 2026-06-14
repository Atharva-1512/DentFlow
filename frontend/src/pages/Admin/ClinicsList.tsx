import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toastRef } from '../../context/ToastContext';
import type { Clinic } from '../../types';

// Zod validation schema for clinic registration by Admin
const addClinicSchema = zod.object({
  clinic_name: zod.string().min(1, 'Clinic name is required'),
  username: zod.string().min(1, 'Owner username is required'),
  email: zod.string().email('Enter a valid owner email'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
  mobile_number: zod.string().min(10, 'Enter a valid contact number'),
});

type AddClinicFormData = zod.infer<typeof addClinicSchema>;

export const ClinicsList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setImpersonatedClinic } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch admin profile containing all clinics
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['admin_profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/me/');
      return res.data;
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddClinicFormData>({
    resolver: zodResolver(addClinicSchema),
  });

  // Mutation: Create Clinic
  const createClinicMutation = useMutation({
    mutationFn: async (data: AddClinicFormData) => {
      return api.post('/accounts/admin/clinics/', data);
    },
    onSuccess: () => {
      toastRef.show('Clinic and owner registered successfully.', 'success');
      setAddDialogOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['admin_profile'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to create clinic. Check inputs.';
      toastRef.show(msg, 'error');
    },
  });

  // Mutation: Toggle Active Status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ clinicId, isActive }: { clinicId: string; isActive: boolean }) => {
      return api.patch(`/accounts/admin/clinics/${clinicId}/`, { is_active: isActive });
    },
    onSuccess: () => {
      toastRef.show('Clinic status updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin_profile'] });
    },
    onError: () => {
      toastRef.show('Failed to toggle clinic status.', 'error');
    },
  });

  // Mutation: Hard Delete Clinic
  const deleteClinicMutation = useMutation({
    mutationFn: async (clinicId: string) => {
      return api.delete(`/accounts/admin/clinics/${clinicId}/`);
    },
    onSuccess: () => {
      toastRef.show('Clinic deleted successfully.', 'success');
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['admin_profile'] });
    },
    onError: () => {
      toastRef.show('Failed to delete clinic.', 'error');
    },
  });

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        Failed to load clinics. Please check connection and try again.
      </Alert>
    );
  }

  const clinics: Clinic[] = userData?.all_clinics ?? [];

  const filteredClinics = clinics.filter((clinic) => {
    const term = searchTerm.toLowerCase();
    return (
      clinic.name.toLowerCase().includes(term) ||
      clinic.slug.toLowerCase().includes(term)
    );
  });

  const handleImpersonate = async (clinic: Clinic) => {
    await setImpersonatedClinic(clinic);
    navigate('/dashboard');
  };

  const handleAddClinic = (data: AddClinicFormData) => {
    createClinicMutation.mutate(data);
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Clinics Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all registered clinics on the platform and initiate support impersonation context.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          sx={{ fontWeight: 600, textTransform: 'none' }}
        >
          Add Clinic
        </Button>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3, boxShadow: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search clinics by name or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          id="clinics-search-input"
        />
      </Paper>

      {/* Clinics Table */}
      <Paper sx={{ width: '100%', boxShadow: 2, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rectangular" height={50} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={300} />
          </Box>
        ) : filteredClinics.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary">No clinics match search filters.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
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
                {filteredClinics.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{clinic.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{clinic.slug}</TableCell>
                    <TableCell>{new Date(clinic.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={clinic.is_active ? 'Active' : 'Deactivated'}
                        size="small"
                        color={clinic.is_active ? 'success' : 'error'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleImpersonate(clinic)}
                          disabled={!clinic.is_active}
                          id={`impersonate-clinic-${clinic.id}`}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Impersonate
                        </Button>
                        <Tooltip title={clinic.is_active ? 'Deactivate Clinic' : 'Activate Clinic'}>
                          <IconButton
                            size="small"
                            color={clinic.is_active ? 'warning' : 'success'}
                            onClick={() =>
                              toggleActiveMutation.mutate({
                                clinicId: clinic.id,
                                isActive: !clinic.is_active,
                              })
                            }
                          >
                            {clinic.is_active ? <BlockIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Clinic">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteConfirmId(clinic.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add Clinic Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Add New Clinic Client</DialogTitle>
        <form onSubmit={handleSubmit(handleAddClinic)} noValidate>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                {...register('clinic_name')}
                label="Clinic Name"
                fullWidth
                error={!!errors.clinic_name}
                helperText={errors.clinic_name?.message}
              />
              <TextField
                {...register('username')}
                label="Owner Username"
                fullWidth
                error={!!errors.username}
                helperText={errors.username?.message}
              />
              <TextField
                {...register('email')}
                label="Owner Email"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
              />
              <TextField
                {...register('password')}
                label="Owner Password"
                type="password"
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                {...register('mobile_number')}
                label="Contact Mobile Number"
                placeholder="91XXXXXXXXXX"
                fullWidth
                error={!!errors.mobile_number}
                helperText={errors.mobile_number?.message}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Create Clinic
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>Delete Clinic?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete this clinic client? This action is permanent and will cascade-delete all doctors, patients, visits, appointments, and subscriptions associated with this clinic.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            onClick={() => deleteConfirmId && deleteClinicMutation.mutate(deleteConfirmId)}
            color="error"
            variant="contained"
            disabled={deleteClinicMutation.isPending}
          >
            Delete Clinic
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClinicsList;
