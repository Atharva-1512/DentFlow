import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Clinic } from '../../types';

export const ClinicsList: React.FC = () => {
  const navigate = useNavigate();
  const { setImpersonatedClinic } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

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
        Failed to load clinics. Please check connection and try again.
      </Alert>
    );
  }

  const clinics: Clinic[] = userData?.all_clinics ?? [];

  // Filter clinics based on search query
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

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Clinics Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage all registered clinics on the platform and initiate support impersonation context.
        </Typography>
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
                        variant="contained"
                        color="primary"
                        onClick={() => handleImpersonate(clinic)}
                        disabled={!clinic.is_active}
                        id={`impersonate-clinic-${clinic.id}`}
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

export default ClinicsList;
