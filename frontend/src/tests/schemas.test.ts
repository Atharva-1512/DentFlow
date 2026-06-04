/**
 * Tests for UnifiedVisitForm Zod schema validation logic.
 *
 * We test the schema directly rather than the full component render
 * to keep tests fast and isolated. Component integration is tested
 * separately in the PatientList and guards test files.
 */
import { describe, it, expect } from 'vitest';
import { unifiedVisitSchema, patientSchema, visitSchema, appointmentSchema } from '../utils/schemas';

// ---------------------------------------------------------------------------
// patientSchema tests
// ---------------------------------------------------------------------------

describe('patientSchema', () => {
  const validPatient = {
    full_name: 'Alice Cooper',
    date_of_birth: '1990-01-01',
    gender: 'F' as const,
    mobile_number: '9876543210',
    address: '123 Main St',
    consulting_doctor_name: 'Dr. Smith',
    chief_complaint: 'Toothache',
    notes: '',
  };

  it('accepts a valid patient payload', () => {
    const result = patientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  it('rejects full_name shorter than 2 chars', () => {
    const result = patientSchema.safeParse({ ...validPatient, full_name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('full_name');
    }
  });

  it('rejects a future date_of_birth', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = patientSchema.safeParse({
      ...validPatient,
      date_of_birth: future.toISOString().split('T')[0],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('date_of_birth');
    }
  });

  it('rejects mobile numbers with non-digit characters', () => {
    const result = patientSchema.safeParse({ ...validPatient, mobile_number: '98765-ABCD' });
    expect(result.success).toBe(false);
  });

  it('rejects mobile numbers shorter than 10 digits', () => {
    const result = patientSchema.safeParse({ ...validPatient, mobile_number: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid gender values', () => {
    const result = patientSchema.safeParse({ ...validPatient, gender: 'X' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// visitSchema tests
// ---------------------------------------------------------------------------

describe('visitSchema', () => {
  const validVisit = {
    consulting_doctor: 'Dr. Smith',
    chief_complaint: 'Tooth pain',
    diagnosis: 'Dental caries',
    treatment_given: 'Filling applied',
    prescription_notes: '',
    general_notes: '',
  };

  it('accepts a valid visit payload', () => {
    const result = visitSchema.safeParse(validVisit);
    expect(result.success).toBe(true);
  });

  it('rejects consulting_doctor shorter than 2 chars', () => {
    const result = visitSchema.safeParse({ ...validVisit, consulting_doctor: 'D' });
    expect(result.success).toBe(false);
  });

  it('rejects empty chief_complaint', () => {
    const result = visitSchema.safeParse({ ...validVisit, chief_complaint: '' });
    expect(result.success).toBe(false);
  });

  it('rejects diagnosis shorter than 3 chars', () => {
    const result = visitSchema.safeParse({ ...validVisit, diagnosis: 'No' });
    expect(result.success).toBe(false);
  });

  it('rejects empty treatment_given', () => {
    const result = visitSchema.safeParse({ ...validVisit, treatment_given: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// appointmentSchema tests
// ---------------------------------------------------------------------------

describe('appointmentSchema', () => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const pastDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // yesterday
  const pastDateStr = pastDate.toISOString().split('T')[0];

  const validAppt = {
    appointment_date: futureDateStr,
    appointment_time: '10:00',
    appointment_type: 'FOLLOW_UP' as const,
    appointment_reason: 'Check progress',
    consulting_doctor: 'Dr. Smith',
  };

  it('accepts a valid future appointment', () => {
    const result = appointmentSchema.safeParse(validAppt);
    expect(result.success).toBe(true);
  });

  it('rejects past appointment dates', () => {
    const result = appointmentSchema.safeParse({ ...validAppt, appointment_date: pastDateStr });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('appointment_date');
    }
  });

  it('rejects invalid appointment_type', () => {
    const result = appointmentSchema.safeParse({ ...validAppt, appointment_type: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects empty appointment_time', () => {
    const result = appointmentSchema.safeParse({ ...validAppt, appointment_time: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// unifiedVisitSchema tests (conditional validation)
// ---------------------------------------------------------------------------

describe('unifiedVisitSchema — conditional validation', () => {
  const validVisit = {
    consulting_doctor: 'Dr. Smith',
    chief_complaint: 'Tooth pain',
    diagnosis: 'Dental caries',
    treatment_given: 'Filling applied',
  };

  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  it('accepts an existing patient selection with a UUID id', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'existing',
      existingPatient: { id: '550e8400-e29b-41d4-a716-446655440000' },
      visit: validVisit,
      scheduleFollowUp: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects existing patient selection with no ID', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'existing',
      existingPatient: { id: null },
      visit: validVisit,
      scheduleFollowUp: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('existingPatient.id');
    }
  });

  it('accepts a new patient with all required fields', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'new',
      newPatient: {
        full_name: 'Bob Builder',
        date_of_birth: '1985-05-15',
        gender: 'M',
        mobile_number: '9876543210',
      },
      visit: validVisit,
      scheduleFollowUp: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a new patient without required fields', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'new',
      newPatient: {},
      visit: validVisit,
      scheduleFollowUp: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('newPatient.full_name');
      expect(paths).toContain('newPatient.date_of_birth');
      expect(paths).toContain('newPatient.gender');
      expect(paths).toContain('newPatient.mobile_number');
    }
  });

  it('requires appointment fields when scheduleFollowUp is true', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'existing',
      existingPatient: { id: '550e8400-e29b-41d4-a716-446655440000' },
      visit: validVisit,
      scheduleFollowUp: true,
      appointment: {}, // missing required fields
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('appointment.appointment_date');
      expect(paths).toContain('appointment.appointment_time');
      expect(paths).toContain('appointment.appointment_type');
    }
  });

  it('accepts a valid follow-up appointment when scheduleFollowUp is true', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'existing',
      existingPatient: { id: '550e8400-e29b-41d4-a716-446655440000' },
      visit: validVisit,
      scheduleFollowUp: true,
      appointment: {
        appointment_date: futureDateStr,
        appointment_time: '09:30',
        appointment_type: 'CONSULTATION',
        appointment_reason: 'Check-up',
      },
    });
    expect(result.success).toBe(true);
  });

  it('skips appointment validation when scheduleFollowUp is false', () => {
    const result = unifiedVisitSchema.safeParse({
      patientSelection: 'existing',
      existingPatient: { id: '550e8400-e29b-41d4-a716-446655440000' },
      visit: validVisit,
      scheduleFollowUp: false,
      // No appointment provided — should still pass
    });
    expect(result.success).toBe(true);
  });
});
