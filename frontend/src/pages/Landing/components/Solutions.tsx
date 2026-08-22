import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { CheckCircle2, Hospital } from 'lucide-react';
import { solutions } from '../content';

export const Solutions: React.FC = () => {
  const [active, setActive] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const sol = solutions[active];

  return (
    <section id="solutions" className="relative py-24 lg:py-32 bg-slate-50 overflow-hidden">
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />

      <div ref={ref} className="relative section-padding max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="badge-glow bg-cyan-50 text-cyan-700 border border-cyan-200 mb-4">
            Tailored Solutions
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Built for every practice,{' '}
            <span className="gradient-text-cyan">from solo to enterprise</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Whether you run a single chair or a multi-city hospital chain, DentFlow scales with you.
          </p>
        </motion.div>

        {/* Solution toggle cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {solutions.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              onClick={() => setActive(i)}
              className={`text-left rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                active === i
                  ? 'bg-white border-teal-500 shadow-card-hover scale-[1.02]'
                  : 'bg-white/60 border-slate-200 hover:border-teal-300 hover:shadow-card'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  active === i ? 'bg-gradient-to-br from-teal-600 to-cyan-500' : 'bg-slate-100'
                }`}>
                  <s.icon className={active === i ? 'text-white' : 'text-slate-500'} size={24} />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  s.badge === 'Most Popular' ? 'bg-teal-100 text-teal-700' :
                  s.badge === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {s.badge}
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{s.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Active solution detail */}
        <motion.div
          key={sol.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card rounded-3xl p-8 lg:p-10 shadow-card bg-white"
        >
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center shadow-glow-teal">
                  <sol.icon className="text-white" size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{sol.title}</h3>
                  <span className="text-sm text-teal-600 font-semibold">{sol.badge}</span>
                </div>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{sol.description}</p>
              <div className="grid grid-cols-2 gap-3">
                {sol.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 rounded-xl bg-white/60 border border-slate-100 px-3 py-2.5">
                    <CheckCircle2 className="text-teal-600 shrink-0" size={18} />
                    <span className="text-sm text-slate-700 font-medium">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-400/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 overflow-hidden">
                <div className="absolute top-4 right-4 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <Hospital className="text-teal-400" size={20} />
                    <span className="text-white/80 text-sm font-semibold">Practice Overview</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Active Chairs', val: active === 0 ? '1' : active === 1 ? '4' : '24' },
                      { label: 'Dentists', val: active === 0 ? '1' : active === 1 ? '5' : '18' },
                      { label: 'Branches', val: active === 0 ? '1' : active === 1 ? '1' : '6' },
                      { label: 'Monthly Patients', val: active === 0 ? '180' : active === 1 ? '840' : '3,200' },
                    ].map((row, i) => (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                      >
                        <span className="text-white/70 text-sm">{row.label}</span>
                        <span className="text-white font-bold text-lg tabular">{row.val}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
