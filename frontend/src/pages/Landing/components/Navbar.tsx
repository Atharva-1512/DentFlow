import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, Sparkles, LayoutDashboard } from 'lucide-react';
import { Logo } from './Logo';
import { navLinks, type AuthView } from '../content';
import { useAuth } from '../../../context/AuthContext';

interface NavbarProps {
  onOpenAuth?: (view: AuthView) => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass shadow-card py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="section-padding max-w-7xl mx-auto flex items-center justify-between">
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
            <Logo size="md" showPulse={scrolled} />
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="btn-ghost"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated || user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="shine btn-primary flex items-center gap-2"
                >
                  <LayoutDashboard size={16} />
                  Open Dashboard
                </button>
                <button
                  onClick={() => logout()}
                  className="btn-secondary"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:text-teal-600 transition-all cursor-pointer"
                >
                  <LogIn size={16} />
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="shine btn-primary flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={16} />
                  Register
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X size={24} />
                </motion.div>
              ) : (
                <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 top-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div
              className="absolute top-0 right-0 bottom-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col pt-24 pb-8 px-6"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) => (
                  <motion.button
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => handleNavClick(link.href)}
                    className="text-left text-slate-700 font-medium px-4 py-3 rounded-xl hover:bg-slate-50 hover:text-teal-600 transition-colors"
                  >
                    {link.label}
                  </motion.button>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-3">
                {isAuthenticated || user ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/dashboard');
                      }}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard size={16} />
                      Open Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        logout();
                      }}
                      className="btn-secondary w-full"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/login');
                      }}
                      className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <LogIn size={16} />
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/register');
                      }}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} />
                      Register
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
