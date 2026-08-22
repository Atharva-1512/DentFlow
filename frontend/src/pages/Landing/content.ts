import {
  CalendarClock,
  BadgeDollarSign,
  BarChart3,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Stethoscope,
  Building2,
  CheckCircle2,
  Video,
  Users,
  Sparkles,
  Activity,
} from 'lucide-react';

export type AuthView = 'login' | 'register';

export interface FeatureTab {
  id: string;
  label: string;
  icon: typeof CalendarClock;
  title: string;
  description: string;
  highlights: string[];
  accent: string;
}

export const featureTabs: FeatureTab[] = [
  {
    id: 'scheduling',
    label: 'Smart Scheduling',
    icon: CalendarClock,
    title: 'Multi-chair booking & automated reminders',
    description:
      'Drag-and-drop calendar with multi-chair support, intelligent conflict detection, and automated WhatsApp/SMS reminders that cut no-shows by up to 40%.',
    highlights: [
      'Multi-chair, multi-doctor calendar views',
      'Automated WhatsApp & SMS patient reminders',
      'Smart slot suggestions based on treatment type',
      'Real-time waitlist and backfill automation',
    ],
    accent: 'from-teal-500 to-cyan-400',
  },
  {
    id: 'affordable',
    label: 'Affordable & Efficient',
    icon: BadgeDollarSign,
    title: 'Powerful clinic software without the enterprise price tag',
    description:
      'DentFlow gives growing clinics the tools they need to save time, reduce overhead, and deliver a smoother patient experience — all in one affordable workspace.',
    highlights: [
      'Simple tools your whole team can learn quickly',
      'Automated workflows that reduce admin time',
      'One connected system instead of scattered tools',
      'Flexible plans that grow with your clinic',
    ],
    accent: 'from-teal-600 to-cyan-500',
  },
  {
    id: 'billing',
    label: 'Billing & Insurance',
    icon: CreditCard,
    title: 'Fast claims, split payments, instant receipts',
    description:
      'Generate insurance claims in seconds, split payments across methods, and send branded digital receipts — all reconciled automatically in your ledger.',
    highlights: [
      'One-click insurance claim generation',
      'Split payments across cash, card, UPI & insurance',
      'Instant branded digital receipts',
      'Auto-reconciled ledger with tax reports',
    ],
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'analytics',
    label: 'AI Analytics',
    icon: BarChart3,
    title: 'Patient retention & revenue forecasting',
    description:
      'AI-powered dashboards that surface retention risks, forecast revenue, and recommend actions to grow your practice — no spreadsheets required.',
    highlights: [
      'Patient retention & churn risk scoring',
      'Revenue forecasting with seasonality detection',
      'Treatment acceptance rate optimization',
      'Automated weekly performance digests',
    ],
    accent: 'from-blue-500 to-indigo-500',
  },
];

export interface Solution {
  id: string;
  title: string;
  icon: typeof Stethoscope;
  description: string;
  features: string[];
  badge: string;
}

export const solutions: Solution[] = [
  {
    id: 'solo',
    title: 'Solo Practitioners',
    icon: Stethoscope,
    description:
      'Everything a single-chair practice needs to run efficiently — from booking to billing — without the overhead.',
    features: ['Single-chair calendar', 'Patient SMS reminders', 'Quick invoicing', 'Basic analytics'],
    badge: 'Best for 1 chair',
  },
  {
    id: 'group',
    title: 'Multi-Speciality Clinics',
    icon: Users,
    description:
      'Coordinate multiple dentists, specialities, and chairs with shared patient records and role-based access.',
    features: ['Multi-doctor scheduling', 'Shared patient records', 'Role-based access', 'Advanced analytics'],
    badge: 'Most Popular',
  },
  {
    id: 'chain',
    title: 'Hospital Chains & Franchises',
    icon: Building2,
    description:
      'Centralized control across all branches with consolidated reporting, franchise billing, and compliance tooling.',
    features: ['Multi-branch dashboard', 'Consolidated financials', 'Franchise revenue sharing', 'HIPAA & GDPR compliance'],
    badge: 'Enterprise',
  },
];

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  clinic: string;
  quote: string;
  rating: number;
  stat: string;
  statLabel: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Dr. Aisha Patel',
    role: 'Chief Dentist',
    clinic: 'BrightSmile Dental, Mumbai',
    quote:
      'DentFlow cut our no-shows by 40% in the first quarter. The automated reminders alone paid for the subscription.',
    rating: 5,
    stat: '40%',
    statLabel: 'reduction in no-shows',
  },
  {
    id: 't2',
    name: 'Dr. Michael Chen',
    role: 'Practice Owner',
    clinic: 'Chen Family Dentistry, Toronto',
    quote:
      'The 3D charting is a game-changer. Patients actually understand their treatment plans now — acceptance rates are up 28%.',
    rating: 5,
    stat: '28%',
    statLabel: 'higher treatment acceptance',
  },
  {
    id: 't3',
    name: 'Dr. Sofia Rodriguez',
    role: 'Clinical Director',
    clinic: 'Sonrisa Dental Group, Madrid',
    quote:
      'Managing 6 dentists across 3 chairs used to be chaos. Now everything flows through one calendar. Revenue is up 34%.',
    rating: 5,
    stat: '+34%',
    statLabel: 'revenue growth in 6 months',
  },
];

