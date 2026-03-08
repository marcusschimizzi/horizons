'use client';

import { useCameraStore } from '@/stores/camera-store';
import { HORIZON_BANDS } from '@/lib/horizons';
import type { Horizon } from '@/lib/horizons';

const HORIZON_LABELS: Record<Horizon, string> = {
  'immediate':    'Present',
  'this-week':    'This Week',
  'this-month':   'This Month',
  'this-quarter': 'This Quarter',
  'this-year':    'This Year',
  'someday':      'Someday',
};

function getHorizonAtZ(z: number): Horizon {
  for (const band of HORIZON_BANDS) {
    if (z <= band.zMin && z >= band.zMax) return band.name;
  }
  return z >= 0 ? 'immediate' : 'someday';
}

export function HorizonIndicator() {
  const currentZ = useCameraStore((s) => s.currentZ);
  const horizon = getHorizonAtZ(currentZ);
  const label = HORIZON_LABELS[horizon];

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes horizonFadeIn {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <span
        key={label}
        style={{
          display: 'block',
          color: '#8b7d6b',
          fontSize: 11,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          animation: 'horizonFadeIn 0.25s ease-out both',
        }}
      >
        {label}
      </span>
    </div>
  );
}
