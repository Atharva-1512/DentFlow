export interface Doctor {
  id: string;
  name: string;
  qualification: string;
  fee: number;
  specialization: string;
  shift: string;
}

export interface TreatmentCatalogItem {
  id: string;
  name: string;
  category: string;
  default_cost: number;
  duration: string;
}

export interface HolidayItem {
  id: string;
  date: string;
  reason: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  notification_whatsapp_number?: string;
  address?: string;
  dci_number?: string;
  gst_number?: string;
  invoice_prefix?: string;
  tax_rate?: number;
  terms_and_conditions?: string;
  slot_duration?: number;
  opening_time?: string;
  closing_time?: string;
  break_start?: string;
  break_end?: string;
  working_days?: string[];
  doctors?: Doctor[];
  treatments_catalog?: TreatmentCatalogItem[];
  holidays?: HolidayItem[];
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
  patient_id?: string;
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

export interface BaseTimelineItem {
  id: string;
  type: 'VISIT' | 'APPOINTMENT' | 'PAYMENT';
  date: string;
  doctor?: string;
  title?: string;
  description?: string;
  prescription?: string;
  notes?: string;
  status?: string;
  amount_paid?: number;
  payment_mode?: string;
  bill_number?: string;
}

export type TimelineEvent = BaseTimelineItem;

// API Pagination Response wrapper
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LabWorkOrder {
  id?: string;
  patient_id?: string;
  patient_name: string;
  patient_mobile?: string;
  lab_name: string;
  work_description: string;
  order_date: string;
  delivery_date?: string;
  total_cost: number;
  amount_paid: number;
  pending_amount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  created_at?: string;
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
