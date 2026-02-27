'use client';

import { useSelectedTask, useTaskStore } from '@/stores/task-store';

const HORIZON_LABELS: Record<string, string> = {
  'immediate': 'Immediate',
  'this-week': 'This Week',
  'this-month': 'This Month',
  'this-quarter': 'This Quarter',
  'this-year': 'This Year',
  'someday': 'Someday',
};

const HORIZON_COLORS: Record<string, string> = {
  'immediate': '#ef4444',
  'this-week': '#f59e0b',
  'this-month': '#3b82f6',
  'this-quarter': '#8b5cf6',
  'this-year': '#6366f1',
  'someday': '#64748b',
};

export function TaskDetail() {
  const task = useSelectedTask();
  const clearSelection = useTaskStore((s) => s.clearSelection);
  const isOpen = task !== null;

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: 0,
    top: 0,
    width: 480,
    maxWidth: '100vw',
    height: '100vh',
    background: 'rgba(10, 10, 15, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderLeft: '1px solid rgba(148, 163, 184, 0.15)',
    zIndex: 120,
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  };

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.3)',
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
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 6,
    color: '#94a3b8',
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
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 600,
    fontFamily: 'monospace',
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
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
  });

  const driftBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  };

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    margin: '0 20px',
    padding: 12,
    background: 'rgba(30, 30, 40, 0.5)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: 8,
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'monospace',
    resize: 'none',
    outline: 'none',
    minHeight: 120,
  };

  const actionBarStyle: React.CSSProperties = {
    marginTop: 'auto',
    padding: '16px 20px',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'flex',
    gap: 10,
  };

  const btnBase: React.CSSProperties = {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'monospace',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  };

  const completeBtnStyle: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  };

  const dropBtnStyle: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#94a3b8',
    border: '1px solid rgba(148, 163, 184, 0.15)',
  };

  const rescheduleBtnStyle: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  };

  const horizonColor = task ? (HORIZON_COLORS[task.horizon] || '#64748b') : '#64748b';
  const horizonLabel = task ? (HORIZON_LABELS[task.horizon] || task.horizon) : '';

  return (
    <>
      <div style={backdropStyle} onClick={clearSelection} />
      <div style={panelStyle}>
        {task && (
          <>
            <div style={headerStyle}>
              <input
                style={titleInputStyle}
                value={task.title}
                readOnly
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

            <textarea
              style={textareaStyle}
              value={task.rawInput}
              readOnly
            />

            <div style={actionBarStyle}>
              <button
                style={completeBtnStyle}
                onClick={() => console.log('complete', task.id)}
              >
                Complete
              </button>
              <button
                style={dropBtnStyle}
                onClick={() => console.log('drop', task.id)}
              >
                Drop
              </button>
              <button
                style={rescheduleBtnStyle}
                onClick={() => console.log('reschedule', task.id)}
              >
                Reschedule
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
