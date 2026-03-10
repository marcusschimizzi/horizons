'use client';

import { useState, useEffect } from 'react';
import { useExperienceConfig } from '@/stores/theme-store';

interface DriftNotificationProps {
  count: number;
}

export function DriftNotification({ count }: DriftNotificationProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const { css } = useExperienceConfig();

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 4000);
    const removeTimer = setTimeout(() => setVisible(false), 5000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes driftToastIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes driftToastOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 105,
        padding: '10px 20px',
        background: `${css.accentDrift}1f`,
        border: `1px solid ${css.accentDrift}4d`,
        borderRadius: 24,
        ...(css.backdropBlur > 0 ? {
          backdropFilter: `blur(${css.backdropBlur + 4}px)`,
          WebkitBackdropFilter: `blur(${css.backdropBlur + 4}px)`,
        } : {}),
        fontFamily: 'var(--font-body), sans-serif',
        fontSize: 13,
        color: css.accentDrift,
        animation: fading ? 'driftToastOut 1s ease forwards' : 'driftToastIn 0.3s ease forwards',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        {count} task{count !== 1 ? 's' : ''} drifted past {count !== 1 ? 'their' : 'its'} horizon
      </div>
    </>
  );
}
