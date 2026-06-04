import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock window.location or other browser APIs if needed.
const originalLocation = window.location;

beforeAll(() => {
  // @ts-ignore
  delete window.location;
  window.location = {
    ...originalLocation,
    href: '',
    assign: vi.fn(),
    replace: vi.fn(),
  } as any;
});

afterAll(() => {
  // @ts-ignore
  window.location = originalLocation;
});

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
