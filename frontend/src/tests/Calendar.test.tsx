import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Calendar from '../pages/Calendar';
import api from '../services/api';

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock FullCalendar to keep tests robust and simple in jsdom
vi.mock('@fullcalendar/react', () => ({
  __esModule: true,
  default: ({ events, eventClick, datesSet }: any) => {
    // Simulate datesSet trigger on mount to trigger api queries
    React.useEffect(() => {
      if (datesSet) {
        datesSet({
          startStr: '2026-06-01T00:00:00Z',
          endStr: '2026-07-01T00:00:00Z',
          start: new Date('2026-06-01'),
          end: new Date('2026-07-01'),
          view: { type: 'dayGridMonth', title: 'June 2026' }
        });
      }
    }, []);

    return (
      <div data-testid="mock-calendar">
        <div data-testid="calendar-events">
          {events?.map((evt: any) => (
            <button
              key={evt.id}
              data-testid={`event-node-${evt.id}`}
              onClick={() => eventClick && eventClick({ event: evt })}
            >
              {evt.title}
            </button>
          ))}
        </div>
      </div>
    );
  }
}));

// Dummy plugins mocks (since we mock fullcalendar container itself)
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

const mockEventsResponse = [
  {
    id: 'appt-1',
    title: 'Alice Smith - Consultation',
    start: '2026-06-04T09:00:00',
    end: '2026-06-04T09:30:00',
    className: 'appt-scheduled',
    extendedProps: {
      patient_name: 'Alice Smith',
      mobile_number: '9876543210',
      consulting_doctor: 'Dr. Jones',
      appointment_reason: 'Routine check-up',
      appointment_type: 'CONSULTATION',
      status: 'SCHEDULED',
    },
  },
  {
    id: 'appt-2',
    title: 'Bob Brown - Follow Up',
    start: '2026-06-04T11:00:00',
    end: '2026-06-04T11:30:00',
    className: 'appt-completed',
    extendedProps: {
      patient_name: 'Bob Brown',
      mobile_number: '1234567890',
      consulting_doctor: 'Dr. Brown',
      appointment_reason: 'Crown fitting',
      appointment_type: 'FOLLOW_UP',
      status: 'COMPLETED',
    },
  },
];

describe('Calendar Page Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          retryDelay: 0,
        },
      },
    });
  });

  const renderCalendar = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Calendar />
      </QueryClientProvider>
    );
  };

  it('renders page heading details', () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });
    renderCalendar();
    expect(screen.getByText('Clinic Calendar')).toBeInTheDocument();
    expect(screen.getByText(/View, schedule, and track/i)).toBeInTheDocument();
  });

  it('loads events from API on mount matching datesSet bounds', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockEventsResponse });
    renderCalendar();

    // Verify events render in mocked FullCalendar component
    expect(await screen.findByTestId('event-node-appt-1')).toBeInTheDocument();
    expect(screen.getByTestId('event-node-appt-2')).toBeInTheDocument();

    // Assert endpoint parameters called correspond with datesSet range
    expect(api.get).toHaveBeenCalledWith('/calendar/events/?start=2026-06-01&end=2026-07-01');
  });

  it('opens detailed details modal on event node click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockEventsResponse });
    renderCalendar();

    const eventBtn = await screen.findByTestId('event-node-appt-1');
    fireEvent.click(eventBtn);

    // Verify modal elements render containing expected properties
    expect(screen.getByText('Appointment Details')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jones')).toBeInTheDocument();
    expect(screen.getByText('Routine check-up')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('consultation')).toBeInTheDocument();
  });

  it('displays error alert on fetch API failures', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    renderCalendar();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
