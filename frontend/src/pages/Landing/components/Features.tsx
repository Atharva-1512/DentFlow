import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { featureTabs } from '../content';

export const Features: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const tab = featureTabs[activeTab];

  return (
    <section id="features" className="relative py-24 lg:py-32 bg-white overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />

      <div ref={ref} className="relative section-padding max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="badge-glow bg-teal-50 text-teal-700 border border-teal-200 mb-4">
            Powerful Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Everything your dental practice needs,{' '}
            <span className="gradient-text">in one platform</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From smart scheduling to AI analytics — explore the tools that help 5,000+ clinics run more efficiently.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-12 no-scrollbar"
        >
          {featureTabs.map((ft, i) => (
            <button
              key={ft.id}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-300 cursor-pointer ${
                activeTab === i
                  ? `bg-gradient-to-r ${ft.accent} text-white shadow-glow-teal scale-105`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ft.icon size={18} />
              <span className="hidden sm:inline">{ft.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid lg:grid-cols-2 gap-10 items-center"
          >
            {/* Left: Copy */}
            <div>
              <div className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${tab.accent} text-white px-3 py-1.5 mb-4`}>
                <tab.icon size={16} />
                <span className="text-sm font-semibold">{tab.label}</span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">{tab.title}</h3>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{tab.description}</p>
              <ul className="space-y-3">
                {tab.highlights.map((h, i) => (
                  <motion.li
                    key={h}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="text-teal-600 shrink-0 mt-0.5" size={20} />
                    <span className="text-slate-700">{h}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Right: Visual preview card */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${tab.accent} opacity-10 rounded-3xl blur-2xl`} />
              <div className="relative glass-card rounded-3xl p-6 shadow-card-hover bg-white/90">
                {tab.id === 'scheduling' && <SchedulingPreview />}
                {tab.id === 'affordable' && <AffordablePreview />}
                {tab.id === 'billing' && <BillingPreview />}
                {tab.id === 'analytics' && <AnalyticsPreview />}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

function SchedulingPreview() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const slots = [
    ['09:00', '10:30', '14:00'],
    ['09:30', '11:00', '15:30'],
    ['08:00', '13:00', '16:00'],
    ['10:00', '12:00', '17:00'],
    ['09:00', '11:30', '14:30'],
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-800">This Week</h4>
        <span className="text-xs text-teal-600 font-semibold">3 chairs available</span>
      </div>
      <div className="space-y-2.5">
        {days.map((day, i) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs font-semibold text-slate-500 w-10">{day}</span>
            <div className="flex gap-2 flex-1">
              {slots[i].map((time) => (
                <div
                  key={time}
                  className="flex-1 rounded-lg bg-teal-50 border border-teal-200 px-2 py-1.5 text-center text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  {time}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-emerald-700 font-medium">WhatsApp reminder sent to 24 patients</span>
      </div>
    </div>
  );
}

function AffordablePreview() {
  const steps = [
    { label: 'Appointments', detail: 'Automated reminders', value: 'Save 8 hrs/week' },
    { label: 'Patient records', detail: 'One organized workspace', value: 'Zero paper files' },
    { label: 'Billing', detail: 'Fast digital payments', value: 'Get paid sooner' },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h4 className="font-semibold text-slate-800">More efficiency. Less overhead.</h4>
        <span className="rounded-full bg-[#f4eadb] px-2.5 py-1 text-xs font-semibold text-[#8d613e]">Built for growing clinics</span>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-center gap-4 rounded-xl border border-[#eadfd2] bg-white p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4eadb] text-sm font-extrabold text-[#a9794e]">0{i + 1}</div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">{step.label}</div>
              <div className="text-xs text-slate-500">{step.detail}</div>
            </div>
            <span className="text-right text-xs font-bold text-[#8d613e]">{step.value}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-[#ddc09c] bg-[#fbf7f0] px-4 py-3 text-center text-sm font-semibold text-[#704b32]">
        One simple platform for your whole practice
      </div>
    </div>
  );
}

function BillingPreview() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-800">Invoice #INV-2841</h4>
        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Paid</span>
      </div>
      <div className="space-y-2.5 mb-4">
        {[
          { desc: 'Root Canal Treatment', amt: '$820' },
          { desc: 'Dental Crown', amt: '$450' },
          { desc: 'X-Ray (Panoramic)', amt: '$120' },
        ].map((item, i) => (
          <motion.div
            key={item.desc}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between rounded-lg bg-white/60 border border-slate-100 px-3 py-2.5"
          >
            <span className="text-sm text-slate-700">{item.desc}</span>
            <span className="text-sm font-semibold text-slate-900 tabular">{item.amt}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 pt-3 mb-4">
        <span className="font-semibold text-slate-900">Total</span>
        <span className="font-bold text-lg gradient-text tabular">$1,390</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['Cash', 'Card', 'Insurance'].map((m) => (
          <div key={m} className="text-center rounded-lg bg-teal-50 border border-teal-200 py-2 text-xs font-medium text-teal-700">
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const metrics = [
    { label: 'Retention', value: '92%', change: '+5%', color: 'text-emerald-600' },
    { label: 'Acceptance', value: '78%', change: '+12%', color: 'text-teal-600' },
    { label: 'Avg Revenue', value: '$12.4k', change: '+34%', color: 'text-cyan-600' },
  ];
  return (
    <div>
      <h4 className="font-semibold text-slate-800 mb-4">AI Growth Insights</h4>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl bg-white/60 border border-slate-100 p-3 text-center"
          >
            <div className="text-lg font-bold text-slate-900 tabular">{m.value}</div>
            <div className={`text-xs ${m.color} font-semibold`}>{m.change}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="rounded-xl bg-white/60 border border-slate-100 p-4">
        <div className="text-xs font-semibold text-slate-600 mb-3">Revenue Forecast (6 months)</div>
        <div className="flex items-end gap-2 h-28">
          {[50, 60, 55, 70, 65, 85, 80, 95].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-cyan-400 min-h-[4px]"
            />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-cyan-50 border border-cyan-200 px-3 py-2.5">
        <Sparkles className="text-cyan-600 shrink-0 mt-0.5" size={16} />
        <span className="text-xs text-cyan-700">AI predicts 22% revenue growth next quarter based on current trends.</span>
      </div>
    </div>
  );
}
