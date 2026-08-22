import React from 'react';
import { Stethoscope } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showPulse?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'dark', showPulse = false }) => {
  const dims = {
    sm: { box: 'w-8 h-8', icon: 18, text: 'text-lg' },
    md: { box: 'w-10 h-10', icon: 22, text: 'text-xl' },
    lg: { box: 'w-14 h-14', icon: 30, text: 'text-2xl' },
  }[size];

  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`relative ${dims.box} flex items-center justify-center`}>
        {showPulse && (
          <span className="absolute inset-0 rounded-xl bg-teal-400/40 animate-pulse-ring" />
        )}
        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center shadow-glow-teal">
          <Stethoscope className="text-white" size={dims.icon} strokeWidth={2.5} />
        </div>
      </div>
      <span className={`${dims.text} font-extrabold tracking-tight ${textColor}`}>
        Dent<span className="gradient-text-cyan">Flow</span>
      </span>
    </div>
  );
};
