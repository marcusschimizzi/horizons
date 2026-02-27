'use client';

import { useEffect, useState } from 'react';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

export interface DebugOverlayProps {
  taskBreakdown: { total: number; cards: number; sprites: number };
}

export function DebugOverlay({ taskBreakdown }: DebugOverlayProps) {
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.get('debug') === 'true');
  }, []);

  if (!debug) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 12,
    right: 12,
    zIndex: 9999,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 1.6,
    background: 'rgba(0, 0, 0, 0.75)',
    color: '#94a3b8',
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid rgba(148, 163, 184, 0.2)',
    pointerEvents: 'none',
    minWidth: 220,
  };

  const headingStyle: React.CSSProperties = {
    color: '#e2e8f0',
    fontWeight: 700,
    marginBottom: 4,
    fontSize: 12,
  };

  return (
    <div style={containerStyle}>
      <div style={headingStyle}>Scene Debug</div>
      <div>fogDensity: {SCENE_CONSTANTS.fogDensity}</div>
      <div>bloomIntensity: {SCENE_CONSTANTS.bloomIntensity}</div>
      <div>bloomLuminanceThreshold: {SCENE_CONSTANTS.bloomLuminanceThreshold}</div>
      <div>spriteBaseRadius: {SCENE_CONSTANTS.spriteBaseRadius}</div>
      <div>spriteEmissiveMultiplier: {SCENE_CONSTANTS.spriteEmissiveMultiplier}</div>
      <div>htmlDistanceFactor: {SCENE_CONSTANTS.htmlDistanceFactor}</div>
      <div>lodBoundary: {SCENE_CONSTANTS.cardHorizons.join(', ')}</div>
      <div style={{ ...headingStyle, marginTop: 8 }}>Tasks</div>
      <div>total: {taskBreakdown.total}</div>
      <div>cards: {taskBreakdown.cards}</div>
      <div>sprites: {taskBreakdown.sprites}</div>
    </div>
  );
}
