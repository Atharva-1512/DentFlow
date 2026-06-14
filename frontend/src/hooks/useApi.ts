import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import type {
  Patient,
  Appointment,
  Visit,
  TimelineEvent,
  ClinicSubscription,
  PaginatedResponse,
  Bill,
} from '../types';

// ---------------------------------------------------------------------------
// Patient hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a single patient by ID.
 * Endpoint: GET /api/patients/:id/
 */
export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const res = await api.get(`/patients/${id}/`);
      return res.data as Patient;
    },
    enabled: !!id,
    retry: 1,
  });
};

/**
 * Fetch a paginated, searchable list of patients.
 * Endpoint: GET /api/patients/?page=&search=
 */
export const usePatients = (searchTerm = '', page = 0) => {
  return useQuery({
    queryKey: ['patients', searchTerm, page],
    queryFn: async () => {
      const apiPage = page + 1;
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const res = await api.get(`/patients/?page=${apiPage}${searchParam}`);
      return res.data as PaginatedResponse<Patient>;
    },
    retry: 1,
  });
};

/**
 * Fetch the chronological timeline for a patient (visits + appointments merged).
 * Endpoint: GET /api/patients/:id/timeline/
 */
export const usePatientTimeline = (id: string) => {
  return useQuery({
    queryKey: ['patient-timeline', id],
    queryFn: async () => {
      const res = await api.get(`/patients/${id}/timeline/`);
      return res.data as TimelineEvent[];
    },
    enabled: !!id,
    retry: 1,
  });
};

/**
 * Update an existing patient.
 * Endpoint: PATCH /api/patients/:id/
 */
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const res = await api.patch(`/patients/${id}/`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
};

// ---------------------------------------------------------------------------
// Appointment hooks
// ---------------------------------------------------------------------------

/**
 * Fetch today's appointments (server-side filtered by today's date).
 * Endpoint: GET /api/appointments/?today=true&page=
 * Note: search filtering is done client-side; searchTerm is NOT in the queryKey
 * to avoid re-fetching on every keystroke.
 */
export const useTodayAppointments = (_searchTerm = '', page = 0) => {
  return useQuery({
    queryKey: ['appointments', 'today', page],
    queryFn: async () => {
      const apiPage = page + 1;
      const res = await api.get(`/appointments/?today=true&page=${apiPage}`);
      return res.data as PaginatedResponse<Appointment>;
    },
    retry: 1,
  });
};

/**
 * Fetch upcoming (future) appointments.
 * Endpoint: GET /api/appointments/?upcoming=true&page=
 * Note: search filtering is done client-side; searchTerm is NOT in the queryKey
 * to avoid re-fetching on every keystroke.
 */
export const useUpcomingAppointments = (_searchTerm = '', page = 0) => {
  return useQuery({
    queryKey: ['appointments', 'upcoming', page],
    queryFn: async () => {
      const apiPage = page + 1;
      const res = await api.get(`/appointments/?upcoming=true&page=${apiPage}`);
      return res.data as PaginatedResponse<Appointment>;
    },
    retry: 1,
  });
};

/**
 * Fetch all calendar events for a date range.
 * Endpoint: GET /api/calendar/events/?start=&end=
 */
export const useCalendarEvents = (start: string, end: string) => {
  return useQuery({
    queryKey: ['calendar', start, end],
    queryFn: async () => {
      const res = await api.get(`/calendar/events/?start=${start}&end=${end}`);
      return res.data;
    },
    enabled: !!start && !!end,
    retry: 1,
  });
};

// ---------------------------------------------------------------------------
// Subscription hook
// ---------------------------------------------------------------------------

/**
 * Fetch the current clinic's active subscription.
 * Endpoint: GET /api/subscriptions/current/
 */
export const useSubscription = () => {
  return useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/current/');
      return res.data as ClinicSubscription;
    },
    retry: 1,
    staleTime: 60_000, // 1 min — billing data rarely changes mid-session
  });
};

// ---------------------------------------------------------------------------
// Unified Visit mutation
// ---------------------------------------------------------------------------

/**
 * Mutation hook to submit the Unified Visit form.
 * Creates a Patient (if new), logs a Visit, and optionally creates a follow-up Appointment.
 * Endpoint: POST /api/visits/unified/
 */
export const useUnifiedVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      patient: Partial<Patient> & { id?: string };
      visit: Partial<Visit>;
      next_appointment?: Partial<Appointment> | null;
    }) => {
      const res = await api.post('/visits/unified/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate queries to trigger re-fetch of fresh data
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      if (data.patient?.id) {
        queryClient.invalidateQueries({ queryKey: ['patient', data.patient.id] });
        queryClient.invalidateQueries({ queryKey: ['patient-timeline', data.patient.id] });
      }
    },
  });
};

/**
 * Mutation hook to create a subscription session (mock or real Razorpay).
 * Endpoint: POST /api/subscriptions/create/
 */
export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planCode: string) => {
      const res = await api.post('/subscriptions/create/', { plan_code: planCode });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
};

/**
 * Mutation hook to cancel active subscription.
 * Endpoint: POST /api/subscriptions/cancel/
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/subscriptions/cancel/');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
};

/**
 * Mutation hook to simulate mock webhook event payment capture (for local development).
 * Endpoint: POST /api/webhooks/razorpay/
 */
export const useSimulateWebhook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      event: string;
      payload: any;
    }) => {
      const res = await api.post('/webhooks/razorpay/', payload);
      return res.data;
    },
    onSuccess: () => {
      // Refresh user profile and current subscription status from backend
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};


// ---------------------------------------------------------------------------
// Billing Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a single bill by ID.
 * Endpoint: GET /api/visits/bills/:id/
 */
export const useBill = (id: string) => {
  return useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      const res = await api.get(`/visits/bills/${id}/`);
      return res.data as Bill;
    },
    enabled: !!id,
    retry: 1,
  });
};

/**
 * Fetch a paginated list of bills.
 * Endpoint: GET /api/visits/bills/
 */
export const useBills = (searchTerm = '', page = 0) => {
  return useQuery({
    queryKey: ['bills', searchTerm, page],
    queryFn: async () => {
      const apiPage = page + 1;
      const searchParam = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const separator = searchParam ? '&' : '?';
      const res = await api.get(`/visits/bills/${separator}page=${apiPage}${searchParam}`);
      return res.data as PaginatedResponse<Bill>;
    },
    retry: 1,
  });
};

/**
 * Fetch past bills for a specific patient.
 */
export const usePatientBills = (patientId: string) => {
  return useQuery({
    queryKey: ['bills', 'patient', patientId],
    queryFn: async () => {
      const res = await api.get(`/visits/bills/?patient=${patientId}`);
      return res.data as PaginatedResponse<Bill>;
    },
    enabled: !!patientId,
    retry: 1,
  });
};

/**
 * Create a new bill.
 * Endpoint: POST /api/visits/bills/
 */
export const useCreateBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Bill>) => {
      const res = await api.post('/visits/bills/', data);
      return res.data as Bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
};

/**
 * Update an existing bill (e.g., to record a new payment/installment).
 * Endpoint: PUT /api/visits/bills/:id/
 */
export const useUpdateBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Bill> }) => {
      const res = await api.put(`/visits/bills/${id}/`, data);
      return res.data as Bill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bill', data.id] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
};
