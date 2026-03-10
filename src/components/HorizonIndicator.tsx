'use client';

import { useCameraStore } from '@/stores/camera-store';
import { useHorizonColors } from '@/lib/horizon-colors';
import { useExperienceConfig } from '@/stores/theme-store';
import { HORIZON_BANDS, type Horizon } from '@/lib/horizons';

const HORIZON_LABELS: Record<Horizon, string> = {
  'immediate': 'Now',
  'this-week': 'This Week',
  'this-month': 'This Month',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  'someday': 'Someday',
};

/** Offset from camera Z to approximate the center of the visible field. */
const VIEW_CENTER_OFFSET = 7.5;

function getVisibleHorizon(cameraZ: number): Horizon {
  const viewCenter = cameraZ - VIEW_CENTER_OFFSET;

  // Camera at rest or above — clamp to immediate
  if (viewCenter > 0) return 'immediate';

  for (const band of HORIZON_BANDS) {
    if (viewCenter <= band.zMin && viewCenter > band.zMax) {
      return band.name;
    }
  }

  return 'someday';
}

export function HorizonIndicator() {
  const currentZ = useCameraStore((s) => s.currentZ);
  const horizonColors = useHorizonColors();
  const { css } = useExperienceConfig();
  const horizon = getVisibleHorizon(currentZ);
  const color = horizonColors[horizon];

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        padding: '6px 16px',
        background: `${css.bgPrimary}b3`,
        ...(css.backdropBlur > 0 ? {
          backdropFilter: `blur(${css.backdropBlur}px)`,
          WebkitBackdropFilter: `blur(${css.backdropBlur}px)`,
        } : {}),
        border: '1px solid',
        borderColor: `${color}33`,
        borderRadius: css.borderRadiusLarge,
        fontFamily: 'var(--font-display), serif',
        fontSize: 13,
        fontWeight: 500,
        color,
        transition: 'color 0.4s ease, border-color 0.4s ease',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {HORIZON_LABELS[horizon]}
    </div>
  );
}
