// frontend-nextjs/src/components/SimulationBanner.tsx
import React from 'react';
import { Zap, Shield, Wifi } from 'lucide-react';

export const SimulationBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 border-b border-emerald-500/20 text-white py-3 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-emerald-400">QRSplit MVP</span>
          <span className="text-slate-400">•</span>
          <span className="text-sm text-slate-300">Smart Contract Simulation Mode</span>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>Real-time splits</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Blockchain ready</span>
          </div>
          <span>•</span>
          <span>Perfect for demo</span>
        </div>
      </div>
    </div>
  );
};