import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Globe, MessageSquare, Share2, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { navLinks, type AuthView } from '../content';

interface FooterProps {
  onOpenAuth?: (view: AuthView) => void;
}

export const Footer: React.FC<FooterProps> = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSent(true);
      setEmail('');
      setTimeout(() => setSent(false), 3000);
    }
  };

  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

      {/* CTA banner */}
      <div className="relative section-padding max-w-7xl mx-auto pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-dark rounded-3xl p-8 lg:p-12 text-center border border-teal-500/20"
        >
          <h3 className="text-2xl lg:text-4xl font-extrabold mb-3">
            Ready to transform your dental practice?
          </h3>
          <p className="text-slate-300 text-lg mb-6 max-w-xl mx-auto">
            Join 5,000+ dentists who run smarter, more profitable clinics with DentFlow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="shine flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-500 text-white font-semibold rounded-xl px-7 py-3.5 shadow-glow-teal transition-all hover:shadow-glow hover:scale-[1.03] cursor-pointer"
            >
              Register
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold rounded-xl px-7 py-3.5 transition-all hover:bg-white/20 cursor-pointer"
            >
              Log In
            </button>
          </div>
        </motion.div>
      </div>

      {/* Main footer */}
      <div className="relative section-padding max-w-7xl mx-auto pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand + newsletter */}
          <div className="col-span-2 lg:col-span-2">
            <Logo size="md" variant="light" />
            <p className="text-slate-400 text-sm mt-4 max-w-xs leading-relaxed">
              The next-generation AI practice management platform for modern dental clinics worldwide.
            </p>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="mt-6">
              <label className="text-sm text-slate-300 font-medium mb-2 block">Stay updated</label>
              <div className="flex gap-2 max-w-sm">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="w-full rounded-lg bg-white/5 border border-white/10 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-teal-600 to-cyan-500 px-4 py-2.5 text-white transition-all hover:shadow-glow-teal cursor-pointer"
                >
                  {sent ? <CheckCircle2 size={18} /> : <Send size={16} />}
                </button>
              </div>
              {sent && <p className="text-xs text-emerald-400 mt-2">Thanks for subscribing!</p>}
            </form>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Compliance */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Compliance</h4>
            <ul className="space-y-2.5">
              {['HIPAA Compliance', 'GDPR Ready', 'SOC 2 Type II', 'Privacy Policy', 'Terms of Service'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-slate-400 hover:text-teal-400 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Mail size={15} className="text-teal-400 shrink-0" />
                hello@dentflow.com
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={15} className="text-teal-400 shrink-0" />
                +1 (800) 336-8356
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin size={15} className="text-teal-400 shrink-0 mt-0.5" />
                500 Market St, San Francisco, CA
              </li>
            </ul>

            {/* Socials */}
            <div className="flex gap-3 mt-5">
              {[Globe, MessageSquare, Share2].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500/30 transition-all"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © 2026 DentFlow Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-teal-400 transition-colors cursor-pointer">
              Log In
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={() => navigate('/register')} className="text-slate-400 hover:text-teal-400 transition-colors cursor-pointer">
              Register
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
