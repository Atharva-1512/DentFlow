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

  window.scrollTo = vi.fn();

  // Mock IntersectionObserver for framer-motion in jsdom
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
});

afterAll(() => {
  // @ts-ignore
  window.location = originalLocation;
});

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});
