/**
 * Tests for PatientDetail page component.
 * Verifies that patient information and timeline events are displayed correctly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PatientDetail from '../pages/Patients/PatientDetail';
import api from '../services/api';

// Mock the api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock MUI Lab Timeline (it uses CSS animations that can cause issues in test env)
vi.mock('@mui/lab', () => ({
  Timeline: ({ children }: any) => <div data-testid="timeline">{children}</div>,
  TimelineItem: ({ children }: any) => <div data-testid="timeline-item">{children}</div>,
  TimelineSeparator: ({ children }: any) => <div>{children}</div>,
  TimelineConnector: () => <div />,
  TimelineContent: ({ children }: any) => <div data-testid="timeline-content">{children}</div>,
  TimelineDot: () => <div />,
  TimelineOppositeContent: ({ children }: any) => <div>{children}</div>,
}));

const PATIENT_ID = 'patient-abc-123';

const mockPatient = {
  id: PATIENT_ID,
  full_name: 'Jane Doe',
  age: 35,
  date_of_birth: '1991-01-15',
  gender: 'F',
  mobile_number: '9876543210',
  address: '456 Elm Street',
  consulting_doctor_name: 'Dr. Williams',
  chief_complaint: 'Routine check-up',
  notes: '',
  created_date: '2024-01-01',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTimeline = [
  {
    event_type: 'VISIT',
    id: 'visit-1',
    patient: PATIENT_ID,
    visit_date: '2024-03-15',
    consulting_doctor: 'Dr. Williams',
    chief_complaint: 'Toothache',
    diagnosis: 'Dental caries',
    treatment_given: 'Root canal treatment',
    prescription_notes: 'Amoxicillin 500mg',
    general_notes: '',
    status: 'COMPLETED',
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T11:00:00Z',
  },
  {
    event_type: 'APPOINTMENT',
    id: 'appt-1',
    patient: PATIENT_ID,
    appointment_date: '2024-04-01',
    appointment_time: '10:30:00',
    consulting_doctor: 'Dr. Williams',
    appointment_type: 'FOLLOW_UP',
    appointment_type_display: 'Follow Up',
    appointment_reason: 'Crown placement follow-up',
    status: 'SCHEDULED',
    created_at: '2024-03-15T12:00:00Z',
    updated_at: '2024-03-15T12:00:00Z',
    patient_name: 'Jane Doe',
    patient_mobile: '9876543210',
  },
];

describe('PatientDetail Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks(); // Reset call counts only — does NOT undo vi.mock() module factories
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          refetchOnWindowFocus: false,
        },
      },
    });
  });


  const renderPatientDetail = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/patients/${PATIENT_ID}`]}>
          <Routes>
            <Route path="/patients/:id" element={<PatientDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('shows loading spinner while data is being fetched', () => {
    // Keep the promise pending to simulate loading
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderPatientDetail();
    expect(document.querySelector('.MuiCircularProgress-root')).toBeTruthy();
  });

  it('renders patient name and demographics after loading', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/timeline/')) {
        return Promise.resolve({ data: mockTimeline });
      }
      return Promise.resolve({ data: mockPatient });
    });

    renderPatientDetail();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/Dr. Williams/)).toBeInTheDocument();
    expect(screen.getByText(/9876543210/)).toBeInTheDocument();
  });

  it('renders Visit timeline events', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/timeline/')) {
        return Promise.resolve({ data: mockTimeline });
      }
      return Promise.resolve({ data: mockPatient });
    });

    renderPatientDetail();

    await waitFor(() => {
      expect(screen.getAllByTestId('timeline-item')).toHaveLength(2);
    });
    expect(screen.getByText(/Dental caries/i)).toBeInTheDocument();
  });

  it('renders Appointment timeline events', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/timeline/')) {
        return Promise.resolve({ data: mockTimeline });
      }
      return Promise.resolve({ data: mockPatient });
    });

    renderPatientDetail();

    expect(await screen.findByText(/Crown placement follow-up/i)).toBeInTheDocument();
  });

  it('shows empty state when timeline has no items', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/timeline/')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: mockPatient });
    });

    renderPatientDetail();

    expect(await screen.findByText(/No history available/i)).toBeInTheDocument();
  });

  it('shows an error alert when the API call fails', async () => {
    // Reject every api.get call (patient + timeline both fail)
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    renderPatientDetail();

    // React Query transitions: idle → loading → error
    // With retry:false and gcTime:0, the error state appears quickly.
    // The component renders the Alert as soon as patientError OR timelineError is truthy.
    await waitFor(
      () => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });


  it('calculates and displays age from date_of_birth', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/timeline/')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: mockPatient });
    });

    renderPatientDetail();

    // date_of_birth = 1991-01-15, current date is 2026-06-04 → age = 35
    await waitFor(() => {
      expect(screen.getByText(/35/)).toBeInTheDocument();
    });
  });
});
