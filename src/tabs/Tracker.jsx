import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useHabits } from '../hooks/useHabits.js';
import { useProgress } from '../hooks/useProgress.js';
import { showToast } from '../components/Toast.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/system/EmptyState.jsx';
import AttributeBar from '../components/system/AttributeBar.jsx';
import { SkeletonGroup } from '../components/system/Skeleton.jsx';
import { ApiError } from '../api/apiClient.js';
import { MOODS } from '../utils/moods.js';
import { flameClassName } from '../utils/flame.js';

const PAGE_SIZE = 8;
const HISTORY_WINDOW_DAYS = 365;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Tracker({ onEditDate }) {
  const { user, updateUser } = useAuth();
  const { habits } = useHabits();
  const progress = useProgress();

  const [filterDate, setFilterDate] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [monthLearningHours, setMonthLearningHours] = useState(0);
  const [monthCompletionPct, setMonthCompletionPct] = useState(0);

  const reload = useMemo(() => async () => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - (HISTORY_WINDOW_DAYS - 1));
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    try {
      const rows = await progress.loadRange(fromStr, todayStr());
      const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const monthRows = rows.filter((r) => r.date.startsWith(monthPrefix));
      setMonthLearningHours(monthRows.reduce((sum, r) => sum + (Number(r.learning_hours) || 0), 0));
      if (monthRows.length > 0 && habits.length > 0) {
        const avg = monthRows.reduce((sum, r) => {
          const completed = Array.isArray(r.completed_habit_ids) ? r.completed_habit_ids.length : 0;
          return sum + completed / habits.length;
        }, 0) / monthRows.length;
        setMonthCompletionPct(Math.round(avg * 100));
      } else {
        setMonthCompletionPct(0);
      }
    } catch {
      // keep previous values on failure
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits.length]);

  useEffect(() => { reload(); }, [reload]);

  const sortedEntries = useMemo(
    () => [...progress.rangeEntries].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [progress.rangeEntries],
  );

  const moodStats = useMemo(() => {
    if (sortedEntries.length === 0) return [];
    const counts = Object.fromEntries(MOODS.map((m) => [m.value, 0]));
    sortedEntries.forEach((entry) => {
      const mood = counts[entry.mood] !== undefined ? entry.mood : 'Average';
      counts[mood] += 1;
    });
    return MOODS.map((m) => ({
      ...m,
      count: counts[m.value],
      pct: Math.round((counts[m.value] / sortedEntries.length) * 100),
    }));
  }, [sortedEntries]);

  const latestReflection = useMemo(
    () => sortedEntries.find((entry) => entry.notes && entry.notes.trim() !== ''),
    [sortedEntries],
  );

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
  const pageEntries = sortedEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleLoadOrCreate() {
    onEditDate?.(filterDate || todayStr());
  }

  async function handleDelete(date) {
    if (!window.confirm('Are you sure you want to delete this daily progress log?')) return;
    try {
      const snapshot = await progress.deleteEntry(date);
      updateUser({
        xp: snapshot.xp,
        level: snapshot.level,
        current_streak: snapshot.current_streak,
        shields_remaining: snapshot.shields_remaining,
      });
      showToast('Log entry deleted successfully');
      await reload();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete entry.', true);
    }
  }

  return (
    <div className="split-view">
      <div className="pane-left">
        <div className="card glass-card" style={{ padding: '1.5rem' }}>
          <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
            <h2>History Filter</h2>
          </div>
          <div className="form-group">
            <label htmlFor="history-filter-date">Select Date</label>
            <input
              type="date" id="history-filter-date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLoadOrCreate}>
            <i className="fa-solid fa-search" /> Load or Create Entry
          </button>
        </div>

        <div className="card glass-card" style={{ padding: '1.5rem' }}>
          <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
            <h2>Monthly Averages</h2>
          </div>
          <div className="stat-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div className="stat-widget bg-success-alpha">
              <div className="stat-icon text-success"><i className="fa-solid fa-chart-pie" /></div>
              <div className="stat-details">
                <span className="stat-label">Monthly Completion</span>
                <span className="stat-value text-success">{monthCompletionPct}%</span>
              </div>
            </div>
            <div className="stat-widget bg-indigo-alpha">
              <div className="stat-icon text-indigo"><i className="fa-solid fa-graduation-cap" /></div>
              <div className="stat-details">
                <span className="stat-label">Learning Hours</span>
                <span className="stat-value text-indigo">{monthLearningHours.toFixed(1)}h</span>
              </div>
            </div>
            <div className="stat-widget bg-warning-alpha">
              <div className="stat-icon text-warning"><i className={`fa-solid fa-fire ${flameClassName(user?.current_streak)}`} /></div>
              <div className="stat-details">
                <span className="stat-label">Streak Record</span>
                <span className="stat-value text-warning">{user?.current_streak ?? 0} Day{(user?.current_streak ?? 0) === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pane-right">
        <div className="card glass-card" style={{ padding: '1.5rem' }}>
          <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
            <h2><i className="fa-solid fa-heart" style={{ color: 'var(--primary)', marginRight: 8 }} />Mood & Gratitude</h2>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Trailing {HISTORY_WINDOW_DAYS} days</span>
          </div>
          {moodStats.length === 0 ? (
            <EmptyState
              icon="fa-heart"
              title="No Mood Data Yet"
              message="Log today's mood and a reflection from the Dashboard to start seeing your trends here."
            />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {moodStats.map((m) => (
                  <AttributeBar
                    key={m.value}
                    code={m.emoji}
                    label={`${m.label} (${m.count})`}
                    icon={m.icon}
                    value={m.pct}
                    color={m.color}
                    glow={m.glow}
                  />
                ))}
              </div>
              {latestReflection && (
                <div className="ledger-reflection" style={{ marginTop: '1.25rem' }}>
                  <i className="fa-solid fa-quote-left" style={{ opacity: 0.3, marginRight: 8 }} />
                  {latestReflection.notes}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card glass-card" style={{ padding: 0 }}>
          <div className="card-header border-bottom">
            <h2>Activity Ledger</h2>
            <span className="card-action text-muted">{sortedEntries.length} Records</span>
          </div>
          <div className="task-list-wrapper">
            {progress.rangeLoading && <SkeletonGroup count={5} height={64} />}
            {!progress.rangeLoading && sortedEntries.length === 0 && (
              <EmptyState
                icon="fa-book-open"
                title="No Records Found"
                message="Select a date on the left to start logging your daily progress and reflection notes."
              />
            )}
            {pageEntries.map((entry) => {
              const formattedDate = new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              });
              const completedSet = new Set(entry.completed_habit_ids || []);
              return (
                <div key={entry.date} className="ledger-item-card">
                  <div className="ledger-card-header">
                    <div className="ledger-card-date">
                      <i className="fa-regular fa-calendar" style={{ color: 'var(--primary)' }} /> {formattedDate}
                    </div>
                    <div className="ledger-card-actions">
                      <button type="button" className="btn-icon" title="Edit Log" onClick={() => onEditDate?.(entry.date)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button type="button" className="btn-icon text-rose" title="Delete Log" onClick={() => handleDelete(entry.date)}>
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </div>
                  <div className="ledger-card-body">
                    <div className="ledger-metrics-row">
                      <span className="ledger-stat-bubble text-indigo" style={{ flex: 1 }}>
                        <i className="fa-solid fa-book-open-reader" /> {Number(entry.learning_hours || 0).toFixed(1)}h
                      </span>
                      <span className="ledger-stat-bubble text-orange" style={{ flex: 1 }}>
                        <i className="fa-solid fa-face-smile" /> {entry.mood}
                      </span>
                    </div>
                    <div className="ledger-habits-grid">
                      {habits.map((habit) => {
                        const done = completedSet.has(habit.id);
                        return (
                          <div
                            key={habit.id}
                            className="mini-habit-dot"
                            title={habit.name}
                            style={done ? { backgroundColor: `${habit.color}18`, color: habit.color, border: `1px solid ${habit.color}25` } : undefined}
                          >
                            <i className={habit.icon} />
                          </div>
                        );
                      })}
                    </div>
                    {entry.notes && entry.notes.trim() !== '' && (
                      <div className="ledger-reflection" style={{ marginTop: '1rem' }}>
                        <i className="fa-solid fa-quote-left" style={{ opacity: 0.3, marginRight: 8 }} />
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {sortedEntries.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
