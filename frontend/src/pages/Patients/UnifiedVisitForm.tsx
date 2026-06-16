import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { usePatients, usePatient, useUnifiedVisit } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { calculateAge, calculateDobFromAge } from '../../utils/date';
import type { Patient } from '../../types';

// ==========================================
// Zod Form Validation Schema
// ==========================================
const unifiedFormSchema = z.object({
  patientSelection: z.enum(['existing', 'new']),
  
  // Existing Patient selection
  existingPatient: z.object({
    id: z.string().uuid('Invalid patient identifier').nullable(),
  }).optional(),

  // New Patient fields
  newPatient: z.object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    date_of_birth: z.string().refine((val) => {
      if (!val) return false;
      const d = new Date(val);
      return !isNaN(d.getTime()) && d < new Date();
    }, 'Date of birth must be a valid date in the past'),
    gender: z.enum(['M', 'F', 'O'], { message: 'Gender is required' }),
    mobile_number: z.string()
      .min(10, 'Mobile number must be at least 10 digits')
      .regex(/^\d+$/, 'Mobile number must contain digits only'),
    address: z.string(),
    consulting_doctor_name: z.string(),
    chief_complaint: z.string(),
    notes: z.string(),
  }).optional(),

  // Today's Visit fields
  visit: z.object({
    consulting_doctor: z.string().min(2, 'Consulting doctor name must be at least 2 characters'),
    chief_complaint: z.string().min(1, 'Chief complaint is required'),
    diagnosis: z.string().min(3, 'Diagnosis must be at least 3 characters'),
    treatment_given: z.string().min(1, 'Treatment description is required'),
    prescription_notes: z.string(),
    general_notes: z.string(),
  }),

  // Optional Follow-Up fields
  scheduleFollowUp: z.boolean(),
  appointment: z.object({
    appointment_date: z.string().optional(),
    appointment_time: z.string().optional(),
    appointment_type: z.enum(['CONSULTATION', 'PROCEDURE', 'FOLLOW_UP']).optional(),
    appointment_reason: z.string(),
  }).optional(),
}).superRefine((data, ctx) => {
  // Conditional validation based on patient selection
  if (data.patientSelection === 'existing') {
    if (!data.existingPatient?.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['existingPatient', 'id'],
        message: 'Please select an existing patient from the registry',
      });
    }
  } else {
    // Manually run validation on newPatient sub-object fields
    const newPat = data.newPatient;
    if (!newPat?.full_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPatient', 'full_name'], message: 'Full name is required' });
    }
    if (!newPat?.date_of_birth) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPatient', 'date_of_birth'], message: 'Date of birth is required' });
    }
    if (!newPat?.gender) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPatient', 'gender'], message: 'Gender is required' });
    }
    if (!newPat?.mobile_number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPatient', 'mobile_number'], message: 'Mobile number is required' });
    }
  }

  // Conditional validation for optional follow-up
  if (data.scheduleFollowUp) {
    const appt = data.appointment;
    if (!appt?.appointment_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['appointment', 'appointment_date'],
        message: 'Appointment date is required',
      });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const valDate = new Date(appt.appointment_date);
      if (isNaN(valDate.getTime()) || valDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['appointment', 'appointment_date'],
          message: 'Appointment date must be today or in the future',
        });
      }
    }
    if (!appt?.appointment_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['appointment', 'appointment_time'],
        message: 'Appointment time is required',
      });
    }
    if (!appt?.appointment_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['appointment', 'appointment_type'],
        message: 'Appointment type is required',
      });
    }
  }
});

type FormValues = z.infer<typeof unifiedFormSchema>;

