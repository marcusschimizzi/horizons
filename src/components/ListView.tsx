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
  'immediate': '#c0392b',
  'this-week': '#e76b2e',
  'this-month': '#1e3a5f',
  'this-quarter': '#2d5016',
  'this-year': '#4a2c6b',
  'someday': '#8b7d6b',
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

  const toggleHorizonFilter = (horizon: string) => {
    const newHorizons = new Set(listFilters.horizons);
    if (newHorizons.has(horizon)) newHorizons.delete(horizon);
    else newHorizons.add(horizon);
    setListFilter('horizons', newHorizons);
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
        background: '#f5f0e8',
        color: '#1a1605',
        overflowY: 'auto',
        fontFamily: 'var(--font-geist-mono), monospace',
      }}
    >
      {/* Filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#ede8df',
          borderBottom: '1px solid #c5baa8',
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
              borderRadius: 2,
              border: `1px solid ${listFilters.tags.has(tag) ? '#5c5344' : '#c5baa8'}`,
              background: listFilters.tags.has(tag) ? '#5c5344' : 'transparent',
              color: listFilters.tags.has(tag) ? '#f5f0e8' : '#5c5344',
              fontSize: 11,
              fontFamily: 'var(--font-geist-mono), monospace',
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
            borderRadius: 2,
            border: `1px solid ${listFilters.needsRefinement === true ? '#1e3a5f' : '#c5baa8'}`,
            background: listFilters.needsRefinement === true ? '#1e3a5f' : 'transparent',
            color: listFilters.needsRefinement === true ? '#f5f0e8' : '#5c5344',
            fontSize: 11,
            fontFamily: 'var(--font-geist-mono), monospace',
            cursor: 'pointer',
          }}
        >
          needs refinement
        </button>
        <span style={{ width: 1, background: '#c5baa8', alignSelf: 'stretch', margin: '0 4px' }} />
        {HORIZON_ORDER.map((h) => (
          <button
            key={h}
            onClick={() => toggleHorizonFilter(h)}
            style={{
              padding: '4px 10px',
              borderRadius: 2,
              border: `1px solid ${listFilters.horizons.has(h) ? HORIZON_COLORS[h] : '#c5baa8'}`,
              background: listFilters.horizons.has(h) ? HORIZON_COLORS[h] : 'transparent',
              color: listFilters.horizons.has(h) ? '#f5f0e8' : '#5c5344',
              fontSize: 11,
              fontFamily: 'var(--font-geist-mono), monospace',
              cursor: 'pointer',
            }}
          >
            {HORIZON_LABELS[h]}
          </button>
        ))}
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
                  background: 'rgba(26,22,5,0.03)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 10, color: '#9c8f7e' }}>
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
                    color: '#9c8f7e',
                    background: 'rgba(156,143,126,0.12)',
                    padding: '2px 8px',
                    borderRadius: 2,
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
                      borderBottom: '1px solid #c5baa8',
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
                        fontFamily: 'var(--font-serif)',
                        color: '#1a1605',
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
                            background: '#1e3a5f',
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
                          borderRadius: 2,
                          background: 'rgba(124,58,43,0.08)',
                          border: '1px solid rgba(124,58,43,0.3)',
                          color: '#7c3a2b',
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
                          borderRadius: 2,
                          background: 'rgba(197,186,168,0.25)',
                          color: '#5c5344',
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
                          borderRadius: 2,
                          border: '1px solid rgba(45,80,22,0.3)',
                          background: 'transparent',
                          color: '#2d5016',
                          fontSize: 11,
                          fontFamily: 'var(--font-geist-mono), monospace',
                          cursor: 'pointer',
                        }}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleQuickDrop(task.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 2,
                          border: '1px solid rgba(192,57,43,0.3)',
                          background: 'transparent',
                          color: '#c0392b',
                          fontSize: 11,
                          fontFamily: 'var(--font-geist-mono), monospace',
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
                          borderRadius: 2,
                          border: '1px solid rgba(30,58,95,0.3)',
                          background: 'transparent',
                          color: '#1e3a5f',
                          fontSize: 11,
                          fontFamily: 'var(--font-geist-mono), monospace',
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
                          background: '#fdf8f0',
                          border: '1px solid #8b7d6b',
                          borderRadius: 2,
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
                                h === task.horizon ? 'rgba(30,58,95,0.1)' : 'transparent',
                              color: h === task.horizon ? '#1e3a5f' : '#5c5344',
                              fontSize: 12,
                              fontFamily: 'var(--font-geist-mono), monospace',
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
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9c8f7e', fontSize: 13, fontFamily: 'var(--font-geist-mono), monospace' }}>
          No tasks match the current filters
        </div>
      )}
    </div>
  );
}
