import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/token';
import { toastRef } from '../context/ToastContext';

// In-memory reference for Super Admin clinic impersonation
export const impersonationContext = {
  clinicId: null as string | null,
};

// In-memory reference for navigation redirects from Axios interceptors
export const navigationRef = {
  navigate: (path: string) => {
    window.location.href = path;
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // 1. Inject impersonation header
    if (impersonationContext.clinicId) {
      config.headers['X-Impersonate-Clinic'] = impersonationContext.clinicId;
    }

    // 2. Inject Authorization token
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor variables for token refresh queueing
let isRefreshing = false;
interface QueueItem {
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (reason?: any) => void;
}
let failedQueue: QueueItem[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      toastRef.show('Network error. Please check your internet connection.', 'error');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // A. Handle 401 Unauthorized (JWT token refresh flow)
    if (status === 401 && !originalRequest._retry) {
      // Exempt login token fetch endpoint itself from loops
      if (originalRequest.url === '/token/' || originalRequest.url === '/token/refresh/') {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        navigationRef.navigate('/login');
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/api/token/refresh/', { refresh: refreshToken });
        const newAccessToken = response.data.access;
        // Backend returns access and optionally a rotated refresh token
        const newRefreshToken = response.data.refresh || refreshToken;

        setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearTokens();
        navigationRef.navigate('/login');
        toastRef.show('Session expired. Please log in again.', 'warning');
        return Promise.reject(refreshError);
      }
    }

    // B. Handle 403 Forbidden (Subscription restrictions)
    if (status === 403) {
      const responseMsg = (data as any)?.detail || '';
      
      // Check if it's a subscription required error
      if (responseMsg.toLowerCase().includes('subscription') || responseMsg.toLowerCase().includes('payment')) {
        toastRef.show('An active subscription is required to access this feature.', 'warning');
        navigationRef.navigate('/subscription');
      } else {
        toastRef.show('You do not have permission to perform this action.', 'error');
      }
    }

    // C. Handle 500 Internal Server Errors
    if (status >= 500) {
      toastRef.show('Internal Server Error. Please contact support or try again later.', 'error');
    }

    return Promise.reject(error);
  }
);

export default api;
