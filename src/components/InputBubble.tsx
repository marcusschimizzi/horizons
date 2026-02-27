'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// InputBubble — fixed DOM overlay input at bottom center of viewport
// ---------------------------------------------------------------------------

export interface InputBubbleProps {
  onSubmit?: (input: string) => Promise<{ title: string; horizon: string } | void>;
}

export function InputBubble({ onSubmit }: InputBubbleProps) {
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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (toastFadeTimerRef.current) clearTimeout(toastFadeTimerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading || !onSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onSubmit(trimmed);
      setInputValue('');

      if (result) {
        setToastFading(false);
        setToast(result);

        // Auto-dismiss toast after 3 seconds (with fade-out starting at 2.5s)
        if (toastFadeTimerRef.current) clearTimeout(toastFadeTimerRef.current);
        toastFadeTimerRef.current = setTimeout(() => {
          setToastFading(true);
        }, 2500);

        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setToast(null);
          setToastFading(false);
        }, 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);

      // Auto-dismiss error after 5 seconds
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading, onSubmit]);

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
    ? 'rgba(148, 163, 184, 0.4)'
    : isHovered
      ? 'rgba(148, 163, 184, 0.3)'
      : 'rgba(148, 163, 184, 0.2)';

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: 'min(420px, calc(100vw - 48px))',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(18, 18, 26, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${borderColor}`,
    borderRadius: 24,
    padding: '12px 48px 12px 20px',
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    ...(isLoading
      ? { animation: 'inputPulse 1.2s ease-in-out infinite' }
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
    background: 'rgba(148, 163, 184, 0.1)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: submitHovered ? '#e2e8f0' : '#94a3b8',
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
    color: '#f87171',
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: error ? 1 : 0,
    transition: 'opacity 0.3s ease',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 'min(420px, calc(100vw - 48px))',
  };

  const toastStyle: React.CSSProperties = {
    background: 'rgba(18, 18, 26, 0.9)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    borderRadius: 16,
    padding: '8px 16px',
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#94a3b8',
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
          0%, 100% { border-color: rgba(148, 163, 184, 0.2); }
          50% { border-color: rgba(148, 163, 184, 0.5); }
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
                  background: '#94a3b8',
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
