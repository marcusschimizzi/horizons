'use client';

import { useState, useMemo, useContext } from 'react';
import { useTasksWithHorizon, useTaskStore, TaskStoreContext } from '@/stores/task-store';
import { horizonToDateRange } from '@/lib/horizon-dates';
import type { Horizon } from '@/lib/horizons';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HORIZON_ORDER: string[] = [
  'immediate',
  'this-week',
  'this-month',
  'this-quarter',
  'this-year',
  'someday',
];

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
  'this-week': '#f97316',
  'this-month': '#eab308',
  'this-quarter': '#22c55e',
  'this-year': '#3b82f6',
  'someday': '#8b5cf6',
};

const TAG_OPTIONS = ['work', 'personal', 'health', 'finance', 'home', 'social'] as const;

// ---------------------------------------------------------------------------
// ListView
// ---------------------------------------------------------------------------

export function ListView() {
  const tasks = useTasksWithHorizon();
  const store = useContext(TaskStoreContext);
  const listFilters = useTaskStore((s) => s.listFilters);
  const setListFilter = useTaskStore((s) => s.setListFilter);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [rescheduleOpenId, setRescheduleOpenId] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (listFilters.tags.size > 0) {
        const taskTags = task.tags || [];
        if (!taskTags.some((t) => listFilters.tags.has(t))) return false;
      }
      if (listFilters.needsRefinement === true && !task.needsRefinement) return false;
      if (listFilters.needsRefinement === false && task.needsRefinement) return false;
      if (listFilters.horizons.size > 0 && !listFilters.horizons.has(task.horizon)) return false;
      return true;
    });
  }, [tasks, listFilters]);

  // Group by horizon
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredTasks>();
    for (const h of HORIZON_ORDER) map.set(h, []);
    for (const task of filteredTasks) {
      map.get(task.horizon)?.push(task);
    }
    return map;
  }, [filteredTasks]);

  const toggleSection = (horizon: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(horizon)) next.delete(horizon);
      else next.add(horizon);
      return next;
    });
  };

  const toggleTagFilter = (tag: string) => {
    const newTags = new Set(listFilters.tags);
    if (newTags.has(tag)) newTags.delete(tag);
    else newTags.add(tag);
    setListFilter('tags', newTags);
  };

  const toggleRefinementFilter = () => {
    setListFilter('needsRefinement', listFilters.needsRefinement === true ? null : true);
  };

  // Quick actions
  const handleQuickComplete = async (taskId: string) => {
    store?.getState().startCompletion(taskId);
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    store?.getState().finishCompletion(taskId);
  };

  const handleQuickDrop = async (taskId: string) => {
    store?.getState().startDrop(taskId);
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dropped' }),
    });
    setTimeout(() => store?.getState().finishDrop(taskId), 300);
  };

  const handleQuickReschedule = async (taskId: string, newHorizon: Horizon) => {
    const { earliest, latest } = horizonToDateRange(newHorizon);
    store?.getState().updateTask(taskId, {
      targetDateEarliest: earliest,
      targetDateLatest: latest,
    });
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetDateEarliest: earliest.toISOString(),
        targetDateLatest: latest.toISOString(),
      }),
    });
    setRescheduleOpenId(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        background: '#0a0a0f',
        overflowY: 'auto',
        fontFamily: 'monospace',
      }}
    >
      {/* Filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0a0a0f',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          padding: '60px 20px 12px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          zIndex: 2,
        }}
      >
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTagFilter(tag)}
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${listFilters.tags.has(tag) ? '#3b82f6' : 'rgba(148,163,184,0.2)'}`,
              background: listFilters.tags.has(tag) ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: listFilters.tags.has(tag) ? '#3b82f6' : '#64748b',
              fontSize: 11,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            {tag}
          </button>
        ))}
        <button
          onClick={toggleRefinementFilter}
          style={{
            padding: '4px 10px',
            borderRadius: 20,
            border: `1px solid ${listFilters.needsRefinement === true ? '#88aaff' : 'rgba(148,163,184,0.2)'}`,
            background: listFilters.needsRefinement === true ? 'rgba(136,170,255,0.15)' : 'transparent',
            color: listFilters.needsRefinement === true ? '#88aaff' : '#64748b',
            fontSize: 11,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          needs refinement
        </button>
      </div>

      {/* Horizon groups */}
      <div style={{ padding: '0 0 80px 0' }}>
        {HORIZON_ORDER.map((horizon) => {
          const sectionTasks = grouped.get(horizon) || [];
          if (sectionTasks.length === 0) return null;
          const isCollapsed = collapsedSections.has(horizon);
          const color = HORIZON_COLORS[horizon];

          return (
            <div key={horizon}>
              {/* Section header */}
              <div
                onClick={() => toggleSection(horizon)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 20px',
                  borderLeft: `3px solid ${color}`,
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 10, color: '#64748b' }}>
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {HORIZON_LABELS[horizon]}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: '#64748b',
                    background: 'rgba(100,116,139,0.15)',
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {sectionTasks.length}
                </span>
              </div>

              {/* Task rows */}
              {!isCollapsed &&
                sectionTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 20px',
                      borderBottom: '1px solid rgba(148,163,184,0.05)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Title */}
                    <div
                      onClick={() => store?.getState().selectTask(task.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {task.title}
                      {task.needsRefinement && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#88aaff',
                            flexShrink: 0,
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>

                    {/* Drift badge */}
                    {(task.driftCount || 0) > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 10,
                          background: 'rgba(245,158,11,0.15)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          color: '#f59e0b',
                        }}
                      >
                        {task.driftCount}
                      </span>
                    )}

                    {/* Tags */}
                    {(task.tags || []).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 10,
                          background: 'rgba(148,163,184,0.08)',
                          color: '#64748b',
                        }}
                      >
                        {tag}
                      </span>
                    ))}

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleQuickComplete(task.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(34,197,94,0.2)',
                          background: 'rgba(34,197,94,0.08)',
                          color: '#22c55e',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                        }}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleQuickDrop(task.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(148,163,184,0.2)',
                          background: 'rgba(148,163,184,0.08)',
                          color: '#64748b',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                        }}
                      >
                        Drop
                      </button>
                      <button
                        onClick={() =>
                          setRescheduleOpenId(rescheduleOpenId === task.id ? null : task.id)
                        }
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(59,130,246,0.2)',
                          background: 'rgba(59,130,246,0.08)',
                          color: '#3b82f6',
                          fontSize: 11,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                        }}
                      >
                        Move
                      </button>
                    </div>

                    {/* Inline reschedule dropdown */}
                    {rescheduleOpenId === task.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 20,
                          top: '100%',
                          zIndex: 10,
                          background: '#131320',
                          border: '1px solid rgba(148,163,184,0.15)',
                          borderRadius: 8,
                          overflow: 'hidden',
                          minWidth: 140,
                        }}
                      >
                        {HORIZON_ORDER.map((h) => (
                          <button
                            key={h}
                            onClick={() => handleQuickReschedule(task.id, h as Horizon)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '8px 14px',
                              textAlign: 'left',
                              border: 'none',
                              background:
                                h === task.horizon ? 'rgba(59,130,246,0.15)' : 'transparent',
                              color: h === task.horizon ? '#3b82f6' : '#94a3b8',
                              fontSize: 12,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                            }}
                          >
                            {HORIZON_LABELS[h]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: 13 }}>
          No tasks match the current filters
        </div>
      )}
    </div>
  );
}
