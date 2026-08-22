import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  Stethoscope,
  UserCircle,
  Users,
  WalletCards,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: typeof LayoutDashboard;
}

const sidebarItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Patients', icon: Users },
  { label: "Today's Appointments", icon: Activity },
  { label: 'Upcoming Appointments', icon: ClipboardList },
  { label: 'Calendar', icon: Calendar },
  { label: 'Accounts', icon: WalletCards },
  { label: 'Billing', icon: CreditCard },
  { label: 'Lab Work', icon: FlaskConical },
  { label: 'Clinic Settings', icon: Settings },
  { label: 'Profile', icon: UserCircle },
  { label: 'Logout', icon: LogOut },
];

const dashboardTiles: MenuItem[] = [
  { label: 'Patients', icon: Users },
  { label: 'Quick Bill', icon: FileText },
  { label: 'Settings', icon: Settings },
  { label: 'Appointments', icon: Calendar },
  { label: 'Accounts', icon: WalletCards },
  { label: 'Campaign', icon: Bell },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Prescription', icon: FileText },
  { label: 'Inventory', icon: Package },
  { label: 'Billing', icon: CreditCard },
  { label: 'Lab Work', icon: FlaskConical },
];

const tileColors = ['text-blue-500', 'text-emerald-600', 'text-slate-600', 'text-orange-500', 'text-amber-500', 'text-teal-600', 'text-cyan-600', 'text-amber-500', 'text-slate-600', 'text-teal-600', 'text-blue-500'];

export const DashboardPreview: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [activeTab, setActiveTab] = useState<'menu' | 'schedule'>('menu');

  return (
    <section id="dashboard" className="relative overflow-hidden bg-[#fbf8f2] py-24 lg:py-32">
      <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#ead7bd]/40 blur-3xl" />
      <div ref={ref} className="relative mx-auto max-w-7xl section-padding">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <span className="badge-glow mb-4 border border-[#ddc09c] bg-[#f4eadb] text-[#704b32]">Inside DentFlow</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#352217] sm:text-4xl lg:text-5xl">
            A dashboard built for the way your clinic works
          </h2>
          <p className="mt-4 text-lg text-[#704b32]">
            Keep your patients, appointments, billing, and daily operations in one calm, organized workspace.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative overflow-hidden rounded-[22px] border border-[#ead7bd] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-[#704b32] px-4 py-3 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <Menu size={20} />
              <div className="flex items-center gap-2">
                <Stethoscope size={20} />
                <span className="text-lg font-bold tracking-tight">DentFlow</span>
              </div>
              <span className="rounded-md bg-[#a9794e] px-2 py-1 text-[10px] font-bold uppercase tracking-wide">Practice</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell size={16} />
              <span>AT</span>
            </div>
          </div>

          <div className="grid min-h-[500px] md:grid-cols-[190px_1fr]">
            <aside className="hidden border-r border-[#f0e5d8] bg-[#fffdfa] p-3 md:block">
              <div className="space-y-1">
                {sidebarItems.map((item, i) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                      i === 0 ? 'bg-[#a9794e] text-white shadow-sm' : 'text-[#513a29] hover:bg-[#f4eadb]'
                    }`}
                  >
                    <item.icon size={15} />
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="bg-[#f8fafb] p-4 sm:p-6">
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {[
                  { value: '2 (2)', label: 'New Patients', className: 'bg-[#e5c38f] text-[#553725]' },
                  { value: '1', label: 'Patient Visits', className: 'bg-[#bd9060] text-white' },
                  { value: 'Rs. 6,666.00', label: 'Collections', className: 'bg-[#d4a24c] text-white' },
                ].map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.35 + i * 0.1 }}
                    className={`rounded-2xl px-4 py-5 text-center shadow-sm ${metric.className}`}
                  >
                    <div className="text-2xl font-extrabold tabular sm:text-3xl">{metric.value}</div>
                    <div className="mt-0.5 text-xs font-semibold opacity-90">{metric.label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mb-5 flex overflow-hidden rounded-xl border border-[#ead7bd] bg-white">
                {(['menu', 'schedule'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 border-b-2 px-4 py-3 text-sm font-bold transition-colors cursor-pointer ${
                      activeTab === tab ? 'border-[#a9794e] text-[#8d613e]' : 'border-transparent text-slate-500'
                    }`}
                  >
                    {tab === 'menu' ? 'Menu' : 'Schedule (0)'}
                  </button>
                ))}
              </div>

              {activeTab === 'menu' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {dashboardTiles.map((tile, i) => (
                    <motion.div
                      key={tile.label}
                      initial={{ opacity: 0, y: 15 }}
                      animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      whileHover={{ y: -3, boxShadow: '0 10px 20px rgba(112,75,50,0.12)' }}
                      className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-[#eadfd2] bg-white p-3 text-center transition-shadow"
                    >
                      <tile.icon size={24} className={tileColors[i]} />
                      <span className="text-xs font-bold text-[#352f2b]">{tile.label}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#ddc09c] bg-white text-center">
                  <Calendar className="mb-3 text-[#a9794e]" size={34} />
                  <h3 className="font-bold text-[#352217]">No appointments scheduled</h3>
                  <p className="mt-1 text-sm text-[#704b32]">Your schedule is clear for today.</p>
                </div>
              )}
            </div>
          </div>

          <button className="absolute bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#a9794e] text-white shadow-lg transition-transform hover:scale-110 cursor-pointer" aria-label="Add new item">
            <Plus size={22} />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
