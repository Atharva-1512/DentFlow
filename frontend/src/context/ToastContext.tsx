import React, { createContext, useState, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';

type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastContextType {
  showToast: (message: string, severity?: ToastSeverity) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global static reference to allow non-component modules (e.g. axios api client) to trigger toast alerts
export const toastRef = {
  show: (message: string, severity: ToastSeverity = 'error') => {
    console.warn('ToastProvider not initialized yet:', message, severity);
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<ToastSeverity>('info');

  const showToast = (msg: string, sev: ToastSeverity = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  };

  // Sync static reference with current provider instance
  toastRef.show = (msg: string, sev: ToastSeverity = 'error') => {
    showToast(msg, sev);
  };

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
