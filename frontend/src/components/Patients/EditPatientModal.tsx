import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import type { Patient } from '../../types';
import { useUpdatePatient } from '../../hooks/useApi';
import { toastRef } from '../../context/ToastContext';

const patientSchema = zod.object({
  full_name: zod.string().min(1, 'Full name is required'),
  age: zod.coerce.number().min(0, 'Age must be positive'),
  gender: zod.enum(['M', 'F', 'O']),
  mobile_number: zod.string().min(10, 'Valid mobile number required'),
  address: zod.string().optional(),
  consulting_doctor_name: zod.string().min(1, 'Consulting doctor required'),
  chief_complaint: zod.string().optional(),
  notes: zod.string().optional(),
});


interface EditPatientModalProps {
  open: boolean;
  onClose: () => void;
  patient: Patient;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({ open, onClose, patient }) => {
  const updatePatient = useUpdatePatient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: patient.full_name,
      age: patient.age,
      gender: patient.gender,
      mobile_number: patient.mobile_number,
      address: patient.address || '',
      consulting_doctor_name: patient.consulting_doctor_name,
      chief_complaint: patient.chief_complaint || '',
      notes: patient.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        full_name: patient.full_name,
        age: patient.age,
        gender: patient.gender,
        mobile_number: patient.mobile_number,
        address: patient.address || '',
        consulting_doctor_name: patient.consulting_doctor_name,
        chief_complaint: patient.chief_complaint || '',
        notes: patient.notes || '',
      });
    }
  }, [open, patient, reset]);

  const onSubmit = async (data: any) => {
    try {
      await updatePatient.mutateAsync({ id: patient.id, data });
      toastRef.show('Patient updated successfully', 'success');
      onClose();
    } catch (error: any) {
      toastRef.show(error.response?.data?.detail || 'Failed to update patient', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Patient Record</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                {...register('full_name')}
                label="Full Name *"
                fullWidth
                error={!!errors.full_name}
                helperText={errors.full_name?.message as string}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('age')}
                label="Age"
                type="number"
                fullWidth
                error={!!errors.age}
                helperText={errors.age?.message as string}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('gender')}
                select
                label="Gender *"
                fullWidth
                defaultValue={patient.gender}
                error={!!errors.gender}
                helperText={errors.gender?.message as string}
              >
                <MenuItem value="M">Male</MenuItem>
                <MenuItem value="F">Female</MenuItem>
                <MenuItem value="O">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('mobile_number')}
                label="Mobile Number *"
                fullWidth
                error={!!errors.mobile_number}
                helperText={errors.mobile_number?.message as string}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                {...register('consulting_doctor_name')}
                label="Consulting Doctor *"
                fullWidth
                error={!!errors.consulting_doctor_name}
                helperText={errors.consulting_doctor_name?.message as string}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                {...register('address')}
                label="Address"
                fullWidth
                multiline
                rows={2}
                error={!!errors.address}
                helperText={errors.address?.message as string}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                {...register('chief_complaint')}
                label="Chief Complaint"
                fullWidth
                multiline
                rows={2}
                error={!!errors.chief_complaint}
                helperText={errors.chief_complaint?.message as string}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                {...register('notes')}
                label="Notes"
                fullWidth
                multiline
                rows={2}
                error={!!errors.notes}
                helperText={errors.notes?.message as string}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
