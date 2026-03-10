'use client';

import { useState, useEffect, useContext } from 'react';
import { Html } from '@react-three/drei';
import type { Task } from '@/types/task';
import { useExperienceConfig } from '@/stores/theme-store';
import { TaskStoreContext, useTaskStore, useIsCompleting, useIsDropping } from '@/stores/task-store';
import { getInkColor, getInkShadowAlpha } from '@/lib/ink-weight';

interface TaskCardProps {
  task: Task;
  position: [number, number, number];
  isNew?: boolean;
}

export function TaskCard({ task, position, isNew }: TaskCardProps) {
  const store = useContext(TaskStoreContext);
  const isCompleting = useIsCompleting(task.id);
  const isDropping = useIsDropping(task.id);
  const hasDeadline = task.hardDeadline !== null;
  const isDrifted = task.driftCount > 0;
  const { css, scene } = useExperienceConfig();
  const { htmlDistanceFactor, inkWeight } = scene;
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const isSelected = selectedTaskId === task.id;
  const isDimmed = selectedTaskId !== null && !isSelected;

  // Entrance state: existing tasks start entered, new tasks start un-entered
  const [entered, setEntered] = useState(!isNew);

  useEffect(() => {
    if (!isNew) return;

    const raf = requestAnimationFrame(() => {
      setEntered(true);
    });

    const timer = setTimeout(() => {
      store?.getState().clearNewTask(task.id);
    }, 500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [isNew, task.id, store]);

  const driftOpacity = isDrifted
    ? Math.max(0.6, 1 - task.driftCount * 0.1)
    : 1;

  // Ink-weight colors (whitevoid only — encodes temporal depth into card styling)
  const inkTextColor = inkWeight
    ? getInkColor(task.horizon, inkWeight.darkInk, inkWeight.pencilGray)
    : css.textPrimary;
  const inkBorderColor = inkWeight
    ? getInkColor(task.horizon, inkWeight.borderDark, inkWeight.borderLight)
    : `${css.accentGlow}1f`;
  const inkShadowAlpha = inkWeight ? getInkShadowAlpha(task.horizon) : 0.06;
  const shadowColorSource = inkWeight ? inkWeight.borderDark : css.accentGlow;
  const shadowAlphaHex = Math.round(inkShadowAlpha * 255).toString(16).padStart(2, '0');

  // Surface opacity as hex alpha suffix
  const surfaceAlphaHex = Math.round(css.surfaceOpacity * 255).toString(16).padStart(2, '0');

  const pulseAnimation = hasDeadline
    ? 'deadlinePulse 4s ease-in-out infinite'
    : task.needsRefinement
      ? 'refinementPulse 3s ease-in-out infinite'
      : undefined;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: 200,
    padding: '10px 14px',
    background: `${css.bgSecondary}${surfaceAlphaHex}`,
    ...(css.backdropBlur > 0 ? {
      backdropFilter: `blur(${css.backdropBlur}px)`,
      WebkitBackdropFilter: `blur(${css.backdropBlur}px)`,
    } : {}),
    border: `1px solid ${inkBorderColor}`,
    borderRadius: css.borderRadius,
    boxShadow: `inset 0 0 12px ${shadowColorSource}${shadowAlphaHex}`,
    color: inkTextColor,
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: 13,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'visible',
    textOverflow: 'ellipsis',
    pointerEvents: 'auto',
    cursor: 'pointer',
    opacity: entered ? (isDimmed ? driftOpacity * 0.25 : driftOpacity) : 0,
    transform: entered ? (isSelected ? 'scale(1.04)' : 'scale(1)') : 'scale(0.85)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    ...(pulseAnimation ? { animation: pulseAnimation } : {}),
    ...(isDrifted
      ? {
          filter: `saturate(${Math.max(0.3, 1 - task.driftCount * 0.15)})`,
        }
      : {}),
    ...(isCompleting
      ? {
          opacity: 0,
          transform: 'scale(0.5)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        }
      : {}),
    ...(isDropping
      ? {
          transform: 'scale(0)',
          transition: 'transform 0.2s ease-in',
        }
      : {}),
  };

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={htmlDistanceFactor}
        zIndexRange={[110, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <>
          <style>{`
            @keyframes refinementPulse {
              0%, 100% { box-shadow: 0 0 4px ${css.accentRefinement}33, inset 0 0 2px ${css.accentRefinement}1a; }
              50% { box-shadow: 0 0 12px ${css.accentRefinement}80, inset 0 0 4px ${css.accentRefinement}33; }
            }
            @keyframes deadlinePulse {
              0%, 100% { box-shadow: 0 0 6px ${css.accentGlow}4d; }
              50% { box-shadow: 0 0 14px ${css.accentGlow}99, inset 0 0 4px ${css.accentGlow}26; }
            }
          `}</style>
          <div style={cardStyle} onClick={() => store?.getState().selectTask(task.id)}>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
            {isDrifted && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: `${css.accentDrift}e6`,
                color: css.textPrimary,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-body), sans-serif',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.5px solid ${css.bgPrimary}cc`,
              }}>
                {task.driftCount}
              </span>
            )}
          </div>
        </>
      </Html>
    </group>
  );
}
