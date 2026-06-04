/**
 * Shared Zod validation schemas for DentFlow forms.
 *
 * All schemas are derived directly from backend serializer contracts.
 * Do NOT add fields that do not exist in the backend API.
 *
 * Backend references:
 *  - patients/serializers.py  → PatientSerializer
 *  - visits/serializers.py    → VisitSerializer, UnifiedVisitSerializer
 *  - appointments/serializers.py → AppointmentSerializer
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Patient schema (maps to backend PatientSerializer)
// ---------------------------------------------------------------------------

export const patientSchema = z.object({
  full_name: z
    .string({ message: 'Full name is required' })
    .min(2, 'Full name must be at least 2 characters'),

  date_of_birth: z.string().refine((val) => {
    if (!val) return false;
    const d = new Date(val);
    return !isNaN(d.getTime()) && d < new Date();
  }, 'Date of birth must be a valid past date'),

  gender: z.enum(['M', 'F', 'O'], {
    message: 'Gender is required',
  }),

  mobile_number: z
    .string({ message: 'Mobile number is required' })
    .min(10, 'Mobile number must be at least 10 digits')
    .regex(/^\d+$/, 'Mobile number must contain digits only'),

  address: z.string().optional().default(''),
  consulting_doctor_name: z.string().optional().default(''),
  chief_complaint: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

// ---------------------------------------------------------------------------
// Visit schema (maps to backend VisitSerializer)
// ---------------------------------------------------------------------------

export const visitSchema = z.object({
  consulting_doctor: z
    .string({ message: 'Consulting doctor is required' })
    .min(2, 'Consulting doctor name must be at least 2 characters'),

  chief_complaint: z
    .string({ message: 'Chief complaint is required' })
    .min(1, 'Chief complaint is required'),

  diagnosis: z
    .string({ message: 'Diagnosis is required' })
    .min(3, 'Diagnosis must be at least 3 characters'),

  treatment_given: z
    .string({ message: 'Treatment is required' })
    .min(1, 'Treatment description is required'),

  prescription_notes: z.string().optional().default(''),
  general_notes: z.string().optional().default(''),
});

export type VisitFormValues = z.infer<typeof visitSchema>;

// ---------------------------------------------------------------------------
// Appointment schema (maps to backend AppointmentSerializer)
// ---------------------------------------------------------------------------

export const appointmentSchema = z.object({
  appointment_date: z.string().refine((val) => {
    if (!val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(val);
    return !isNaN(d.getTime()) && d >= today;
  }, 'Appointment date must be today or in the future'),

  appointment_time: z
    .string({ message: 'Appointment time is required' })
    .min(1, 'Appointment time is required'),

  appointment_type: z.enum(['CONSULTATION', 'PROCEDURE', 'FOLLOW_UP'], {
    message: 'Appointment type is required',
  }),

  appointment_reason: z.string().optional().default(''),
  consulting_doctor: z.string().optional().default(''),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// ---------------------------------------------------------------------------
// Unified Visit schema (full form: patient + visit + optional appointment)
// ---------------------------------------------------------------------------

export const unifiedVisitSchema = z
  .object({
    patientSelection: z.enum(['existing', 'new']),

    // Existing patient selection (only id is needed)
    existingPatient: z
      .object({
        id: z.string().uuid('Invalid patient identifier').nullable(),
      })
      .optional(),

    // New patient fields — validated conditionally in superRefine
    newPatient: patientSchema.optional(),

    // Today's visit — always required
    visit: visitSchema,

    // Follow-up toggle
    scheduleFollowUp: z.boolean(),

    // Optional follow-up appointment — validated conditionally in superRefine
    appointment: appointmentSchema.partial().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional: existing patient must have an ID
    if (data.patientSelection === 'existing') {
      if (!data.existingPatient?.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['existingPatient', 'id'],
          message: 'Please select an existing patient from the registry',
        });
      }
    } else {
      // Conditional: new patient fields are required
      const np = data.newPatient;
      if (!np?.full_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newPatient', 'full_name'],
          message: 'Full name is required',
        });
      }
      if (!np?.date_of_birth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newPatient', 'date_of_birth'],
          message: 'Date of birth is required',
        });
      }
      if (!np?.gender) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newPatient', 'gender'],
          message: 'Gender is required',
        });
      }
      if (!np?.mobile_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newPatient', 'mobile_number'],
          message: 'Mobile number is required',
        });
      }
    }

    // Conditional: follow-up appointment fields required when toggle is on
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
        const val = new Date(appt.appointment_date);
        if (isNaN(val.getTime()) || val < today) {
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

export type UnifiedVisitFormValues = z.infer<typeof unifiedVisitSchema>;