export interface PricingPlan {
  id: string;
  name: string;
  monthly: number;
  yearly: number;
  tagline: string;
  features: string[];
  highlighted: boolean;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 49,
    yearly: 470,
    tagline: 'For solo practitioners getting started.',
    features: [
      '1 dentist / 1 chair',
      'Smart scheduling & calendar',
      'Patient SMS reminders (200/mo)',
      'Basic invoicing & receipts',
      'Standard analytics dashboard',
      'Email support',
    ],
    highlighted: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    monthly: 129,
    yearly: 1240,
    tagline: 'For growing multi-chair clinics.',
    features: [
      'Up to 5 dentists / 4 chairs',
      '3D dental charting & EDR',
      'WhatsApp + SMS reminders (unlimited)',
      'Insurance claims & split payments',
      'AI analytics & revenue forecasting',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 349,
    yearly: 3350,
    tagline: 'For hospital chains & franchises.',
    features: [
      'Unlimited dentists & chairs',
      'Multi-branch centralized dashboard',
      'Franchise revenue sharing',
      'HIPAA & GDPR compliance suite',
      'Custom AI model training',
      'Dedicated account manager',
    ],
    highlighted: false,
  },
];

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: typeof Activity;
}

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Today's Appointments", value: '24', change: '+12%', positive: true, icon: CalendarClock },
  { label: 'Revenue (MTD)', value: '$48.2k', change: '+34%', positive: true, icon: TrendingUp },
  { label: 'Active Patients', value: '1,847', change: '+8%', positive: true, icon: Users },
  { label: 'No-show Rate', value: '4.2%', change: '-40%', positive: true, icon: Activity },
];

export const heroStats = [
  { value: '5,000+', label: 'Dentists worldwide' },
  { value: '12M+', label: 'Patients managed' },
  { value: '40%', label: 'Avg. no-show reduction' },
  { value: '99.9%', label: 'Uptime SLA' },
];

export const trustLogos = ['BrightSmile', 'Chen Dental', 'Sonrisa Group', 'Pearl Care', 'DentaPro', 'SmileHub'];

export const floatingBadges = [
  { id: 'b1', text: 'Appointment Confirmed', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'b2', text: 'Revenue +34%', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
  { id: 'b3', text: 'AI Charting Active', icon: Sparkles, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { id: 'b4', text: 'Live Consultation', icon: Video, color: 'text-blue-600', bg: 'bg-blue-50' },
];

export const dashboardHotspots = [
  { id: 'h1', x: '12%', y: '22%', title: 'AI Scheduler', desc: 'Auto-fills cancellations from waitlist.' },
  { id: 'h2', x: '68%', y: '35%', title: 'Revenue Pulse', desc: 'Real-time daily revenue tracking.' },
  { id: 'h3', x: '30%', y: '62%', title: 'Patient Timeline', desc: 'Full EDR history at a glance.' },
  { id: 'h4', x: '80%', y: '68%', title: 'Insurance Claims', desc: 'One-click claim generation.' },
];

export const complianceBadges = [
  { label: 'HIPAA Compliant', icon: ShieldCheck },
  { label: 'GDPR Ready', icon: ShieldCheck },
  { label: 'SOC 2 Type II', icon: ShieldCheck },
  { label: 'End-to-end Encrypted', icon: ShieldCheck },
];

export const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'About', href: '#about' },
];
