'use client';

import { useState, useEffect } from 'react';
import { useExperienceConfig } from '@/stores/theme-store';

// ---------------------------------------------------------------------------
// TextureToggle — whitevoid-only paper texture switcher (plain/dots/ruled)
// ---------------------------------------------------------------------------

type TextureMode = 'plain' | 'dots' | 'ruled';

const TEXTURE_OPTIONS: { mode: TextureMode; label: string }[] = [
  { mode: 'plain', label: 'Plain' },
  { mode: 'dots', label: 'Dots' },
  { mode: 'ruled', label: 'Ruled' },
];

export function TextureToggle() {
  const { scene, css } = useExperienceConfig();
  const [mode, setMode] = useState<TextureMode>('plain');

  // Apply texture class to document body (must be before conditional return)
  useEffect(() => {
    if (!scene.paperTexture) return;
    const body = document.body;
    body.classList.remove('texture-dots', 'texture-ruled');
    if (mode === 'dots') body.classList.add('texture-dots');
    if (mode === 'ruled') body.classList.add('texture-ruled');
    return () => {
      body.classList.remove('texture-dots', 'texture-ruled');
    };
  }, [mode, scene.paperTexture]);

  // Only render when the experience supports paper textures
  if (!scene.paperTexture) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 100,
        display: 'flex',
        gap: 2,
        background: `${css.bgSecondary}e6`,
        border: `1px solid ${css.textSecondary}26`,
        borderRadius: css.borderRadius,
        padding: 2,
        fontFamily: 'var(--font-body), sans-serif',
      }}
    >
      {TEXTURE_OPTIONS.map(({ mode: m, label }) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            padding: '4px 10px',
            borderRadius: Math.max(css.borderRadius - 2, 1),
            border: 'none',
            background: mode === m ? `${css.accentGlow}1a` : 'transparent',
            color: mode === m ? css.textPrimary : css.textMuted,
            fontSize: 11,
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: mode === m ? 600 : 400,
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
