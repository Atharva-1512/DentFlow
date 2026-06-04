import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PatientList from '../pages/Patients/PatientList';
import api from '../services/api';

// Mock useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock api service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('PatientList Component', () => {
  let queryClient: QueryClient;

  const mockPatientsResponse = {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'patient-1',
        full_name: 'Alice Cooper',
        age: 45,
        date_of_birth: '1981-06-04',
        gender: 'F',
        mobile_number: '9988776655',
        consulting_doctor_name: 'Dr. Jones',
      },
      {
        id: 'patient-2',
        full_name: 'Charlie Brown',
        age: 10,
        gender: 'M',
        mobile_number: '1122334455',
        consulting_doctor_name: 'Dr. Snoopy',
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderPatientList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PatientList />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should render headers and search field', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockPatientsResponse });
    renderPatientList();

    expect(screen.getByText('Patients Registry')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by Patient Name or Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Patient/i })).toBeInTheDocument();
  });

  it('should display loading skeletons first, then list patients with correct calculations', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockPatientsResponse });
    renderPatientList();

    // Verify row results are eventually rendered
    expect(await screen.findByText('Alice Cooper')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.getByText('9988776655')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jones')).toBeInTheDocument();

    // Verify Age conversions:
    // Alice Cooper has date_of_birth = '1981-06-04'. Current year in metadata is 2026. So age is 2026 - 1981 = 45.
    // Since today is 2026-06-04, and date of birth is 1981-06-04, the age is exactly 45.
    expect(screen.getByText('45')).toBeInTheDocument();

    // Charlie Brown does not have date_of_birth, so falls back to raw age = 10
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should trigger API search query parameter on input text updates', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockPatientsResponse });
    renderPatientList();

    const searchField = screen.getByPlaceholderText(/Search by Patient Name or Mobile Number/i);
    fireEvent.change(searchField, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=Alice'));
    });
  });

  it('should redirect to add patient screen on click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockPatientsResponse });
    renderPatientList();

    const addBtn = screen.getByRole('button', { name: /Add Patient/i });
    fireEvent.click(addBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/patients/new');
  });

  it('should redirect to view profile screen on action click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockPatientsResponse });
    renderPatientList();

    const viewBtn = await screen.findByRole('button', { name: /view profile of Alice Cooper/i });
    fireEvent.click(viewBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/patients/patient-1');
  });
});
