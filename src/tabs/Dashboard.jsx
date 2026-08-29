import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useHabits } from '../hooks/useHabits.js';
import { useProgress } from '../hooks/useProgress.js';
import { showToast } from '../components/Toast.jsx';
import FocusTimer from '../components/FocusTimer.jsx';
import SystemAnnouncement from '../components/SystemAnnouncement.jsx';
import StatCard from '../components/system/StatCard.jsx';
import QuestCard from '../components/system/QuestCard.jsx';
import EmptyState from '../components/system/EmptyState.jsx';
import { ApiError } from '../api/apiClient.js';
import { MOODS } from '../utils/moods.js';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateAuraScore(completedCount, totalActive, learningHours, mood) {
  if (totalActive === 0) return 0;
  const habitScore = Math.min((completedCount / totalActive) * 100, 100);
  const learningScore = Math.min((learningHours / 2.0) * 100, 100);
  let moodScore = 50;
  if (mood === 'Great') moodScore = 100;
  else if (mood === 'Good') moodScore = 75;
  else if (mood === 'Bad') moodScore = 25;
  return Math.round(habitScore * 0.5 + learningScore * 0.3 + moodScore * 0.2);
}

export default function Dashboard({ focusDate, onFocusDateConsumed }) {
  const { user, updateUser } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const progress = useProgress();

  const [selectedDate, setSelectedDate] = useState(focusDate || todayStr());
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [learningHours, setLearningHours] = useState(0);
  const [mood, setMood] = useState('Average');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [monthLearningHours, setMonthLearningHours] = useState(0);
  const [weeklyCompletionPct, setWeeklyCompletionPct] = useState(0);

  const [announcement, setAnnouncement] = useState({ visible: false, level: 1, xp: 0 });
  const previousLevelRef = useRef(user?.level ?? 1);

  // Pick up a date to edit, requested from the Tracker tab's ledger/history filter.
  useEffect(() => {
    if (focusDate) {
      setSelectedDate(focusDate);
      onFocusDateConsumed?.();
    }
  }, [focusDate, onFocusDateConsumed]);

  // Load (or reset) the quick-log form whenever the selected date changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await progress.loadEntry(selectedDate);
        if (cancelled) return;
        if (data) {
          setCheckedIds(new Set(data.completed_habits || []));
          setLearningHours(Number(data.learning_hours) || 0);
          setMood(data.mood || 'Average');
          setNotes(data.notes || '');
        } else {
          setCheckedIds(new Set());
          setLearningHours(0);
          setMood('Average');
          setNotes('');
        }
      } catch {
        // 404-ish "no entry yet" case is handled by data being null upstream;
        // any other failure already surfaced via entryError.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Recompute the trailing-window stats (this month's learning hours, last-7-day
  // habit completion rate) client-side from a fetched range - no Supabase, no
  // cache table, just the range endpoint + a pure function.
  const reloadRangeStats = useMemo(() => async () => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 34);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    const toStr = todayStr();
    try {
      const rows = await progress.loadRange(fromStr, toStr);
      const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const monthHours = rows
        .filter((r) => r.date.startsWith(monthPrefix))
        .reduce((sum, r) => sum + (Number(r.learning_hours) || 0), 0);
      setMonthLearningHours(monthHours);

      const byDate = {};
      rows.forEach((r) => { byDate[r.date] = r; });
      let completionSum = 0;
      const totalHabits = habits.length;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const row = byDate[key];
        const completed = row && Array.isArray(row.completed_habits) ? row.completed_habits.length : 0;
        completionSum += totalHabits > 0 ? completed / totalHabits : 0;
      }
      setWeeklyCompletionPct(Math.round((completionSum / 7) * 100));
    } catch {
      // Leave previous values in place on failure.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits.length]);

  useEffect(() => {
    if (!habitsLoading) reloadRangeStats();
  }, [habitsLoading, reloadRangeStats]);

  function toggleHabit(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const liveAuraScore = calculateAuraScore(checkedIds.size, habits.length, Number(learningHours) || 0, mood);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        completed_habit_ids: Array.from(checkedIds),
        learning_hours: Number(learningHours) || 0,
        mood,
        notes: notes.trim(),
      };
      const snapshot = await progress.saveEntry(selectedDate, payload);
      updateUser({
        xp: snapshot.xp,
        level: snapshot.level,
        xp_into_level: snapshot.xp_into_level,
        xp_for_next_level: snapshot.xp_for_next_level,
        current_streak: snapshot.current_streak,
        shields_remaining: snapshot.shields_remaining,
      });

      if (snapshot.level > previousLevelRef.current) {
        setAnnouncement({ visible: true, level: snapshot.level, xp: snapshot.xp });
        // Full System Announcement overlay is wired up below (not a TODO stub).
      } else {
        showToast('Progress saved!');
      }
      previousLevelRef.current = snapshot.level;
      await reloadRangeStats();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save progress.', true);
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      <SystemAnnouncement
        level={announcement.level}
        xp={announcement.xp}
        visible={announcement.visible}
        onDismiss={() => setAnnouncement((a) => ({ ...a, visible: false }))}
      />

      <div className="overview-grid">
        <StatCard
          icon="fa-fire"
          iconBg="bg-orange-alpha"
          iconStyle={{ color: 'var(--orange)' }}
          label="Current Streak"
          value={`${user?.current_streak ?? 0} Day${(user?.current_streak ?? 0) === 1 ? '' : 's'}`}
          valueStyle={{ color: 'var(--orange)' }}
          sublabel={`🛡️ ${user?.shields_remaining ?? 0} Shields Active`}
        />

        <StatCard
          icon="fa-graduation-cap"
          iconBg="bg-indigo-alpha"
          iconStyle={{ color: 'var(--primary)' }}
          label="Learning Hours"
          value={`${monthLearningHours.toFixed(2)}h`}
          valueStyle={{ color: 'var(--primary)' }}
          sublabel="Tracked this month"
        />

        <StatCard
          icon="fa-circle-check"
          iconBg="bg-emerald-alpha"
          iconStyle={{ color: 'var(--success)' }}
          label="Habit Completion"
          value={`${weeklyCompletionPct}%`}
          sublabel="Weekly consistency rate"
        />

        <StatCard
          icon="fa-star"
          cardStyle={{ borderColor: 'rgba(168, 85, 247, 0.3)' }}
          iconStyle={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: 'var(--secondary)' }}
          label="Aura Score"
          value={`${liveAuraScore}%`}
          valueStyle={{ color: 'var(--secondary)', textShadow: '0 0 10px rgba(168, 85, 247, 0.3)' }}
          sublabel="Daily holistic score"
        />
      </div>

      <div className="pane-left" style={{ maxWidth: 640 }}>
        <div className="card glass-card" style={{ padding: '1.5rem' }}>
          <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
            <h2>Log Today's Habits</h2>
            <span className="text-muted">{dateLabel}</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="habit-checklist-group">
              {habitsLoading && <p className="text-muted">Loading habits...</p>}
              {!habitsLoading && habits.length === 0 && (
                <EmptyState icon="fa-list-check" title="No Quests Configured" message="No habits set up yet for your daily quest log." />
              )}
              {habits.map((habit) => (
                <QuestCard
                  key={habit.id}
                  icon={habit.icon}
                  iconColor={habit.color}
                  name={habit.name}
                  xpReward={10}
                  checked={checkedIds.has(habit.id)}
                  onToggle={() => toggleHabit(habit.id)}
                />
              ))}
            </div>

            <div className="form-row" style={{ marginTop: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="log-learning-hours">Learning hours</label>
                <input
                  type="number" id="log-learning-hours" min="0" max="24" step="0.5"
                  value={learningHours}
                  onChange={(e) => setLearningHours(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="log-mood">Mood</label>
                <select id="log-mood" value={mood} onChange={(e) => setMood(e.target.value)}>
                  {MOODS.map((m) => <option key={m.value} value={m.value}>{m.label} {m.emoji}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="log-notes">Reflection Notes</label>
              <textarea
                id="log-notes" rows={2}
                style={{ width: '100%', resize: 'none', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: 8, borderRadius: 'var(--radius-sm)', outline: 'none' }}
                placeholder="Write daily reflections..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 5 }} disabled={saving}>
              <i className="fa-solid fa-floppy-disk" /> {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        <FocusTimer />
      </div>
    </>
  );
}
