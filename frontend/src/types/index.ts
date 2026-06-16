export interface Clinic {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  notification_whatsapp_number?: string;
  address?: string;
  created_at: string;
  // Optional client-side state for Super Admin stats mapping
  subscription_status?: 'TRIAL' | 'ACTIVE' | 'PAYMENT_DUE' | 'EXPIRED' | 'CANCELLED';
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'SUPER_ADMIN' | 'CLINIC_OWNER';
  clinic: Clinic | null;
  created_at: string;
  all_clinics?: Clinic[]; // Returned for Super Admins in /accounts/me/
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  price: number; // Decimal in python represented as number/string in JSON
  billing_cycle: string;
  is_active: boolean;
}

export interface ClinicSubscription {
  id: string;
  clinic: string;
  plan: SubscriptionPlan;
  status: 'TRIAL' | 'ACTIVE' | 'PAYMENT_DUE' | 'EXPIRED' | 'CANCELLED';
  trial_start_date: string | null;
  trial_end_date: string | null;
  start_date: string | null;
  next_billing_date: string | null;
  grace_period_end_date: string | null;
  cancelled_at: string | null;
  trial_days_remaining: number;
}

export interface Patient {
  id: string;
  patient_id?: string;
  full_name: string;
  /**
   * Backend serializer exposes `age` as a computed integer for reads.
   * Frontend ALWAYS calculates age from date_of_birth for display.
   * Use calculateAge() from utils/date.ts — do not use age directly.
   */
  age: number;
  date_of_birth?: string; // ISO YYYY-MM-DD — present when set on patient record
  gender: 'M' | 'F' | 'O';
  mobile_number: string;
  address: string;
  consulting_doctor_name: string;
  chief_complaint: string;
  notes: string;
  created_date: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient: string; // Patient ID
  patient_name?: string;
  patient_mobile?: string;
  appointment_date: string;
  appointment_time: string;
  consulting_doctor: string;
  appointment_type: 'CONSULTATION' | 'PROCEDURE' | 'FOLLOW_UP';
  appointment_type_display: string;
  appointment_reason: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  patient: string; // Patient ID
  visit_date: string;
  consulting_doctor: string;
  chief_complaint: string;
  diagnosis: string;
  treatment_given: string;
  prescription_notes: string;
  general_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Timeline event returned by GET /api/patients/:id/timeline/
 * The backend sorts and merges visits and appointments into a single array.
 * Discriminate by event_type field.
 */
export type TimelineEvent =
  | (Visit & { event_type: 'VISIT' })
  | (Appointment & { event_type: 'APPOINTMENT' });

// API Pagination Response wrapper
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BillTreatment {
  id?: string;
  treatment_name: string;
  treatment_date: string;
  quantity: number;
  cost: number | string;
}

export interface BillPayment {
  id?: string;
  payment_date: string;
  amount_paid: number | string;
  payment_mode: 'UPI' | 'CASH' | 'CARD' | 'NET_BANKING' | 'OTHER';
}

export interface Bill {
  id?: string;
  patient?: string; // Patient ID (optional now)
  patient_id?: string;
  patient_name?: string;
  patient_mobile?: string;
  patient_age?: string | number;
  patient_gender?: 'M' | 'F' | 'O';
  bill_number?: string;
  bill_date: string;
  doctor_name: string;
  total_cost: number | string;
  grand_total: number | string;
  amount_paid: number | string;
  outstanding_balance?: number | string;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  clinic_address: string;
  clinic_contact: string;
  treatments: BillTreatment[];
  payments: BillPayment[];
  created_at?: string;
  updated_at?: string;
}
