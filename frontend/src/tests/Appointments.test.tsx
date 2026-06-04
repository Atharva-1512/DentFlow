/**
 * Tests for TodayAppointments and UpcomingAppointments components.
 * Validates rendering, search filtering, loading/empty/error states,
 * and navigation actions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TodayAppointments from '../pages/Appointments/TodayAppointments';
import UpcomingAppointments from '../pages/Appointments/UpcomingAppointments';
import api from '../services/api';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// MUI X DataGrid renders a complex DOM; mock it simply for unit tests
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows, columns }: any) => (
    <div data-testid="data-grid">
      {rows.map((row: any) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {columns.map((col: any) => (
            <span key={col.field}>
              {col.renderCell
                ? col.renderCell({ value: row[col.field], row, params: row })
                : col.valueGetter
                ? col.valueGetter(row[col.field], row)
                : row[col.field]}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const PATIENT_ID_1 = 'patient-001';
const PATIENT_ID_2 = 'patient-002';

const mockAppointmentsResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 'appt-1',
      patient: PATIENT_ID_1,
      patient_name: 'Alice Smith',
      patient_mobile: '9876543210',
      appointment_date: '2026-06-04',
      appointment_time: '09:00:00',
      consulting_doctor: 'Dr. Jones',
      appointment_type: 'CONSULTATION',
      appointment_type_display: 'Consultation',
      appointment_reason: 'Routine check-up',
      status: 'SCHEDULED',
      created_at: '2026-06-03T00:00:00Z',
      updated_at: '2026-06-03T00:00:00Z',
    },
    {
      id: 'appt-2',
      patient: PATIENT_ID_2,
      patient_name: 'Bob Brown',
      patient_mobile: '1234567890',
      appointment_date: '2026-06-04',
      appointment_time: '11:00:00',
      consulting_doctor: 'Dr. Brown',
      appointment_type: 'FOLLOW_UP',
      appointment_type_display: 'Follow Up',
      appointment_reason: 'Crown fitting',
      status: 'COMPLETED',
      created_at: '2026-06-03T00:00:00Z',
      updated_at: '2026-06-03T00:00:00Z',
    },
  ],
};

const emptyResponse = { count: 0, next: null, previous: null, results: [] };

// Helper to wrap a component in required providers
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

// ============================================================================
// TodayAppointments
// ============================================================================

describe("TodayAppointments Component", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset call counts only — preserves vi.mock() module factories
    mockNavigate.mockReset();
  });

  it('renders page heading', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emptyResponse });
    renderWithProviders(<TodayAppointments />);
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<TodayAppointments />);
    // Skeletons are rendered during loading
    expect(document.querySelector('.MuiSkeleton-root')).toBeTruthy();
  });

  it('shows empty state when no appointments exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emptyResponse });
    renderWithProviders(<TodayAppointments />);
    expect(await screen.findByText(/No appointments scheduled for today/i)).toBeInTheDocument();
  });

  it('shows error alert on API failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Server error'));
    renderWithProviders(<TodayAppointments />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders appointment rows in the DataGrid', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAppointmentsResponse });
    renderWithProviders(<TodayAppointments />);
    expect(await screen.findByTestId('data-grid')).toBeInTheDocument();
    expect(screen.getByTestId(`row-appt-1`)).toBeInTheDocument();
    expect(screen.getByTestId(`row-appt-2`)).toBeInTheDocument();
  });

  it('filters appointments by patient name (client-side)', async () => {
    // Use mockResolvedValue (not Once) so refetch on page-reset also resolves
    vi.mocked(api.get).mockResolvedValue({ data: mockAppointmentsResponse });
    renderWithProviders(<TodayAppointments />);

    // Wait until both rows are rendered
    await screen.findByTestId('row-appt-1');
    await screen.findByTestId('row-appt-2');

    // Type in search — this changes local state, filtering the existing rows
    const searchInput = screen.getByPlaceholderText(/Search by Patient Name/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    // Only Alice's row should remain; Bob's row is filtered out
    await waitFor(() => {
      expect(screen.queryByTestId('row-appt-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('row-appt-1')).toBeInTheDocument();
    });
  });

  it('navigates to patient profile on Open Patient click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAppointmentsResponse });
    renderWithProviders(<TodayAppointments />);

    // Multiple rows => multiple 'Open Patient' buttons; click the first
    const openBtns = await screen.findAllByRole('button', { name: /open patient/i });
    fireEvent.click(openBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith(`/patients/${PATIENT_ID_1}`);
  });

  it('navigates to unified visit form on Start Visit click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAppointmentsResponse });
    renderWithProviders(<TodayAppointments />);

    // Multiple rows => multiple 'Start Visit' buttons; click the first
    const startBtns = await screen.findAllByRole('button', { name: /start visit/i });
    fireEvent.click(startBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/patients/new?patient_id=${PATIENT_ID_1}`
    );
  });
});

// ============================================================================
// UpcomingAppointments
// ============================================================================

describe("UpcomingAppointments Component", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset call counts only — preserves vi.mock() module factories
    mockNavigate.mockReset();
  });

  it('renders page heading', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emptyResponse });
    renderWithProviders(<UpcomingAppointments />);
    expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();
  });

  it('shows empty state when no appointments exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: emptyResponse });
    renderWithProviders(<UpcomingAppointments />);
    expect(await screen.findByText(/No upcoming appointments found/i)).toBeInTheDocument();
  });

  it('renders appointment rows in the DataGrid', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAppointmentsResponse });
    renderWithProviders(<UpcomingAppointments />);
    expect(await screen.findByTestId('data-grid')).toBeInTheDocument();
  });

  it('navigates to patient profile on View Patient click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAppointmentsResponse });
    renderWithProviders(<UpcomingAppointments />);

    // Multiple rows → multiple 'View Patient' buttons; click the first
    const viewBtns = await screen.findAllByRole('button', { name: /view patient/i });
    fireEvent.click(viewBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith(`/patients/${PATIENT_ID_1}`);
  });

  it('navigates to calendar page on Reschedule click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockAppointmentsResponse });
    renderWithProviders(<UpcomingAppointments />);

    // Multiple reschedule buttons exist (one per row); click the first one
    const rescheduleBtns = await screen.findAllByRole('button', { name: /reschedule/i });
    fireEvent.click(rescheduleBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
  });

  it('filters appointments by patient name (client-side)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockAppointmentsResponse });
    renderWithProviders(<UpcomingAppointments />);

    // Wait until both rows are rendered
    await screen.findByTestId('row-appt-1');
    await screen.findByTestId('row-appt-2');

    const searchInput = screen.getByPlaceholderText(/Search by Patient Name/i);
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    // Only Bob's row should remain after filter
    await waitFor(() => {
      expect(screen.queryByTestId('row-appt-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('row-appt-2')).toBeInTheDocument();
    });
  });
});
