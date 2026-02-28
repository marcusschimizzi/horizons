'use client';

import { useState, useEffect } from 'react';

interface DriftNotificationProps {
  count: number;
}

export function DriftNotification({ count }: DriftNotificationProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

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
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 24,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#f59e0b',
        animation: fading ? 'driftToastOut 1s ease forwards' : 'driftToastIn 0.3s ease forwards',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        {count} task{count !== 1 ? 's' : ''} drifted past {count !== 1 ? 'their' : 'its'} horizon
      </div>
    </>
  );
}
