import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play, Compass, Star, Calendar, TrendingUp, Activity, Users, CheckCircle2, Sparkles, Video } from 'lucide-react';
import { heroStats, trustLogos, type AuthView } from '../content';

interface HeroProps {
  onOpenAuth: (view: AuthView) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAuth }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tiltRef.current) return;
    const rect = tiltRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -8, y: dx * 8 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const scrollToFeatures = () => {
    document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
      {/* Animated mesh background */}
      <div className="absolute inset-0 bg-mesh-light mesh-bg" />
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Floating background blobs */}
      <motion.div
        className="absolute top-1/4 left-10 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl"
        animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-10 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl"
        animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div ref={ref} className="relative section-padding max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Copy */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1.5 mb-6"
          >
            <Sparkles className="text-teal-600" size={14} />
            <span className="text-sm font-semibold text-teal-700">AI-Powered Dental Practice Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
          >
            The Next-Generation{' '}
            <span className="gradient-text">AI Practice Management</span> Software for Modern Dental Clinics
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            DentFlow streamlines appointments, billing, electronic dental records, and patient communication —
            all powered by AI that helps your practice grow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <button onClick={() => onOpenAuth('register')} className="shine btn-primary flex items-center justify-center gap-2 text-base cursor-pointer">
              <Play size={18} fill="currentColor" />
              Book a Live Demo
            </button>
            <button onClick={scrollToFeatures} className="btn-secondary flex items-center justify-center gap-2 text-base cursor-pointer">
              <Compass size={18} />
              Explore Features
            </button>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
          >
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">Trusted by 5,000+</span> dentists worldwide
            </p>
          </motion.div>

          {/* Trust logos */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start"
          >
            {trustLogos.map((logo) => (
              <span key={logo} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                {logo}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right: Interactive 3D-style dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="tilt-container"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={tiltRef}
            className="tilt-card relative"
            style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
          >
            {/* Main dashboard card */}
            <div className="glass-card rounded-3xl p-6 shadow-2xl relative overflow-hidden bg-white/80">
              {/* Window chrome */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live dashboard
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: Calendar, label: 'Today', value: '24', color: 'text-teal-600', bg: 'bg-teal-50' },
                  { icon: TrendingUp, label: 'Revenue', value: '$48k', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { icon: Users, label: 'Patients', value: '1,847', color: 'text-cyan-600', bg: 'bg-cyan-50' },
                  { icon: Activity, label: 'No-shows', value: '4.2%', color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className={`rounded-xl ${stat.bg} p-3.5`}
                  >
                    <stat.icon className={`${stat.color} mb-2`} size={18} />
                    <div className="text-xl font-bold text-slate-900 tabular">{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Chart mockup */}
              <div className="rounded-xl bg-white/60 border border-slate-100 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-600">Revenue (30 days)</span>
                  <span className="text-xs text-emerald-600 font-semibold">+34%</span>
                </div>
                <div className="flex items-end gap-1.5 h-24">
                  {[40, 55, 35, 70, 50, 80, 45, 65, 90, 60, 75, 95].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={inView ? { height: `${h}%` } : {}}
                      transition={{ delay: 0.7 + i * 0.05, duration: 0.4 }}
                      className="flex-1 rounded-t bg-gradient-to-t from-teal-600 to-cyan-400 min-h-[4px]"
                    />
                  ))}
                </div>
              </div>

              {/* Appointment list */}
              <div className="space-y-2">
                {[
                  { time: '09:00', name: 'Sarah Johnson', type: 'Cleaning', status: 'Confirmed' },
                  { time: '10:30', name: 'Mark Davis', type: 'Root canal', status: 'In progress' },
                ].map((apt, i) => (
                  <motion.div
                    key={apt.name}
                    initial={{ opacity: 0, x: 15 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.9 + i * 0.15 }}
                    className="flex items-center gap-3 rounded-lg bg-white/50 p-2.5 border border-slate-100"
                  >
                    <div className="text-xs font-bold text-teal-600 tabular w-12">{apt.time}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{apt.name}</div>
                      <div className="text-xs text-slate-400">{apt.type}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      apt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {apt.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating badges around dashboard */}
            <motion.div
              className="absolute -top-5 -left-5 glass-card rounded-2xl px-4 py-2.5 shadow-lg bg-white/90"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={18} />
                <span className="text-sm font-semibold text-slate-700">Appointment Confirmed</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute -top-3 -right-6 glass-card rounded-2xl px-4 py-2.5 shadow-lg bg-white/90"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="text-teal-600" size={18} />
                <span className="text-sm font-semibold text-slate-700">Revenue +34%</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-4 -left-6 glass-card rounded-2xl px-4 py-2.5 shadow-lg bg-white/90"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="text-cyan-600" size={18} />
                <span className="text-sm font-semibold text-slate-700">AI Charting Active</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-5 -right-4 glass-card rounded-2xl px-4 py-2.5 shadow-lg bg-white/90"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            >
              <div className="flex items-center gap-2">
                <Video className="text-blue-600" size={18} />
                <span className="text-sm font-semibold text-slate-700">Live Consultation</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Stats strip at bottom */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="absolute bottom-0 left-0 right-0 border-t border-slate-100/60 bg-white/40 backdrop-blur-sm"
      >
        <div className="section-padding max-w-7xl mx-auto py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {heroStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold gradient-text tabular">{stat.value}</div>
              <div className="text-xs md:text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
