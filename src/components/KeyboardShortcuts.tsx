'use client';

import { useEffect } from 'react';
import { useExperienceConfig } from '@/stores/theme-store';

interface KeyboardShortcutsProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'L', description: 'Toggle list / 3D view' },
  { key: 'Home', description: 'Snap to present' },
  { key: 'Esc', description: 'Close panel / dismiss' },
  { key: '/', description: 'Focus task input' },
];

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps) {
  const { css } = useExperienceConfig();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const surfaceAlpha = Math.round(css.surfaceOpacity * 255)
    .toString(16)
    .padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: `${css.bgPrimary}99`,
          cursor: 'pointer',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          background: `${css.bgSurface}${surfaceAlpha}`,
          ...(css.backdropBlur > 0
            ? {
                backdropFilter: `blur(${css.backdropBlur + 8}px)`,
                WebkitBackdropFilter: `blur(${css.backdropBlur + 8}px)`,
              }
            : {}),
          border: `1px solid ${css.accentGlow}1f`,
          borderRadius: css.borderRadius,
          padding: '20px 24px',
          minWidth: 280,
          boxShadow: `0 12px 40px ${css.bgPrimary}60`,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 16,
            fontWeight: 600,
            color: css.textPrimary,
            marginBottom: 16,
            letterSpacing: '0.02em',
          }}
        >
          Keyboard Shortcuts
        </div>

        {/* Shortcuts list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <kbd
                style={{
                  fontFamily: 'var(--font-body), sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: css.textPrimary,
                  background: `${css.accentGlow}14`,
                  border: `1px solid ${css.accentGlow}2a`,
                  borderRadius: 4,
                  padding: '4px 8px',
                  minWidth: 36,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                {key}
              </kbd>
              <span
                style={{
                  fontFamily: 'var(--font-body), sans-serif',
                  fontSize: 13,
                  color: css.textSecondary,
                }}
              >
                {description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
