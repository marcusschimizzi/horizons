'use client';

import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { TaskStoreContext, deserializeTask } from '@/stores/task-store';
import { getHorizon, getZDepth } from '@/lib/horizons';
import { cameraStore } from '@/stores/camera-store';
import { SCENE_CONSTANTS } from '@/lib/scene-constants';
import { useExperienceConfig } from '@/stores/theme-store';
import type { TaskRow } from '@/types/task';
import type { ParsedTask } from '@/app/api/parse/route';

// ---------------------------------------------------------------------------
// Horizon label mapping for toast display
// ---------------------------------------------------------------------------

const HORIZON_LABELS: Record<string, string> = {
  immediate: 'Now',
  'this-week': 'This Week',
  'this-month': 'This Month',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  someday: 'Someday',
};

// ---------------------------------------------------------------------------
// InputBubble — fixed DOM overlay input at bottom center of viewport
// ---------------------------------------------------------------------------

export function InputBubble() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string; horizon: string } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = useContext(TaskStoreContext);
  const { css } = useExperienceConfig();

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastFadeTimerRef.current) clearTimeout(toastFadeTimerRef.current);
    };
  }, []);

  // Show toast helper
  const showToast = useCallback((title: string, horizonLabel: string) => {
    setToastFading(false);
    setToast({ title, horizon: horizonLabel });

    if (toastFadeTimerRef.current) clearTimeout(toastFadeTimerRef.current);
    toastFadeTimerRef.current = setTimeout(() => {
      setToastFading(true);
    }, 2500);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      setToastFading(false);
    }, 3000);
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || !store) return;

    setIsLoading(true);
    setError(null);

    // Step 1: Parse via /api/parse
    let parsed: ParsedTask;
    try {
      let parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed }),
      });

      // Silent retry once on failure
      if (!parseRes.ok) {
        parseRes = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: trimmed }),
        });
      }

      if (!parseRes.ok) {
        setError("Couldn't understand that. Try rephrasing.");
        setIsLoading(false);
        inputRef.current?.focus();
        return;
      }

      parsed = await parseRes.json();
    } catch {
      setError("Couldn't understand that. Try rephrasing.");
      setIsLoading(false);
      inputRef.current?.focus();
      return;
    }

    // Step 2: Build optimistic temp task
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const tempTask: TaskRow = {
      id: tempId,
      userId: '', // placeholder — replaced by real task from API
      rawInput: trimmed,
      title: parsed.title,
      targetDateEarliest: parsed.targetDateEarliest ? new Date(parsed.targetDateEarliest) : null,
      targetDateLatest: parsed.targetDateLatest ? new Date(parsed.targetDateLatest) : null,
      hardDeadline: null,
      needsRefinement: parsed.needsRefinement,
      refinementPrompt: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      driftCount: 0,
      tags: parsed.tags.length > 0 ? parsed.tags : null,
    };

    // Step 3: Add optimistically to store
    store.getState().addTask(tempTask);

    // Step 4: Compute horizon for toast and camera pan
    const targetDate = tempTask.targetDateEarliest && tempTask.targetDateLatest
      ? { earliest: tempTask.targetDateEarliest, latest: tempTask.targetDateLatest }
      : null;
    const horizon = getHorizon(targetDate, now);
    const horizonLabel = HORIZON_LABELS[horizon] ?? horizon;

    // Step 5: Clear input, stop loading
    setInputValue('');
    setIsLoading(false);
    inputRef.current?.focus();

    // Step 6: Show toast
    showToast(parsed.title, horizonLabel);

    // Step 7: Camera pan if horizon is out of view.
    // Skip 'someday' — it's 100+ Z-units away and flying there always feels like a teleport.
    // The toast is sufficient feedback for a vague far-future task.
    if (horizon !== 'someday') {
      const horizonZ = getZDepth(horizon);
      const { currentZ } = cameraStore.getState();
      const isVisible = horizonZ <= currentZ && horizonZ >= currentZ - 15;
      if (!isVisible) {
        const targetZ = Math.max(horizonZ + 7.5, SCENE_CONSTANTS.farBoundary);
        cameraStore.setState({ targetZ, velocity: 0, isAnimating: true });
      }
    }

    // Step 8: Background persist (fire and forget)
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: parsed.title,
        rawInput: trimmed,
        targetDateEarliest: tempTask.targetDateEarliest?.toISOString() ?? null,
        targetDateLatest: tempTask.targetDateLatest?.toISOString() ?? null,
        needsRefinement: parsed.needsRefinement,
        tags: parsed.tags.length > 0 ? parsed.tags : null,
        status: 'active' as const,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Persist failed');
        return res.json();
      })
      .then((data: Record<string, unknown>) => {
        const real = deserializeTask(data);
        store.getState().replaceTask(tempId, real);
      })
      .catch(() => {
        store.getState().removeTask(tempId);
        setError("Couldn't save task. Try again.");
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setError(null), 5000);
      });
  }, [inputValue, isLoading, store, showToast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showSubmitButton = inputValue.trim().length > 0 && !isLoading;

  // --- Styles ---

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 110,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  };

  const borderColor = isFocused
    ? `${css.accentGlow}66`
    : isHovered
      ? `${css.accentGlow}40`
      : `${css.accentGlow}26`;

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: 'min(420px, calc(100vw - 48px))',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: `${css.bgSecondary}e6`,
    ...(css.backdropBlur > 0 ? {
      backdropFilter: `blur(${css.backdropBlur + 4}px)`,
      WebkitBackdropFilter: `blur(${css.backdropBlur + 4}px)`,
    } : {}),
    border: `1px solid ${borderColor}`,
    borderRadius: 28,
    padding: '12px 48px 12px 20px',
    color: css.textPrimary,
    fontSize: 14,
    fontFamily: 'var(--font-body), sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    ...(isFocused
      ? { boxShadow: `0 0 16px ${css.accentGlow}14` }
      : {}),
    ...(isLoading
      ? { animation: 'inputPulse 1.2s ease-in-out infinite' }
      : !isFocused
        ? { animation: 'inputBreathing 4s ease-in-out infinite' }
        : {}),
  };

  const submitButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: `${css.accentGlow}1a`,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: submitHovered ? css.textPrimary : css.textSecondary,
    opacity: showSubmitButton ? 1 : 0,
    pointerEvents: showSubmitButton ? 'auto' : 'none',
    transition: 'opacity 0.2s ease, color 0.2s ease',
    outline: 'none',
    padding: 0,
  };

  const loadingDotsStyle: React.CSSProperties = {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  };

  const errorStyle: React.CSSProperties = {
    color: css.accentDrift,
    fontSize: 12,
    fontFamily: 'var(--font-body), sans-serif',
    opacity: error ? 1 : 0,
    transition: 'opacity 0.3s ease',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 'min(420px, calc(100vw - 48px))',
  };

  const toastStyle: React.CSSProperties = {
    background: `${css.bgSecondary}e6`,
    ...(css.backdropBlur > 0 ? {
      backdropFilter: `blur(${css.backdropBlur + 4}px)`,
      WebkitBackdropFilter: `blur(${css.backdropBlur + 4}px)`,
    } : {}),
    border: `1px solid ${css.accentGlow}1f`,
    borderRadius: 16,
    padding: '8px 16px',
    fontSize: 12,
    fontFamily: 'var(--font-body), sans-serif',
    color: css.textSecondary,
    opacity: toastFading ? 0 : 1,
    transition: 'opacity 0.5s ease',
    pointerEvents: 'none',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 'min(420px, calc(100vw - 48px))',
  };

  return (
    <div style={containerStyle}>
      {/* Injected keyframe animation for loading pulse */}
      <style>{`
        @keyframes inputPulse {
          0%, 100% { border-color: ${css.accentGlow}26; }
          50% { border-color: ${css.accentGlow}66; }
        }
        @keyframes inputBreathing {
          0%, 100% { border-color: ${css.accentGlow}1f; }
          50% { border-color: ${css.accentGlow}38; }
        }
        @keyframes loadingDot {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>

      {/* Toast notification */}
      {toast && (
        <div style={toastStyle} role="status" aria-live="polite">
          Added &lsquo;{toast.title}&rsquo; to {toast.horizon}
        </div>
      )}

      {/* Input wrapper */}
      <div style={inputWrapperStyle}>
        <input
          ref={inputRef}
          id="task-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          placeholder="What's on your horizon?"
          disabled={isLoading}
          aria-label="Add a task"
          style={inputStyle}
        />

        {/* Submit button (visible when input has content and not loading) */}
        {!isLoading && (
          <button
            type="button"
            style={submitButtonStyle}
            onClick={handleSubmit}
            onMouseEnter={() => setSubmitHovered(true)}
            onMouseLeave={() => setSubmitHovered(false)}
            aria-label="Submit"
            tabIndex={showSubmitButton ? 0 : -1}
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
          </button>
        )}

        {/* Loading dots (visible when loading) */}
        {isLoading && (
          <div style={loadingDotsStyle}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: css.accentGlow,
                  animation: `loadingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={errorStyle} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