export const UnifiedVisitForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patient_id');
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Queries for searching existing patients & fetching a prefilled patient
  const { data: searchResults, isLoading: loadingPatients } = usePatients(searchQuery, 0);
  const { data: prefilledPatient, isLoading: loadingPrefilled } = usePatient(patientIdParam || '');

  const unifiedMutation = useUnifiedVisit();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(unifiedFormSchema),
    defaultValues: {
      patientSelection: 'new',
      existingPatient: { id: null },
      newPatient: {
        full_name: '',
        date_of_birth: '',
        gender: 'M',
        mobile_number: '',
        address: '',
        consulting_doctor_name: '',
        chief_complaint: '',
        notes: '',
      },
      visit: {
        consulting_doctor: '',
        chief_complaint: '',
        diagnosis: '',
        treatment_given: '',
        prescription_notes: '',
        general_notes: '',
      },
      scheduleFollowUp: false,
      appointment: {
        appointment_date: '',
        appointment_time: '',
        appointment_type: 'CONSULTATION',
        appointment_reason: '',
      },
    },
  });

  const patientSelection = watch('patientSelection');
  const scheduleFollowUp = watch('scheduleFollowUp');
  const visitDoctor = watch('visit.consulting_doctor');

  // Handle incoming patient_id param for "Start Visit" action
  useEffect(() => {
    if (patientIdParam && prefilledPatient) {
      setValue('patientSelection', 'existing');
      setValue('existingPatient.id', prefilledPatient.id);
      setSelectedPatientId(prefilledPatient.id);
      
      // Prefill chief complaint and doctor name into visit fields if available
      setValue('visit.consulting_doctor', prefilledPatient.consulting_doctor_name || '');
      setValue('visit.chief_complaint', prefilledPatient.chief_complaint || '');
    }
  }, [patientIdParam, prefilledPatient, setValue]);

  // Fetch full details of custom selected patient to show in metadata
  const { data: activePatient } = usePatient(selectedPatientId || '');

  const onSubmit = (data: FormValues) => {
    let patientPayload: any = {};

    if (data.patientSelection === 'existing') {
      patientPayload = { id: data.existingPatient?.id };
    } else if (data.newPatient) {
      const calculatedAge = calculateAge(data.newPatient.date_of_birth);
      patientPayload = {
        full_name: data.newPatient.full_name,
        age: calculatedAge,
        gender: data.newPatient.gender,
        mobile_number: data.newPatient.mobile_number,
        address: data.newPatient.address,
        consulting_doctor_name: data.newPatient.consulting_doctor_name,
        chief_complaint: data.newPatient.chief_complaint,
        notes: data.newPatient.notes,
      };
    }

    const visitPayload = {
      consulting_doctor: data.visit.consulting_doctor,
      chief_complaint: data.visit.chief_complaint,
      diagnosis: data.visit.diagnosis,
      treatment_given: data.visit.treatment_given,
      prescription_notes: data.visit.prescription_notes || '',
      general_notes: data.visit.general_notes || '',
    };

    let appointmentPayload = null;
    if (data.scheduleFollowUp && data.appointment) {
      // Append seconds if only HH:MM is supplied
      let formattedTime = data.appointment.appointment_time || '';
      if (formattedTime && formattedTime.split(':').length === 2) {
        formattedTime = `${formattedTime}:00`;
      }
      appointmentPayload = {
        appointment_date: data.appointment.appointment_date,
        appointment_time: formattedTime,
        consulting_doctor: data.visit.consulting_doctor, // default doctor
        appointment_type: data.appointment.appointment_type,
        appointment_reason: data.appointment.appointment_reason || '',
      };
    }

    unifiedMutation.mutate(
      {
        patient: patientPayload,
        visit: visitPayload,
        next_appointment: appointmentPayload,
      },
      {
        onSuccess: (response) => {
          showToast('Unified Patient & Visit details recorded successfully!', 'success');
          reset();
          // Navigate to newly created or pre-selected patient detail page
          navigate(`/patients/${response.patient.id}`);
        },
        onError: (err: any) => {
          const detail = err.response?.data?.detail || 'Failed to submit unified visit.';
          showToast(detail, 'error');
        },
      }
    );
  };

  const handlePatientSelect = (_event: any, patient: Patient | null) => {
    if (patient) {
      setValue('existingPatient.id', patient.id);
      setSelectedPatientId(patient.id);
      // Automatically map doctor info to visit from selection
      if (patient.consulting_doctor_name) {
        setValue('visit.consulting_doctor', patient.consulting_doctor_name);
      }
      if (patient.chief_complaint) {
        setValue('visit.chief_complaint', patient.chief_complaint);
      }
    } else {
      setValue('existingPatient.id', null);
      setSelectedPatientId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 6 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/patients')}
          startIcon={<BackIcon />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          New Visit & Consult Registration
        </Typography>
      </Box>

      {/* Main Unified Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        {unifiedMutation.isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {((unifiedMutation.error as any)?.response?.data?.detail) || 'Failed to complete visit submission. Please verify input fields.'}
          </Alert>
        )}

        {/* Section 1: Patient Information */}
        <Paper sx={{ p: 3, mb: 4, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mb: 2 }}>
            Section 1: Patient Details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>Patient Registry Mode</FormLabel>
            <Controller
              name="patientSelection"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field} id="patient-selection-mode">
                  <FormControlLabel value="new" control={<Radio />} label="Register New Patient" />
                  <FormControlLabel value="existing" control={<Radio />} label="Search Existing Patient" />
                </RadioGroup>
              )}
            />
          </FormControl>

          {patientSelection === 'existing' ? (
            <Box>
              {loadingPrefilled ? (
                <CircularProgress size={24} sx={{ mb: 2 }} />
              ) : (
                <Autocomplete
                  id="patient-autocomplete-search"
                  options={searchResults?.results || []}
                  getOptionLabel={(option: Patient) => `${option.full_name} (${option.mobile_number})`}
                  filterOptions={(x) => x}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  loading={loadingPatients}
                  onInputChange={(_event, value) => setSearchQuery(value)}
                  onChange={handlePatientSelect}
                  value={activePatient || null}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select or Search Patient"
                      variant="outlined"
                      fullWidth
                      error={!!errors.existingPatient?.id}
                      helperText={errors.existingPatient?.id?.message}
                      slotProps={{
                        input: {
                          ...(params as any).InputProps,
                          endAdornment: (
                            <>
                              {loadingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                              {(params as any).InputProps?.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              )}

              {/* Render Demographics Summary */}
              {activePatient && (
                <Paper sx={{ p: 2, mt: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Selected Patient Details</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2"><strong>Name:</strong> {activePatient.full_name}</Typography>
                      <Typography variant="body2">
                        <strong>DOB/Age:</strong> {activePatient.date_of_birth || calculateDobFromAge(activePatient.age)} ({activePatient.date_of_birth ? calculateAge(activePatient.date_of_birth) : activePatient.age} Years)
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2"><strong>Mobile:</strong> {activePatient.mobile_number}</Typography>
                      <Typography variant="body2"><strong>Gender:</strong> {activePatient.gender === 'M' ? 'Male' : activePatient.gender === 'F' ? 'Female' : 'Other'}</Typography>
                    </Grid>
                    {activePatient.address && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2"><strong>Address:</strong> {activePatient.address}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="newPatient.full_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Full Name"
                      fullWidth
                      error={!!errors.newPatient?.full_name}
                      helperText={errors.newPatient?.full_name?.message}
                      id="new-patient-fullname"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="newPatient.date_of_birth"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Date of Birth"
                      type="date"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!errors.newPatient?.date_of_birth}
                      helperText={errors.newPatient?.date_of_birth?.message}
                      id="new-patient-dob"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="newPatient.gender"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Gender"
                      fullWidth
                      error={!!errors.newPatient?.gender}
                      helperText={errors.newPatient?.gender?.message}
                      id="new-patient-gender"
                    >
                      <MenuItem value="M">Male</MenuItem>
                      <MenuItem value="F">Female</MenuItem>
                      <MenuItem value="O">Other</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="newPatient.mobile_number"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Mobile Number"
                      fullWidth
                      error={!!errors.newPatient?.mobile_number}
                      helperText={errors.newPatient?.mobile_number?.message}
                      id="new-patient-mobile"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="newPatient.address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      multiline
                      rows={2}
                      fullWidth
                      id="new-patient-address"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="newPatient.consulting_doctor_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Primary Doctor Name (Optional)"
                      fullWidth
                      id="new-patient-primary-doctor"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="newPatient.chief_complaint"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Chief Complaint (Optional)"
                      fullWidth
                      id="new-patient-chief-complaint"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="newPatient.notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="General Patient Notes (Optional)"
                      multiline
                      rows={2}
                      fullWidth
                      id="new-patient-notes"
                    />
                  )}
                />
              </Grid>
            </Grid>
          )}
        </Paper>

        {/* Section 2: Today's Visit Details */}
        <Paper sx={{ p: 3, mb: 4, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600, mb: 2 }}>
            Section 2: Today's Consultation
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="visit.consulting_doctor"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Consulting Doctor"
                    fullWidth
                    error={!!errors.visit?.consulting_doctor}
                    helperText={errors.visit?.consulting_doctor?.message}
                    id="visit-consulting-doctor"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="visit.chief_complaint"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Today's Chief Complaint"
                    fullWidth
                    error={!!errors.visit?.chief_complaint}
                    helperText={errors.visit?.chief_complaint?.message}
                    id="visit-chief-complaint"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="visit.diagnosis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Diagnosis"
                    multiline
                    rows={2}
                    fullWidth
                    error={!!errors.visit?.diagnosis}
                    helperText={errors.visit?.diagnosis?.message}
                    id="visit-diagnosis"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="visit.treatment_given"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Treatment Given"
                    multiline
                    rows={2}
                    fullWidth
                    error={!!errors.visit?.treatment_given}
                    helperText={errors.visit?.treatment_given?.message}
                    id="visit-treatment-given"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller
                name="visit.prescription_notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Prescriptions / Medications"
                    multiline
                    rows={2}
                    fullWidth
                    id="visit-prescription-notes"
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller
                name="visit.general_notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="General Consultation Notes"
                    multiline
                    rows={2}
                    fullWidth
                    id="visit-general-notes"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Section 3: Optional Follow-Up Appointment */}
        <Paper sx={{ p: 3, mb: 4, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 600 }}>
              Section 3: Follow-Up Appointment
            </Typography>
            <Controller
              name="scheduleFollowUp"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      id="schedule-followup-toggle"
                    />
                  }
                  label="Schedule Follow-Up"
                  sx={{ fontWeight: 600 }}
                />
              )}
            />
          </Box>
          <Divider sx={{ mb: 3 }} />

          {scheduleFollowUp && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="appointment.appointment_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Appointment Date"
                      type="date"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!errors.appointment?.appointment_date}
                      helperText={errors.appointment?.appointment_date?.message}
                      id="followup-appointment-date"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="appointment.appointment_time"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Appointment Time"
                      type="time"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!errors.appointment?.appointment_time}
                      helperText={errors.appointment?.appointment_time?.message}
                      id="followup-appointment-time"
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Controller
                  name="appointment.appointment_type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Appointment Type"
                      fullWidth
                      error={!!errors.appointment?.appointment_type}
                      helperText={errors.appointment?.appointment_type?.message}
                      id="followup-appointment-type"
                    >
                      <MenuItem value="CONSULTATION">Consultation</MenuItem>
                      <MenuItem value="PROCEDURE">Procedure</MenuItem>
                      <MenuItem value="FOLLOW_UP">Follow Up</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Doctor Assignee"
                  value={visitDoctor || ''}
                  disabled
                  fullWidth
                  helperText="Follow-up scheduled with the consulting doctor above."
                  id="followup-doctor-readonly"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Controller
                  name="appointment.appointment_reason"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Appointment Reason / Notes"
                      multiline
                      rows={2}
                      fullWidth
                      id="followup-appointment-reason"
                    />
                  )}
                />
              </Grid>
            </Grid>
          )}
        </Paper>

        {/* Submit Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/patients')}
            disabled={unifiedMutation.isPending}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={unifiedMutation.isPending}
            startIcon={unifiedMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
            id="submit-unified-visit-btn"
          >
            {unifiedMutation.isPending ? 'Saving Record...' : 'Save Consultation Record'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default UnifiedVisitForm;
