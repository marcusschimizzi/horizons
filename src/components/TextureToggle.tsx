'use client';

import { useState } from 'react';

type Texture = 'plain' | 'dots' | 'ruled';

const TEXTURES: { id: Texture; label: string; icon: string }[] = [
  { id: 'plain', label: 'Plain', icon: '□' },
  { id: 'dots', label: 'Dots', icon: '⠿' },
  { id: 'ruled', label: 'Lines', icon: '≡' },
];

const BODY_CLASSES: Record<Texture, string> = {
  plain: '',
  dots: 'texture-dots',
  ruled: 'texture-ruled',
};

export function TextureToggle() {
  const [active, setActive] = useState<Texture>('plain');

  const handleSelect = (texture: Texture) => {
    // Remove existing texture classes
    document.body.classList.remove('texture-dots', 'texture-ruled');
    // Add new one if not plain
    const cls = BODY_CLASSES[texture];
    if (cls) document.body.classList.add(cls);
    setActive(texture);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        zIndex: 100,
        display: 'flex',
        gap: 1,
        background: '#fdf8f0',
        border: '1px solid #8b7d6b',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {TEXTURES.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => handleSelect(t.id)}
          style={{
            padding: '6px 10px',
            background: active === t.id ? '#8b7d6b' : 'transparent',
            color: active === t.id ? '#fdf8f0' : '#5c5344',
            border: 'none',
            borderRight: t.id !== 'ruled' ? '1px solid #c5baa8' : 'none',
            fontSize: 13,
            fontFamily: 'var(--font-geist-mono), monospace',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            lineHeight: 1,
          }}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
