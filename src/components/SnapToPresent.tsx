'use client';

import { useState } from 'react';
import { cameraStore, useCameraStore } from '@/stores/camera-store';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';

// ---------------------------------------------------------------------------
// SnapToPresent — DOM overlay button that appears when camera is away from present
// ---------------------------------------------------------------------------

export function SnapToPresent() {
  const isAway = useCameraStore(
    (s) => Math.abs(s.currentZ - SCENE_CONSTANTS.cameraRestZ) > SCENE_CONSTANTS.snapDistanceThreshold,
  );
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    cameraStore.getState().snapToPresent();
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 88,
    left: '50%',
    transform: isAway ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)',
    zIndex: 100,
    opacity: isAway ? 1 : 0,
    pointerEvents: isAway ? 'auto' : 'none',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${hovered ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
    borderRadius: 20,
    padding: '8px 20px',
    color: hovered ? '#e2e8f0' : '#94a3b8',
    fontSize: 13,
    fontFamily: 'monospace',
    cursor: 'pointer',
    transition: 'color 0.2s ease, border-color 0.2s ease',
    outline: 'none',
  };

  return (
    <div style={containerStyle}>
      <button
        type="button"
        style={buttonStyle}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Snap to present"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 11V3" />
          <path d="M3 6l4-4 4 4" />
        </svg>
        Present
      </button>
    </div>
  );
}
