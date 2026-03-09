'use client';

import { useState, useMemo, useContext } from 'react';
import { useTasksWithHorizon, useTaskStore, TaskStoreContext } from '@/stores/task-store';
import { horizonToDateRange } from '@/lib/horizon-dates';
import type { Horizon } from '@/lib/horizons';
import { useHorizonColors } from '@/lib/horizon-colors';
import { useExperienceConfig } from '@/stores/theme-store';

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

const TAG_OPTIONS = ['work', 'personal', 'health', 'finance', 'home', 'social'] as const;

// ---------------------------------------------------------------------------
// ListView
// ---------------------------------------------------------------------------

export function ListView() {
  const tasks = useTasksWithHorizon();
  const store = useContext(TaskStoreContext);
  const listFilters = useTaskStore((s) => s.listFilters);
  const setListFilter = useTaskStore((s) => s.setListFilter);
  const horizonColors = useHorizonColors();
  const { css } = useExperienceConfig();
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

  const tagColors = css.tags as Record<string, string>;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        background: css.bgPrimary,
        overflowY: 'auto',
        fontFamily: 'var(--font-body), sans-serif',
      }}
    >
      {/* Stagger animation keyframe */}
      <style>{`
        @keyframes listRowReveal {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Filter bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: css.bgPrimary,
          borderBottom: `1px solid ${css.textSecondary}1a`,
          padding: '60px 20px 12px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          zIndex: 2,
        }}
      >
        {TAG_OPTIONS.map((tag) => {
          const tagColor = tagColors[tag] ?? css.textSecondary;
          return (
            <button
              key={tag}
              onClick={() => toggleTagFilter(tag)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${listFilters.tags.has(tag) ? tagColor : `${css.textSecondary}33`}`,
                background: listFilters.tags.has(tag) ? `${tagColor}1f` : 'transparent',
                color: listFilters.tags.has(tag) ? tagColor : css.textMuted,
                fontSize: 11,
                fontFamily: 'var(--font-body), sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {tag}
            </button>
          );
        })}
        <button
          onClick={toggleRefinementFilter}
          style={{
            padding: '4px 10px',
            borderRadius: 20,
            border: `1px solid ${listFilters.needsRefinement === true ? css.accentRefinement : `${css.textSecondary}33`}`,
            background: listFilters.needsRefinement === true ? `${css.accentRefinement}26` : 'transparent',
            color: listFilters.needsRefinement === true ? css.accentRefinement : css.textMuted,
            fontSize: 11,
            fontFamily: 'var(--font-body), sans-serif',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          needs refinement
        </button>
        <span style={{ width: 1, background: `${css.textSecondary}26`, alignSelf: 'stretch', margin: '0 4px' }} />
        {HORIZON_ORDER.map((h) => {
          const hColor = horizonColors[h as Horizon];
          return (
            <button
              key={h}
              onClick={() => toggleHorizonFilter(h)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${listFilters.horizons.has(h) ? hColor : `${css.textSecondary}33`}`,
                background: listFilters.horizons.has(h) ? `${hColor}26` : 'transparent',
                color: listFilters.horizons.has(h) ? hColor : css.textMuted,
                fontSize: 11,
                fontFamily: 'var(--font-body), sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {HORIZON_LABELS[h]}
            </button>
          );
        })}
      </div>

      {/* Horizon groups */}
      <div style={{ padding: '0 0 80px 0' }}>
        {HORIZON_ORDER.map((horizon) => {
          const sectionTasks = grouped.get(horizon) || [];
          if (sectionTasks.length === 0) return null;
          const isCollapsed = collapsedSections.has(horizon);
          const color = horizonColors[horizon as Horizon];

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
                  background: `${css.textPrimary}05`,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 10, color: css.textMuted }}>
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: 'var(--font-display), serif',
                    color,
                  }}
                >
                  {HORIZON_LABELS[horizon]}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: css.textMuted,
                    background: `${css.textMuted}26`,
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {sectionTasks.length}
                </span>
              </div>

              {/* Task rows */}
              {!isCollapsed &&
                sectionTasks.map((task, rowIndex) => (
                  <div
                    key={task.id}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 20px',
                      borderBottom: `1px solid ${css.textSecondary}0d`,
                      flexWrap: 'wrap',
                      animation: 'listRowReveal 0.3s ease both',
                      animationDelay: `${rowIndex * 50}ms`,
                    }}
                  >
                    {/* Title */}
                    <div
                      onClick={() => store?.getState().selectTask(task.id)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 13,
                        color: css.textPrimary,
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
                            background: css.accentRefinement,
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
                          background: `${css.accentDrift}26`,
                          border: `1px solid ${css.accentDrift}4d`,
                          color: css.accentDrift,
                        }}
                      >
                        {task.driftCount}
                      </span>
                    )}

                    {/* Tags */}
                    {(task.tags || []).map((tag) => {
                      const tColor = tagColors[tag] ?? css.textSecondary;
                      return (
                        <span
                          key={tag}
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: `${tColor}1f`,
                            color: tColor,
                          }}
                        >
                          {tag}
                        </span>
                      );
                    })}

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleQuickComplete(task.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: `1px solid ${css.accentSuccess}33`,
                          background: `${css.accentSuccess}14`,
                          color: css.accentSuccess,
                          fontSize: 11,
                          fontFamily: 'var(--font-body), sans-serif',
                          cursor: 'pointer',
                        }}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleQuickDrop(task.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: `1px solid ${css.textSecondary}33`,
                          background: `${css.textSecondary}14`,
                          color: css.textSecondary,
                          fontSize: 11,
                          fontFamily: 'var(--font-body), sans-serif',
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
                          borderRadius: 8,
                          border: `1px solid ${css.accentGlow}33`,
                          background: `${css.accentGlow}14`,
                          color: css.accentGlow,
                          fontSize: 11,
                          fontFamily: 'var(--font-body), sans-serif',
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
                          background: css.bgSurface,
                          border: `1px solid ${css.textSecondary}26`,
                          borderRadius: 8,
                          overflow: 'hidden',
                          minWidth: 140,
                        }}
                      >
                        {HORIZON_ORDER.map((h) => {
                          const hColor = horizonColors[h as Horizon];
                          return (
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
                                  h === task.horizon ? `${hColor}33` : 'transparent',
                                color: h === task.horizon ? hColor : css.textSecondary,
                                fontSize: 12,
                                fontFamily: 'var(--font-body), sans-serif',
                                cursor: 'pointer',
                              }}
                            >
                              {HORIZON_LABELS[h]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: css.textMuted, fontSize: 13 }}>
          No tasks match the current filters
        </div>
      )}
    </div>
  );
}
