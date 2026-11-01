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

// In Node 22+, globalThis.localStorage may be an unconfigured Storage object
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true });

beforeEach(() => {
  window.localStorage?.clear();
  vi.clearAllMocks();
});
