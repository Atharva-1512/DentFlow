import React, { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocalHospital as DoctorIcon,
  Comment as CommentIcon,
  Info as InfoIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useCalendarEvents } from '../hooks/useApi';

export const Calendar: React.FC = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch calendar events based on date range set by FullCalendar
  const { data: events = [], isLoading, error } = useCalendarEvents(
    dateRange.start,
    dateRange.end
  );

  const handleDatesSet = useCallback((info: any) => {
    // Extract YYYY-MM-DD from startStr and endStr
    const start = info.startStr.split('T')[0];
    const end = info.endStr.split('T')[0];
    setDateRange({ start, end });
  }, []);

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  // Status mapping for badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'default';
      case 'SCHEDULED':
      default:
        return 'primary';
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <style>{`
        /* FullCalendar Custom Premium Styling */
        .fc {
          font-family: 'Inter', sans-serif;
        }
        .fc .fc-toolbar-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 1.5rem;
          color: #0F172A;
        }
        @media (max-width: 600px) {
          .fc .fc-toolbar {
            flex-direction: column !important;
            gap: 10px;
          }
          .fc .fc-toolbar-title {
            font-size: 1.15rem !important;
            text-align: center;
          }
          .fc .fc-button-group {
            margin-bottom: 4px;
          }
        }
        .fc .fc-button-primary {
          background-color: #0F172A;
          border-color: #0F172A;
          font-weight: 500;
          text-transform: capitalize;
        }
        .fc .fc-button-primary:hover {
          background-color: #1E293B;
          border-color: #1E293B;
        }
        .fc .fc-button-primary:disabled {
          background-color: #94A3B8;
          border-color: #94A3B8;
        }
        .fc .fc-button-active {
          background-color: #2563EB !important;
          border-color: #2563EB !important;
        }
        .fc-event {
          cursor: pointer;
          font-size: 0.85rem;
          padding: 2px 6px;
          border-radius: 6px;
          border: none !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .fc-event-title {
          font-weight: 600;
        }
        /* Custom Event Color Coding Class Names matching backend classMap */
        .appt-scheduled {
          background-color: #2563EB !important;
          color: #ffffff !important;
        }
        .appt-completed {
          background-color: #22C55E !important;
          color: #ffffff !important;
        }
        .appt-cancelled {
          background-color: #94A3B8 !important;
          color: #ffffff !important;
        }
        .fc-col-header-cell {
          background-color: #F8FAFC;
          padding: 8px 0 !important;
        }
        .fc-col-header-cell-cushion {
          color: #475569;
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>

      {/* Header section */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
            Clinic Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View, schedule, and track patient appointments in real-time.
          </Typography>
        </Box>
        {isLoading && <CircularProgress size={24} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load calendar events. Please check connection and try again.
        </Alert>
      )}

      {/* Calendar Grid Sheet */}
      <Paper sx={{ p: 3, boxShadow: 2, borderRadius: 2, overflow: 'hidden' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          editable={false}
          selectable={false}
          selectMirror={true}
          dayMaxEvents={true}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="75vh"
        />
      </Paper>

      {/* Event Details Dialog Modal */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 2, p: 1 } },
        }}
      >
        <DialogTitle component="div" sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
              Appointment Details
            </Typography>
            {selectedEvent && (
              <Chip
                label={selectedEvent.extendedProps.status}
                color={getStatusColor(selectedEvent.extendedProps.status)}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ py: 2 }}>
          {selectedEvent && (
            <Grid container spacing={2}>
              {/* Patient Name */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PersonIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Patient Name
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedEvent.extendedProps.patient_name}
                  </Typography>
                </Box>
              </Grid>

              {/* Mobile Number */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PhoneIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Mobile Number
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.extendedProps.mobile_number}
                  </Typography>
                </Box>
              </Grid>

              {/* Doctor */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DoctorIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Consulting Doctor
                  </Typography>
                  <Typography variant="body1">
                    {selectedEvent.extendedProps.consulting_doctor}
                  </Typography>
                </Box>
              </Grid>

              {/* Date & Time */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TimeIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Scheduled Time
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedEvent.start).toLocaleDateString()} at{' '}
                    {new Date(selectedEvent.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Grid>

              {/* Reason */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                <CommentIcon color="action" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Appointment Reason
                  </Typography>
                  <Typography variant="body2">
                    {selectedEvent.extendedProps.appointment_reason || 'N/A'}
                  </Typography>
                </Box>
              </Grid>

              {/* Appointment Type */}
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <InfoIcon color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Type
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {selectedEvent.extendedProps.appointment_type.toLowerCase()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseModal} variant="contained" color="secondary" fullWidth>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;
