import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, BadgeCheck, Quote } from 'lucide-react';
import { testimonials, complianceBadges } from '../content';

export const Testimonials: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="about" className="relative py-24 lg:py-32 bg-slate-50 overflow-hidden">
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />

      <div ref={ref} className="relative section-padding max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="badge-glow bg-emerald-50 text-emerald-700 border border-emerald-200 mb-4">
            Success Stories
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Dentists love what DentFlow{' '}
            <span className="gradient-text">does for their practice</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Real results from real clinics — verified metrics from practices using DentFlow.
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              whileHover={{ y: -8 }}
              className="glass-card rounded-3xl p-6 shadow-card hover:shadow-card-hover transition-shadow relative bg-white"
            >
              <Quote className="absolute top-6 right-6 text-teal-100" size={40} />

              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} size={16} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-slate-700 leading-relaxed mb-6 relative z-10">"{t.quote}"</p>

              {/* Stat highlight */}
              <div className="rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 p-4 mb-5 text-center">
                <div className="text-3xl font-extrabold gradient-text tabular">{t.stat}</div>
                <div className="text-xs text-slate-600 mt-0.5">{t.statLabel}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 text-sm truncate">{t.name}</span>
                    <BadgeCheck size={15} className="text-teal-600 shrink-0" />
                  </div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                  <div className="text-xs text-slate-400 truncate">{t.clinic}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Compliance badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {complianceBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 shadow-sm"
            >
              <badge.icon size={18} className="text-teal-600" />
              <span className="text-sm font-semibold text-slate-700">{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
