import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  PeopleAlt as PatientsIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { calculateAge } from '../../utils/date';
import type { Patient, PaginatedResponse } from '../../types';

export const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20); // Backend default PAGE_SIZE = 20

  // React Query fetch call
  const { data, isLoading, error } = useQuery({
    queryKey: ['patients', searchTerm, page],
    queryFn: async () => {
      const apiPage = page + 1;
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const response = await api.get(`/patients/?page=${apiPage}${searchParam}`);
      return response.data as PaginatedResponse<Patient>;
    },
  });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset page on new search
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleAddPatient = () => {
    navigate('/patients/new');
  };

  const handleViewPatient = (id: string) => {
    navigate(`/patients/${id}`);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Patients Registry
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddPatient}
          sx={{ textTransform: 'none', fontWeight: 600 }}
          id="add-patient-btn"
        >
          Add Patient
        </Button>
      </Box>

      {/* Search and Filter Panel */}
      <Paper sx={{ p: 2, mb: 3, boxShadow: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by Patient Name or Mobile Number..."
          value={searchTerm}
          onChange={handleSearchChange}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          id="patient-search-field"
        />
      </Paper>

      {/* Main Patient Data Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 2 }}>
        {error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Error fetching patients list. Please check authorization or try again.
          </Alert>
        ) : isLoading ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Age</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mobile Number</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Consulting Doctor</TableCell>
                  <TableCell sx={{ fontWeight: 600, align: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton width="60%" /></TableCell>
                    <TableCell><Skeleton width="40%" /></TableCell>
                    <TableCell><Skeleton width="30%" /></TableCell>
                    <TableCell><Skeleton width="70%" /></TableCell>
                    <TableCell><Skeleton width="80%" /></TableCell>
                    <TableCell><Skeleton width={40} height={30} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : !data || data.results.length === 0 ? (
          <Box sx={{ py: 8, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <PatientsIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary" align="center">
              No patients registered matching your search query.
            </Typography>
            <Button variant="outlined" color="primary" onClick={handleAddPatient}>
              Register New Patient
            </Button>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Age</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Gender</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Mobile Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Consulting Doctor</TableCell>
                    <TableCell sx={{ fontWeight: 600, align: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.results.map((patient: Patient) => (
                    <TableRow key={patient.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{patient.full_name}</TableCell>
                      <TableCell>
                        {patient.date_of_birth ? calculateAge(patient.date_of_birth) : patient.age}
                      </TableCell>
                      <TableCell>
                        {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                      </TableCell>
                      <TableCell>{patient.mobile_number}</TableCell>
                      <TableCell>{patient.consulting_doctor_name || 'N/A'}</TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          onClick={() => handleViewPatient(patient.id)}
                          aria-label={`view profile of ${patient.full_name}`}
                          id={`view-patient-${patient.id}`}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data.count}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[20]} // Locked to API page size
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default PatientList;
