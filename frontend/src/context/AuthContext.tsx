import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { impersonationContext } from '../services/api';
import { getAccessToken, setTokens, clearTokens } from '../utils/token';
import { toastRef } from './ToastContext';

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  notification_whatsapp_number?: string;
  address?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'CLINIC_OWNER' | 'PATIENT';
  clinic: Clinic | null;
  patient_id?: string | null;
  first_name?: string;
  last_name?: string;
}

export interface Subscription {
  id: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAYMENT_DUE' | 'EXPIRED' | 'CANCELLED';
  trial_days_remaining: number;
  next_billing_date: string | null;
  grace_period_end_date: string | null;
  plan: {
    name: string;
    price: number;
    billing_cycle: string;
  };
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  loading: boolean;
  impersonatedClinic: Clinic | null;
  setImpersonatedClinic: (clinic: Clinic | null) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [impersonatedClinic, setImpersonatedClinicState] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // Fetch user profile from /api/accounts/me/
  const fetchCurrentUser = async (): Promise<void> => {
    try {
      const response = await api.get('/accounts/me/');
      setUser(response.data);
    } catch (error) {
      setUser(null);
      setSubscription(null);
      clearTokens();
      throw error;
    }
  };

  // Fetch subscription from /api/subscriptions/current/
  const fetchCurrentSubscription = async (): Promise<void> => {
    try {
      const response = await api.get('/subscriptions/current/');
      setSubscription(response.data);
    } catch (error) {
      setSubscription(null);
      // Fail silently if there's no clinic associated
      console.warn('Failed to load clinic subscription info', error);
    }
  };

  // Login handler
  const login = async (username: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.post('/token/', { username, password });
      setTokens(response.data.access, response.data.refresh);
      
      // Load user profile context
      const userRes = await api.get('/accounts/me/');
      const userData = userRes.data as User;
      setUser(userData);

      // Load subscription context (if role is clinic owner and has clinic)
      if (userData.role === 'CLINIC_OWNER' && userData.clinic) {
        const subRes = await api.get('/subscriptions/current/');
        setSubscription(subRes.data);
      } else {
        setSubscription(null);
      }

      toastRef.show('Logged in successfully.', 'success');
    } catch (error: any) {
      setUser(null);
      setSubscription(null);
      clearTokens();
      const msg = error.response?.data?.detail || 'Invalid credentials. Please try again.';
      toastRef.show(msg, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    clearTokens();
    setUser(null);
    setSubscription(null);
    setImpersonatedClinic(null);
    toastRef.show('Logged out successfully.', 'info');
  };

  // Set impersonated clinic state (in-memory context only)
  const setImpersonatedClinic = async (clinic: Clinic | null) => {
    setImpersonatedClinicState(clinic);
    // Sync with Axios request interceptor context
    impersonationContext.clinicId = clinic ? clinic.id : null;
    
    if (clinic) {
      // Reload subscription context representing the impersonated clinic
      try {
        const response = await api.get('/subscriptions/current/');
        setSubscription(response.data);
        toastRef.show(`Impersonating owner context for ${clinic.name}`, 'info');
      } catch (error) {
        setSubscription(null);
      }
    } else {
      // Restore subscription to null (since Super Admin has no subscription of their own)
      setSubscription(null);
      toastRef.show('Exited clinic impersonation mode.', 'info');
    }
  };

  // Load user profile on startup if tokens are present
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          // 1. Fetch user context
          const userRes = await api.get('/accounts/me/');
          const userData = userRes.data as User;
          setUser(userData);

          // 2. Fetch subscription context
          if (userData.role === 'CLINIC_OWNER' && userData.clinic) {
            const subRes = await api.get('/subscriptions/current/');
            setSubscription(subRes.data);
          }
        } catch (err) {
          console.error('Failed to initialize session on boot', err);
          setUser(null);
          setSubscription(null);
          clearTokens();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        isAuthenticated,
        loading,
        impersonatedClinic,
        setImpersonatedClinic,
        login,
        logout,
        fetchCurrentUser,
        fetchCurrentSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
