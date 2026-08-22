import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Solutions } from './components/Solutions';
import { DashboardPreview } from './components/DashboardPreview';
import { Testimonials } from './components/Testimonials';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import type { AuthView } from './content';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  const openAuth = (view: AuthView) => {
    if (view === 'register') {
      navigate('/register');
      return;
    }
    if (view === 'login') {
      navigate('/login');
      return;
    }
    setAuthView(view);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-teal-500 selection:text-white">
      <Navbar onOpenAuth={openAuth} />
      <main>
        <Hero onOpenAuth={openAuth} />
        <Features />
        <Solutions />
        <DashboardPreview />
        <Testimonials />
      </main>
      <Footer onOpenAuth={openAuth} />
      <AuthModal
        open={authOpen}
        view={authView}
        onClose={() => setAuthOpen(false)}
        onViewChange={setAuthView}
      />
    </div>
  );
};

export default LandingPage;
