'use client';

import { useRef, useState, useEffect, useCallback, useContext } from 'react';
import { useSelectedTask, useTaskStore, TaskStoreContext } from '@/stores/task-store';
import type { TaskRow } from '@/types/task';
import type { Horizon } from '@/lib/horizons';
import { getZDepth } from '@/lib/horizons';
import { horizonToDateRange } from '@/lib/horizon-dates';
import { getTaskPosition } from '@/lib/spatial';
import { cameraStore } from '@/stores/camera-store';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { useHorizonColors } from '@/lib/horizon-colors';
import { useExperienceConfig } from '@/stores/theme-store';

const HORIZON_LABELS: Record<string, string> = {
  'immediate': 'Immediate',
  'this-week': 'This Week',
  'this-month': 'This Month',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  'someday': 'Someday',
};

const HORIZON_OPTIONS: { value: Horizon; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'this-year', label: 'This Year' },
  { value: 'someday', label: 'Someday' },
];

type ActionResult = 'completed' | 'dropped' | null;

export function TaskDetail() {
  const task = useSelectedTask();
  const store = useContext(TaskStoreContext);
  const clearSelection = useTaskStore((s) => s.clearSelection);
  const horizonColors = useHorizonColors();
  const { css } = useExperienceConfig();
  const isOpen = task !== null;

  const [undoPending, setUndoPending] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult>(null);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closePanelTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const snapshotRef = useRef<TaskRow | null>(null);

  // --- Inline editing state ---
  const [localTitle, setLocalTitle] = useState('');
  const [localRawInput, setLocalRawInput] = useState('');
  const titleDirtyRef = useRef(false);
  const rawInputDirtyRef = useRef(false);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rawInputDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevTaskIdRef = useRef<string | null>(null);

  // --- Refinement state ---
  const [refinementData, setRefinementData] = useState<{ clarifyingQuestion: string; suggestedTitle: string } | null>(null);
  const [refinementResponse, setRefinementResponse] = useState('');
  const [refinementLoading, setRefinementLoading] = useState(false);

  // Sync local state when task changes (keyed on task.id, not task.title/rawInput)
  useEffect(() => {
    if (task && task.id !== prevTaskIdRef.current) {
      setLocalTitle(task.title);
      setLocalRawInput(task.rawInput);
      titleDirtyRef.current = false;
      rawInputDirtyRef.current = false;
      prevTaskIdRef.current = task.id;
    }
    if (!task) {
      prevTaskIdRef.current = null;
    }
  }, [task]);

  // Reset state when panel closes or task changes
  useEffect(() => {
    if (!isOpen) {
      setUndoPending(false);
      setActionResult(null);
    }
  }, [isOpen]);

  // Pan + zoom camera to center on selected task
  useEffect(() => {
    if (task) {
      const pos = getTaskPosition(task.id, task.horizon);
      cameraStore.getState().setPan(pos.x, pos.y);

      // Always zoom so the task's horizon is comfortably in view
      const horizonZ = getZDepth(task.horizon);
      const targetZ = task.horizon === 'someday'
        ? Math.max(horizonZ + 5, SCENE_CONSTANTS.farBoundary)
        : Math.max(horizonZ + 5, SCENE_CONSTANTS.farBoundary);
      cameraStore.setState({ targetZ, velocity: 0, isAnimating: true });
    } else {
      cameraStore.getState().setPan(0, 0);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      if (closePanelTimeoutRef.current) clearTimeout(closePanelTimeoutRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      if (rawInputDebounceRef.current) clearTimeout(rawInputDebounceRef.current);
    };
  }, []);

  // --- Load refinement data ---
  useEffect(() => {
    if (!task || !task.needsRefinement) {
      setRefinementData(null);
      setRefinementResponse('');
      return;
    }
    // Try to parse stored prompt first
    if (task.refinementPrompt) {
      try {
        const parsed = JSON.parse(task.refinementPrompt);
        setRefinementData(parsed);
        return;
      } catch { /* fall through to fetch */ }
    }
    // Fetch from API if no stored prompt
    let cancelled = false;
    setRefinementLoading(true);
    fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.clarifyingQuestion) {
          setRefinementData(data);
          store?.getState().updateTask(task.id, { refinementPrompt: JSON.stringify(data) });
        }
      })
      .catch(() => { /* best effort */ })
      .finally(() => { if (!cancelled) setRefinementLoading(false); });
    return () => { cancelled = true; };
  }, [task?.id, task?.needsRefinement, task?.refinementPrompt, store]);

  // --- Title auto-save ---
  const saveTitle = useCallback((value: string) => {
    if (!store || !task) return;
    titleDirtyRef.current = false;
    store.getState().updateTask(task.id, { title: value });
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: value }),
    }).catch(() => { /* best effort */ });
  }, [store, task]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalTitle(value);
    titleDirtyRef.current = true;
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      if (titleDirtyRef.current) saveTitle(value);
    }, 1000);
  }, [saveTitle]);

  const handleTitleBlur = useCallback(() => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (titleDirtyRef.current) saveTitle(localTitle);
  }, [saveTitle, localTitle]);

  // --- RawInput auto-save ---
  const saveRawInput = useCallback((value: string) => {
    if (!store || !task) return;
    rawInputDirtyRef.current = false;
    store.getState().updateTask(task.id, { rawInput: value });
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawInput: value }),
    }).catch(() => { /* best effort */ });
  }, [store, task]);

  const handleRawInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalRawInput(value);
    rawInputDirtyRef.current = true;
    if (rawInputDebounceRef.current) clearTimeout(rawInputDebounceRef.current);
    rawInputDebounceRef.current = setTimeout(() => {
      if (rawInputDirtyRef.current) saveRawInput(value);
    }, 1000);
  }, [saveRawInput]);

  const handleRawInputBlur = useCallback(() => {
    if (rawInputDebounceRef.current) clearTimeout(rawInputDebounceRef.current);
    if (rawInputDirtyRef.current) saveRawInput(localRawInput);
  }, [saveRawInput, localRawInput]);

  const handleComplete = useCallback(() => {
    if (!store || !task) return;
    const state = store.getState();
    const taskRow = state.tasks.find((t) => t.id === task.id);
    if (!taskRow) return;

    // Snapshot for potential undo
    snapshotRef.current = { ...taskRow };

    // Trigger dissolution animation
    state.startCompletion(task.id);
    setActionResult('completed');
    setUndoPending(true);

    // Schedule PATCH after 4 seconds (allows undo window)
    persistTimeoutRef.current = setTimeout(() => {
      fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }).catch(() => {
        // PATCH failed -- restore the task
        if (snapshotRef.current) {
          store.getState().restoreTask(snapshotRef.current);
        }
      });
      setUndoPending(false);
    }, 4000);

    // Auto-hide undo toast after 4s
    undoTimerRef.current = setTimeout(() => {
      setUndoPending(false);
    }, 4000);

    // Close panel after 1s
    closePanelTimeoutRef.current = setTimeout(() => {
      store.getState().clearSelection();
    }, 1000);
  }, [store, task]);

  const handleUndo = useCallback(() => {
    if (!store || !snapshotRef.current) return;

    // Cancel the pending PATCH
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (closePanelTimeoutRef.current) clearTimeout(closePanelTimeoutRef.current);

    const snapshot = snapshotRef.current;
    store.getState().cancelCompletion(snapshot.id);
    store.getState().restoreTask(snapshot);
    setUndoPending(false);
    setActionResult(null);
    snapshotRef.current = null;
  }, [store]);

  const handleDrop = useCallback(() => {
    if (!store || !task) return;

    // Trigger shrink animation
    store.getState().startDrop(task.id);
    setActionResult('dropped');

    // Immediately persist
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dropped' }),
    }).catch(() => {
      // Best effort -- already removed from UI
    });

    // Remove from store after shrink animation
    setTimeout(() => {
      store.getState().finishDrop(task.id);
    }, 300);

    // Close panel after 1s
    closePanelTimeoutRef.current = setTimeout(() => {
      store.getState().clearSelection();
    }, 1000);
  }, [store, task]);

  const handleReschedule = useCallback((newHorizon: Horizon) => {
    if (!store || !task) return;

    const { earliest, latest } = horizonToDateRange(newHorizon);

    // Snapshot current dates for revert
    const state = store.getState();
    const taskRow = state.tasks.find((t) => t.id === task.id);
    const prevEarliest = taskRow?.targetDateEarliest ?? null;
    const prevLatest = taskRow?.targetDateLatest ?? null;

    // Optimistic update
    state.updateTask(task.id, {
      targetDateEarliest: earliest,
      targetDateLatest: latest,
    });

    // Close panel so user can watch the task drift
    state.clearSelection();

    // Camera auto-pan to new horizon if needed
    const targetZDepth = getZDepth(newHorizon);
    const currentZ = cameraStore.getState().currentZ;
    const { nearBoundary, farBoundary } = SCENE_CONSTANTS;
    // Check if the target Z is outside the visible range (rough heuristic: +/-15 from camera)
    if (targetZDepth < currentZ - 20 || targetZDepth > nearBoundary) {
      cameraStore.setState({
        targetZ: Math.max(farBoundary, Math.min(nearBoundary, targetZDepth + 10)),
        velocity: 0,
        isAnimating: true,
      });
    }

    // Persist to server
    fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetDateEarliest: earliest.toISOString(),
        targetDateLatest: latest.toISOString(),
      }),
    }).catch(() => {
      // Revert optimistic update on failure
      store.getState().updateTask(task.id, {
        targetDateEarliest: prevEarliest,
        targetDateLatest: prevLatest,
      });
    });
  }, [store, task]);

  const handleRefinementSubmit = useCallback(async () => {
    if (!task || !refinementResponse.trim() || refinementLoading) return;
    setRefinementLoading(true);
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, userResponse: refinementResponse.trim() }),
      });
      const data = await res.json();
      if (data.title) {
        store?.getState().updateTask(task.id, {
          title: data.title,
          rawInput: data.rawInput || task.rawInput,
          needsRefinement: false,
          refinementPrompt: null,
        });
        setLocalTitle(data.title);
        if (data.rawInput) setLocalRawInput(data.rawInput);
        setRefinementData(null);
        setRefinementResponse('');
      }
    } catch {
      // best effort
    } finally {
      setRefinementLoading(false);
    }
  }, [task, refinementResponse, refinementLoading, store]);

  // --- Styles ---

  const horizonColor = task ? horizonColors[task.horizon] : horizonColors['someday'];

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 0,
    top: 0,
    width: 480,
    maxWidth: '100vw',
    height: '100vh',
    background: `${css.bgPrimary}f2`,
    ...(css.backdropBlur > 0 ? {
      backdropFilter: `blur(${css.backdropBlur * 2}px)`,
      WebkitBackdropFilter: `blur(${css.backdropBlur * 2}px)`,
    } : {}),
    borderLeft: `2px solid ${horizonColor}`,
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
    zIndex: 120,
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    color: css.textPrimary,
    fontFamily: 'var(--font-body), sans-serif',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'transparent',
    zIndex: 119,
    pointerEvents: isOpen ? 'auto' : 'none',
    opacity: isOpen ? 1 : 0,
    transition: 'opacity 0.2s ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 20px 12px 20px',
    borderBottom: `1px solid ${css.textSecondary}1a`,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: `1px solid ${css.textSecondary}33`,
    borderRadius: 6,
    color: css.textSecondary,
    fontSize: 16,
    width: 32,
    height: 32,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const titleInputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: css.textPrimary,
    fontSize: 22,
    fontWeight: 600,
    fontFamily: 'var(--font-display), serif',
    outline: 'none',
    padding: 0,
  };

  const infoStyle: React.CSSProperties = {
    padding: '16px 20px',
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-body), sans-serif',
    background: `${color}1f`,
    color: color,
    border: `1px solid ${color}44`,
  });

  const driftBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 14,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'var(--font-body), sans-serif',
    background: `${css.accentDrift}1f`,
    color: css.accentDrift,
    border: `1px solid ${css.accentDrift}4d`,
  };

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    margin: '0 20px',
    padding: 12,
    background: `${css.bgSurface}80`,
    border: `1px solid ${css.textSecondary}1a`,
    borderRadius: 8,
    color: css.textPrimary,
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'var(--font-body), sans-serif',
    resize: 'none',
    outline: 'none',
    minHeight: 120,
  };

  const rescheduleSectionStyle: React.CSSProperties = {
    padding: '12px 20px 0 20px',
  };

  const rescheduleLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: css.textMuted,
    fontFamily: 'var(--font-body), sans-serif',
    fontWeight: 500,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const reschedulePillsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  };

  const actionBarStyle: React.CSSProperties = {
    marginTop: 'auto',
    padding: '16px 20px',
    borderTop: `1px solid ${css.textSecondary}1a`,
    display: 'flex',
    gap: 10,
  };

  const btnBase: React.CSSProperties = {
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'var(--font-body), sans-serif',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  };

  const completeBtnStyle: React.CSSProperties = {
    ...btnBase,
    background: `${css.accentSuccess}26`,
    color: css.accentSuccess,
    border: `1px solid ${css.accentSuccess}4d`,
  };

  const dropBtnStyle: React.CSSProperties = {
    ...btnBase,
    background: `${css.textSecondary}1a`,
    color: css.textSecondary,
    border: `1px solid ${css.textSecondary}33`,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: `${css.bgPrimary}d9`,
    zIndex: 1,
    gap: 8,
  };

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 130,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 18px',
    background: `${css.bgSecondary}e6`,
    ...(css.backdropBlur > 0 ? {
      backdropFilter: `blur(${css.backdropBlur + 4}px)`,
      WebkitBackdropFilter: `blur(${css.backdropBlur + 4}px)`,
    } : {}),
    border: `1px solid ${css.accentGlow}1f`,
    borderRadius: 24,
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: 13,
    color: css.textPrimary,
  };

  const undoBtnStyle: React.CSSProperties = {
    background: 'none',
    border: `1px solid ${css.accentSuccess}66`,
    borderRadius: 6,
    color: css.accentSuccess,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-body), sans-serif',
    padding: '4px 10px',
    cursor: 'pointer',
  };

  const driftPromptStyle: React.CSSProperties = {
    margin: '0 20px 12px 20px',
    padding: 14,
    background: `${css.accentDrift}14`,
    border: `1px solid ${css.accentDrift}33`,
    borderRadius: 10,
    fontFamily: 'var(--font-body), sans-serif',
    color: css.accentDrift,
  };

  const driftActionBtnStyle = (color: string): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: `1px solid ${color}44`,
    background: `${color}15`,
    color: color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-body), sans-serif',
    cursor: 'pointer',
  });

  const refinementSectionStyle: React.CSSProperties = {
    margin: '0 20px 12px 20px',
    padding: 14,
    background: `${css.accentRefinement}14`,
    border: `1px solid ${css.accentRefinement}33`,
    borderRadius: 10,
    fontFamily: 'var(--font-body), sans-serif',
  };

  const refinementInputStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    background: `${css.bgSurface}80`,
    border: `1px solid ${css.accentRefinement}33`,
    borderRadius: 8,
    color: css.textPrimary,
    fontSize: 13,
    fontFamily: 'var(--font-body), sans-serif',
    outline: 'none',
  };

  const refinementSubmitStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 8,
    border: `1px solid ${css.accentRefinement}4d`,
    background: `${css.accentRefinement}26`,
    color: css.accentRefinement,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-body), sans-serif',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const horizonLabel = task ? (HORIZON_LABELS[task.horizon] || task.horizon) : '';

  return (
    <>
      <div style={backdropStyle} onClick={clearSelection} />
      <div style={panelStyle}>
        {task && (
          <>
            {/* Success overlay for completed */}
            {actionResult === 'completed' && (
              <div style={overlayStyle}>
                <span style={{ fontSize: 32 }}>&#10003;</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: css.accentSuccess }}>Done</span>
              </div>
            )}

            {/* Success overlay for dropped */}
            {actionResult === 'dropped' && (
              <div style={overlayStyle}>
                <span style={{ fontSize: 14, color: css.textMuted }}>Task dropped</span>
              </div>
            )}

            <div style={headerStyle}>
              <input
                style={titleInputStyle}
                value={localTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
              />
              <button style={closeBtnStyle} onClick={clearSelection}>
                X
              </button>
            </div>

            <div style={infoStyle}>
              <span style={badgeStyle(horizonColor)}>{horizonLabel}</span>
              {task.driftCount > 0 && (
                <span style={driftBadgeStyle}>
                  {task.driftCount} drift{task.driftCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Refinement section */}
            {task.needsRefinement && (
              <div style={refinementSectionStyle}>
                {refinementLoading ? (
                  <div style={{ fontSize: 12, color: css.textMuted, fontStyle: 'italic' }}>
                    Generating refinement prompt...
                  </div>
                ) : refinementData ? (
                  <>
                    <div style={{ fontSize: 12, color: css.accentRefinement, marginBottom: 8, lineHeight: 1.5 }}>
                      {refinementData.clarifyingQuestion}
                    </div>
                    <div style={{ fontSize: 11, color: css.textMuted, marginBottom: 10 }}>
                      Suggested: &ldquo;{refinementData.suggestedTitle}&rdquo;
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={refinementInputStyle}
                        value={refinementResponse}
                        onChange={(e) => setRefinementResponse(e.target.value)}
                        placeholder="Type your response..."
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRefinementSubmit(); }}
                      />
                      <button
                        style={refinementSubmitStyle}
                        onClick={handleRefinementSubmit}
                        disabled={!refinementResponse.trim() || refinementLoading}
                      >
                        Refine
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            <textarea
              style={textareaStyle}
              value={localRawInput}
              onChange={handleRawInputChange}
              onBlur={handleRawInputBlur}
            />

            <div style={rescheduleSectionStyle}>
              <div style={rescheduleLabelStyle}>Reschedule</div>
              <div style={reschedulePillsStyle}>
                {HORIZON_OPTIONS.map((opt) => {
                  const isCurrent = task.horizon === opt.value;
                  const color = horizonColors[opt.value];
                  const pillStyle: React.CSSProperties = {
                    padding: '5px 12px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'var(--font-body), sans-serif',
                    cursor: isCurrent ? 'default' : 'pointer',
                    border: `1px solid ${isCurrent ? color : `${css.textSecondary}33`}`,
                    background: isCurrent ? `${color}33` : `${css.bgSurface}80`,
                    color: isCurrent ? color : css.textSecondary,
                    transition: 'all 0.15s ease',
                  };
                  return (
                    <button
                      key={opt.value}
                      style={pillStyle}
                      onClick={() => handleReschedule(opt.value)}
                      disabled={actionResult !== null}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drift accountability prompt */}
            {task.driftCount >= 3 && actionResult === null && (
              <div style={driftPromptStyle}>
                <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
                  This has moved {task.driftCount} times. What&apos;s in the way?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={driftActionBtnStyle(horizonColors['this-year'])} onClick={() => handleReschedule(task.horizon)}>
                    Recommit
                  </button>
                  <button style={driftActionBtnStyle(horizonColors['someday'])} onClick={() => handleReschedule('someday')}>
                    Snooze
                  </button>
                  <button style={driftActionBtnStyle(css.accentDrift)} onClick={handleDrop}>
                    Drop
                  </button>
                </div>
              </div>
            )}

            <div style={actionBarStyle}>
              <button
                style={completeBtnStyle}
                onClick={handleComplete}
                disabled={actionResult !== null}
              >
                Complete
              </button>
              <button
                style={dropBtnStyle}
                onClick={handleDrop}
                disabled={actionResult !== null}
              >
                Drop
              </button>
            </div>
          </>
        )}
      </div>

      {/* Undo toast */}
      {undoPending && (
        <div style={toastStyle}>
          <span>Task completed</span>
          <button style={undoBtnStyle} onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </>
  );
}
