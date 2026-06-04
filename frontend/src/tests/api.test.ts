import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import api, { impersonationContext, navigationRef } from '../services/api';
import { getAccessToken, getRefreshToken, setTokens } from '../utils/token';
import { toastRef } from '../context/ToastContext';

// Mock axios module to intercept axios.post
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
      create: vi.fn(() => {
        const instance = actual.default.create();
        return instance;
      }),
    },
  };
});

describe('Axios API Service Layer', () => {
  beforeEach(() => {
    localStorage.clear();
    impersonationContext.clinicId = null;
    vi.restoreAllMocks();
    vi.spyOn(toastRef, 'show').mockImplementation(() => {});
    vi.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
    
    // Set a mock adapter to prevent real network calls and relative URL errors in jsdom
    api.defaults.adapter = vi.fn().mockImplementation(async (config) => {
      return {
        data: 'mock-response',
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    });
  });

  // 1. Request Interceptor: Auth Header
  it('should inject Authorization header when access token is present', async () => {
    setTokens('my-access-token', 'my-refresh-token');

    // Retrieve request interceptor handler safely by casting to any
    const requestHandler = (api.interceptors.request as any).handlers[0]?.fulfilled;
    const config = { headers: {} };
    const modifiedConfig = await requestHandler(config as any);

    expect(modifiedConfig.headers['Authorization']).toBe('Bearer my-access-token');
    expect(modifiedConfig.headers['X-Impersonate-Clinic']).toBeUndefined();
  });

  // 2. Request Interceptor: Impersonation Header
  it('should inject X-Impersonate-Clinic header when impersonation clinic is set', async () => {
    impersonationContext.clinicId = 'clinic-abc-123';

    // Retrieve request interceptor handler safely by casting to any
    const requestHandler = (api.interceptors.request as any).handlers[0]?.fulfilled;
    const config = { headers: {} };
    const modifiedConfig = await requestHandler(config as any);

    expect(modifiedConfig.headers['X-Impersonate-Clinic']).toBe('clinic-abc-123');
    expect(modifiedConfig.headers['Authorization']).toBeUndefined();
  });

  // 3. Response Interceptor: Network error
  it('should display toast message on network/server connection failure', async () => {
    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const errorMock = {
      config: {},
      response: undefined,
    };

    await expect(responseErrorHandler(errorMock as any)).rejects.toEqual(errorMock);
    expect(toastRef.show).toHaveBeenCalledWith(
      'Network error. Please check your internet connection.',
      'error'
    );
  });

  // 4. Response Interceptor: 500 Internal Server Error
  it('should display toast message on 500 error', async () => {
    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const errorMock = {
      config: {},
      response: {
        status: 500,
        data: { detail: 'Internal server crash' },
      },
    };

    await expect(responseErrorHandler(errorMock as any)).rejects.toEqual(errorMock);
    expect(toastRef.show).toHaveBeenCalledWith(
      'Internal Server Error. Please contact support or try again later.',
      'error'
    );
  });

  // 5. Response Interceptor: 403 Forbidden with Subscription message
  it('should redirect to subscription portal and toast when 403 subscription error occurs', async () => {
    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const errorMock = {
      config: {},
      response: {
        status: 403,
        data: { detail: 'Subscription has expired or is cancelled.' },
      },
    };

    await expect(responseErrorHandler(errorMock as any)).rejects.toEqual(errorMock);
    expect(toastRef.show).toHaveBeenCalledWith(
      'An active subscription is required to access this feature.',
      'warning'
    );
    expect(navigationRef.navigate).toHaveBeenCalledWith('/subscription');
  });

  // 6. Response Interceptor: 403 Forbidden general permission error
  it('should show general permission toast on other 403 errors', async () => {
    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const errorMock = {
      config: {},
      response: {
        status: 403,
        data: { detail: 'Only clinic owners can delete files.' },
      },
    };

    await expect(responseErrorHandler(errorMock as any)).rejects.toEqual(errorMock);
    expect(toastRef.show).toHaveBeenCalledWith(
      'You do not have permission to perform this action.',
      'error'
    );
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  // 7. Response Interceptor: 401 Unauthorized (No Refresh Token)
  it('should redirect to /login and clear tokens if 401 occurs and no refresh token is present', async () => {
    setTokens('expired-access', ''); // No refresh token
    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const errorMock = {
      config: { url: '/accounts/me/' },
      response: {
        status: 401,
        data: { detail: 'Authentication credentials were not provided.' },
      },
    };

    await expect(responseErrorHandler(errorMock as any)).rejects.toEqual(errorMock);
    expect(getAccessToken()).toBeNull();
    expect(navigationRef.navigate).toHaveBeenCalledWith('/login');
  });

  // 8. Response Interceptor: 401 Unauthorized (Refresh Flow Success)
  it('should refresh tokens and retry the original request when 401 occurs and refresh token is valid', async () => {
    setTokens('expired-access', 'valid-refresh');

    const mockNewAccess = 'new-access-token';
    const mockNewRefresh = 'new-refresh-token';

    // Mock the axios.post for token refresh
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { access: mockNewAccess, refresh: mockNewRefresh },
    });

    // Mock the adapter specifically for this test's retry to return 'retry-success'
    const adapterMock = vi.fn().mockResolvedValueOnce({
      data: 'retry-success',
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    api.defaults.adapter = adapterMock;

    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const originalRequestConfig = {
      url: '/accounts/me/',
      headers: {},
    };
    const errorMock = {
      config: originalRequestConfig,
      response: {
        status: 401,
        data: { detail: 'Token is invalid or expired' },
      },
    };

    const result = await responseErrorHandler(errorMock as any);

    expect(axios.post).toHaveBeenCalledWith('/api/token/refresh/', { refresh: 'valid-refresh' });
    expect(getAccessToken()).toBe(mockNewAccess);
    expect(getRefreshToken()).toBe(mockNewRefresh);
    expect(adapterMock).toHaveBeenCalled();
    expect(result.data).toBe('retry-success');
  });

  // 9. Response Interceptor: 401 Unauthorized (Refresh Flow Fails)
  it('should clear tokens, toast warning, and redirect to /login if token refresh api request fails', async () => {
    setTokens('expired-access', 'invalid-refresh');

    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Refresh failed'));

    // Retrieve response interceptor handler safely by casting to any
    const responseErrorHandler = (api.interceptors.response as any).handlers[0]?.rejected;
    const originalRequestConfig = {
      url: '/accounts/me/',
      headers: {},
    };
    const errorMock = {
      config: originalRequestConfig,
      response: {
        status: 401,
        data: { detail: 'Token is invalid or expired' },
      },
    };

    await expect(responseErrorHandler(errorMock as any)).rejects.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(navigationRef.navigate).toHaveBeenCalledWith('/login');
    expect(toastRef.show).toHaveBeenCalledWith('Session expired. Please log in again.', 'warning');
  });
});
