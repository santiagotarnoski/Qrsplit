// frontend-nextjs/src/components/SimulationBanner.tsx
import React from 'react';

export const SimulationBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">🚀</span>
        <span className="font-semibold">QRSplit MVP - Smart Contract Simulation Mode</span>
        <span className="text-lg">✨</span>
      </div>
      <p className="text-sm opacity-90 mt-1">
        All features functional • Real-time splits • Blockchain ready • Perfect for demo
      </p>
    </div>
  );
};