import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, Loader2, AlertCircle, CheckCircle2, ArrowRight, Stethoscope } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import type { AuthView } from '../content';

interface AuthModalProps {
  open: boolean;
  view: AuthView;
  onClose: () => void;
  onViewChange: (view: AuthView) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, view, onClose, onViewChange }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLogin = view === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (isLogin) {
      try {
        await login(email.trim(), password);
        setSuccess('Welcome back! Redirecting to your dashboard...');
        setTimeout(() => {
          onClose();
          resetForm();
          navigate('/dashboard');
        }, 800);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Invalid credentials. Please try again.');
        setLoading(false);
      }
    } else {
      // Registration flow -> Navigate to registration page or complete
      setSuccess('Redirecting to clinic registration setup...');
      setTimeout(() => {
        onClose();
        resetForm();
        navigate('/register');
      }, 600);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchView = (v: AuthView) => {
    resetForm();
    onViewChange(v);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative w-full max-w-md"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
          >
            <div className="glass-card rounded-3xl overflow-hidden shadow-2xl bg-white">
              {/* Header banner */}
              <div className="relative bg-gradient-to-br from-teal-600 to-cyan-500 px-8 pt-8 pb-6 text-white">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Stethoscope className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">
                      {isLogin ? 'Welcome back' : 'Register your clinic'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {isLogin ? 'Sign in to DentFlow' : 'Set up your clinic account'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="px-8 py-6">
                {success && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Username, Email or Clinic Name</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. Tanpure Dental or doctor@clinic.com"
                        className="w-full rounded-xl border border-slate-200 bg-white/70 pl-11 pr-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-white/70 pl-11 pr-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <UserIcon size={14} className="shrink-0 mt-0.5" />
                      <span>By registering you agree to our Terms of Service and Privacy Policy.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-500 text-white font-semibold rounded-xl py-3 shadow-glow-teal transition-all hover:shadow-glow hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        {isLogin ? 'Sign In' : 'Proceed to Clinic Registration'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-600">
                  {isLogin ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        onClick={() => {
                          handleClose();
                          navigate('/register');
                        }}
                        className="font-semibold text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
                      >
                        Register
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        onClick={() => switchView('login')}
                        className="font-semibold text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
