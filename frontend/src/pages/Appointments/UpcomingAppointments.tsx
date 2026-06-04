import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  EditCalendar as RescheduleIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useUpcomingAppointments } from '../../hooks/useApi';
import type { Appointment } from '../../types';

export const UpcomingAppointments: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const { data, isLoading, error } = useUpcomingAppointments(searchTerm, page);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const appointments = data?.results || [];

  // Client-side search filtering for immediate user interface feedback
  const filteredAppointments = appointments.filter((appt) => {
    const term = searchTerm.toLowerCase();
    return (
      (appt.patient_name || '').toLowerCase().includes(term) ||
      (appt.consulting_doctor || '').toLowerCase().includes(term) ||
      (appt.patient_mobile || '').includes(term) ||
      (appt.appointment_reason || '').toLowerCase().includes(term)
    );
  });

  const columns: GridColDef[] = [
    { 
      field: 'appointment_date', 
      headerName: 'Date', 
      width: 120, 
      sortable: true 
    },
    { 
      field: 'appointment_time', 
      headerName: 'Time', 
      width: 110, 
      sortable: true 
    },
    { 
      field: 'patient_name', 
      headerName: 'Patient', 
      width: 180,
      valueGetter: (_value, row) => row.patient_name || 'Unknown Patient'
    },
    { 
      field: 'consulting_doctor', 
      headerName: 'Doctor', 
      width: 160 
    },
    { 
      field: 'appointment_reason', 
      headerName: 'Reason', 
      width: 220 
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const val = params.value as string;
        let color: 'success' | 'primary' | 'error' | 'warning' = 'primary';
        if (val === 'COMPLETED') color = 'success';
        if (val === 'CANCELLED') color = 'error';
        return (
          <Chip 
            label={val} 
            size="small" 
            color={color} 
            variant="outlined" 
            sx={{ fontWeight: 600 }}
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 280,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const appt = params.row as Appointment;
        return (
          <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<ViewIcon />}
              onClick={() => navigate(`/patients/${appt.patient}`)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
              id={`view-patient-${appt.id}`}
            >
              View Patient
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<RescheduleIcon />}
              onClick={() => navigate('/calendar')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
              id={`reschedule-${appt.id}`}
            >
              Reschedule
            </Button>
          </Box>
        );
      }
    }
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
          Upcoming Appointments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View, manage, and schedule future patient consults or treatments.
        </Typography>
      </Box>

      {/* Search Input */}
      <Paper sx={{ p: 2, mb: 3, boxShadow: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by Patient Name, Doctor, Reason..."
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
          id="upcoming-appointments-search"
        />
      </Paper>

      {/* DataGrid Table */}
      <Paper sx={{ width: '100%', height: 600, boxShadow: 2, overflow: 'hidden' }}>
        {error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to retrieve upcoming appointments. Please try again later.
          </Alert>
        ) : isLoading ? (
          <Box sx={{ p: 3 }}>
            <Skeleton variant="rectangular" height={50} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={400} />
          </Box>
        ) : filteredAppointments.length === 0 ? (
          <Box sx={{ py: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="h6" color="text.secondary" align="center">
              No upcoming appointments found.
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={filteredAppointments}
            columns={columns}
            paginationMode="server"
            rowCount={data?.count || 0}
            paginationModel={{ page, pageSize: rowsPerPage }}
            onPaginationModelChange={(model) => setPage(model.page)}
            loading={isLoading}
            rowHeight={60}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'background.paper',
                borderBottom: '2px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
              },
            }}
          />
        )}
      </Paper>
    </Box>
  );
};

export default UpcomingAppointments;
