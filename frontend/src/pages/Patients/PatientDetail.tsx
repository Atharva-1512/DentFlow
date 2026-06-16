import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, CircularProgress, Alert, Divider, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, TimelineOppositeContent } from '@mui/lab';
import { usePatient, usePatientTimeline } from '../../hooks/useApi';
import { EditPatientModal } from '../../components/Patients/EditPatientModal';

/**
 * PatientDetail page renders patient demographic information and a chronological
 * timeline of visits and appointments using Material UI's Timeline component.
 *
 * The backend provides:
 *   - GET /api/patients/:id/   → patient details
 *   - GET /api/patients/:id/timeline/ → ordered array of events (visits & appointments)
 *
 * We rely on the existing React Query hooks `usePatient` and `usePatientTimeline`
 * which handle caching, loading, and error states.
 */
const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch patient data
  const {
    data: patient,
    isLoading: patientLoading,
    isError: patientError,
    error: patientErrorObj,
  } = usePatient(id ?? '');

  // Fetch timeline data
  const {
    data: timeline,
    isLoading: timelineLoading,
    isError: timelineError,
    error: timelineErrorObj,
  } = usePatientTimeline(id ?? '');

  const loading = patientLoading || timelineLoading;
  // Show error if either query fails — do NOT wait for loading to resolve first.
  const error = patientError || timelineError;

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {(patientErrorObj as any)?.message || (timelineErrorObj as any)?.message || 'Failed to load patient data.'}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={80} thickness={4} />
      </Box>
    );
  }

  if (!patient) {
    return null; // Should never happen when loading is false and no error
  }

  const renderTimelineItem = (item: any, index: number) => {
    const isVisit = item.type === 'VISIT';
    
    // Format the ISO date string to a readable date and time
    const dateObj = new Date(item.date);
    const date = dateObj.toLocaleDateString();
    const time = item.type === 'APPOINTMENT' ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    const title = item.title || (isVisit ? 'Visit' : 'Appointment');
    const description = item.description || '';
    const color = isVisit ? 'primary' : 'secondary';

    return (
      <TimelineItem key={index}>
        <TimelineOppositeContent sx={{ flex: 0.2, m: 'auto 0' }}>
          <Typography variant="body2" color="text.secondary">
            {date}
            {time && <><br/>{time}</>}
          </Typography>
        </TimelineOppositeContent>
        <TimelineSeparator>
          <TimelineDot color={color as any} />
          {index < timeline!.length - 1 && <TimelineConnector />}
        </TimelineSeparator>
        <TimelineContent sx={{ py: '12px', px: 2 }}>
          <Card variant="outlined" sx={{ background: 'rgba(var(--mui-palette-background-paperChannel) / 0.8)' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {description}
              </Typography>
            </CardContent>
          </Card>
        </TimelineContent>
      </TimelineItem>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Patient Header Card */}
      <Card sx={{ mb: 4, background: 'rgba(var(--mui-palette-background-paperChannel) / 0.9)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" component="div" sx={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: { xs: '1.8rem', sm: '2.125rem' } }}>
              {patient.full_name} {patient.patient_id && <Typography component="span" variant="h5" sx={{ color: 'text.secondary', fontWeight: 500, ml: 1 }}>({patient.patient_id})</Typography>}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/patients/new?patient_id=${patient.id}`)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
                id="patient-schedule-followup-btn"
              >
                Schedule Follow-up / New Visit
              </Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
                id="patient-edit-profile-btn"
              >
                Edit Patient
              </Button>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {patient.patient_id && (
              <Typography variant="body1">
                <strong>Patient ID:</strong> {patient.patient_id}
              </Typography>
            )}
            <Typography variant="body1">
              <strong>Gender:</strong> {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
            </Typography>
            <Typography variant="body1">
              <strong>DOB:</strong> {patient.date_of_birth ?? 'N/A'}
            </Typography>
            <Typography variant="body1">
              <strong>Age:</strong>{' '}
              {patient.date_of_birth
                ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
                : patient.age}
            </Typography>
            <Typography variant="body1">
              <strong>Mobile:</strong> {patient.mobile_number}
            </Typography>
            <Typography variant="body1">
              <strong>Consulting Doctor:</strong> {patient.consulting_doctor_name || 'N/A'}
            </Typography>
            {patient.address && (
              <Typography variant="body1" sx={{ width: '100%' }}>
                <strong>Address:</strong> {patient.address}
              </Typography>
            )}
            {patient.chief_complaint && (
              <Typography variant="body1" sx={{ width: '100%' }}>
                <strong>Chief Complaint:</strong> {patient.chief_complaint}
              </Typography>
            )}
            {patient.notes && (
              <Typography variant="body1" sx={{ width: '100%' }}>
                <strong>Patient Notes:</strong> {patient.notes}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Typography variant="h5" gutterBottom>
        Patient History
      </Typography>
      <Timeline position="alternate">
        {timeline && timeline.length > 0 ? (
          timeline.map((item, idx) => renderTimelineItem(item, idx))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No history available for this patient.
          </Typography>
        )}
      </Timeline>
      
      <EditPatientModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        patient={patient}
      />
    </Box>
  );
};

export default PatientDetail;
