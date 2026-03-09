'use client';

import { useState, useEffect, useRef } from 'react';
import { useThemeStore } from '@/stores/theme-store';
import { useExperienceConfig } from '@/stores/theme-store';
import { EXPERIENCES } from '@/lib/themes';
import type { ExperienceId } from '@/lib/theme-config';

// ---------------------------------------------------------------------------
// ExperienceSwitcher — gear icon dropdown for switching visual experiences
// ---------------------------------------------------------------------------

const EXPERIENCE_IDS = Object.keys(EXPERIENCES) as ExperienceId[];

export function ExperienceSwitcher() {
  const [open, setOpen] = useState(false);
  const setExperience = useThemeStore((s) => s.setExperience);
  const { id: currentId, css } = useExperienceConfig();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const surfaceAlpha = Math.round(css.surfaceOpacity * 255)
    .toString(16)
    .padStart(2, '0');

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 100,
      }}
    >
      {/* Gear button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Switch experience"
        style={{
          width: 36,
          height: 36,
          borderRadius: css.borderRadius,
          background: `${css.bgSecondary}${surfaceAlpha}`,
          ...(css.backdropBlur > 0
            ? {
                backdropFilter: `blur(${css.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${css.backdropBlur}px)`,
              }
            : {}),
          border: `1px solid ${css.textSecondary}26`,
          color: css.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Simple gear icon */}
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M13.07 2.93l-1.41 1.41M4.34 11.66l-1.41 1.41" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            minWidth: 200,
            background: `${css.bgSurface}${surfaceAlpha}`,
            ...(css.backdropBlur > 0
              ? {
                  backdropFilter: `blur(${css.backdropBlur + 4}px)`,
                  WebkitBackdropFilter: `blur(${css.backdropBlur + 4}px)`,
                }
              : {}),
            border: `1px solid ${css.textSecondary}26`,
            borderRadius: css.borderRadius,
            overflow: 'hidden',
            boxShadow: `0 8px 24px ${css.bgPrimary}40`,
          }}
        >
          <div
            style={{
              padding: '8px 12px 4px 12px',
              fontSize: 10,
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 600,
              color: css.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Experience
          </div>
          {EXPERIENCE_IDS.map((id) => {
            const exp = EXPERIENCES[id];
            const isCurrent = id === currentId;
            return (
              <button
                key={id}
                onClick={() => {
                  setExperience(id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  background: isCurrent ? `${css.accentGlow}14` : 'transparent',
                  color: isCurrent ? css.textPrimary : css.textSecondary,
                  fontSize: 13,
                  fontFamily: 'var(--font-body), sans-serif',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Selection indicator */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isCurrent ? css.accentGlow : 'transparent',
                    border: `1.5px solid ${isCurrent ? css.accentGlow : css.textMuted}`,
                    flexShrink: 0,
                  }}
                />
                {exp.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
