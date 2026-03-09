'use client';

import { useEffect, useState } from 'react';
import { useExperienceConfig } from '@/stores/theme-store';

export interface DebugOverlayProps {
  taskBreakdown: { total: number; cards: number; sprites: number };
}

export function DebugOverlay({ taskBreakdown }: DebugOverlayProps) {
  const [debug, setDebug] = useState(false);
  const config = useExperienceConfig();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.get('debug') === 'true');
  }, []);

  if (!debug) return null;

  const { scene, css } = config;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 12,
    right: 12,
    zIndex: 9999,
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: 11,
    lineHeight: 1.6,
    background: `${css.bgPrimary}d9`,
    color: css.textSecondary,
    padding: '10px 14px',
    borderRadius: 6,
    border: `1px solid ${css.textSecondary}33`,
    pointerEvents: 'none',
    minWidth: 220,
  };

  const headingStyle: React.CSSProperties = {
    color: css.textPrimary,
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 12,
  };

  return (
    <div style={containerStyle}>
      <div style={headingStyle}>Scene Debug</div>
      <div>experience: {config.id}</div>
      <div>fogDensity: {scene.fogDensity}</div>
      <div>bloom: {scene.bloom ? `${scene.bloom.intensity}` : 'off'}</div>
      <div>stars: {scene.stars ? `${scene.stars.count}` : 'off'}</div>
      <div>spriteBaseRadius: {scene.sprite.baseRadius}</div>
      <div>lodStrategy: {scene.lodStrategy}</div>
      <div>htmlDistanceFactor: {scene.htmlDistanceFactor}</div>
      <div>cardHorizons: {scene.cardHorizons.join(', ')}</div>
      <div style={{ ...headingStyle, marginTop: 8 }}>Tasks</div>
      <div>total: {taskBreakdown.total}</div>
      <div>cards: {taskBreakdown.cards}</div>
      <div>sprites: {taskBreakdown.sprites}</div>
    </div>
  );
}
