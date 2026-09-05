import { useState } from 'react';
import { useHabits } from '../hooks/useHabits.js';
import { apiClient, ApiError } from '../api/apiClient.js';
import { showToast } from './Toast.jsx';
import EmptyState from './system/EmptyState.jsx';

const ICON_OPTIONS = [
  'fa-dumbbell', 'fa-person-walking', 'fa-book-open', 'fa-shield-halved',
  'fa-brain', 'fa-moon', 'fa-apple-whole', 'fa-glass-water',
  'fa-pen', 'fa-code', 'fa-music', 'fa-heart',
  'fa-sun', 'fa-bicycle', 'fa-mug-hot', 'fa-star',
];

const COLOR_OPTIONS = [
  '#22d3ee', '#a855f7', '#10b981', '#f97316',
  '#6366f1', '#ef4444', '#f59e0b', '#14b8a6',
];

const EVERY_DAY = 127;
const DAYS = [
  { bit: 0, label: 'Mon' }, { bit: 1, label: 'Tue' }, { bit: 2, label: 'Wed' },
  { bit: 3, label: 'Thu' }, { bit: 4, label: 'Fri' }, { bit: 5, label: 'Sat' }, { bit: 6, label: 'Sun' },
];

function scheduleSummary(schedule) {
  if (schedule === EVERY_DAY) return null;
  const days = DAYS.filter((d) => (schedule & (1 << d.bit)) !== 0).map((d) => d.label);
  return days.length === 0 ? 'No days scheduled' : days.join(', ');
}

function DayToggleRow({ value, onChange }) {
  return (
    <div className="day-toggle-row">
      {DAYS.map((d) => (
        <button
          key={d.bit}
          type="button"
          className={`day-toggle-btn${(value & (1 << d.bit)) !== 0 ? ' selected' : ''}`}
          onClick={() => onChange(value ^ (1 << d.bit))}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

// Habit CRUD - the createHabit/deleteHabit methods on useHabits() already
// existed and worked, they just had no UI calling them anywhere in the app.
export default function HabitManager() {
  const { habits, loading, createHabit, updateHabit, deleteHabit } = useHabits();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [schedule, setSchedule] = useState(EVERY_DAY);
  const [saving, setSaving] = useState(false);

  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(EVERY_DAY);

  const [showArchived, setShowArchived] = useState(false);
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createHabit(trimmed, color, `fa-solid ${icon}`, schedule);
      setName('');
      setSchedule(EVERY_DAY);
      showToast('New quest added to your daily log.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create habit.', true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, habitName) {
    if (!window.confirm(`Archive "${habitName}"? It'll stop appearing in your daily log, but past logged progress is kept and you can restore it later.`)) return;
    try {
      await deleteHabit(id);
      showToast('Habit archived.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to archive habit.', true);
    }
  }

  async function handleSaveSchedule(id) {
    try {
      await updateHabit(id, { schedule: editingSchedule });
      setEditingHabitId(null);
      showToast('Schedule updated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update schedule.', true);
    }
  }

  async function toggleShowArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) {
      setArchivedLoading(true);
      try {
        setArchivedHabits(await apiClient.listArchivedHabits());
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to load archived habits.', true);
      } finally {
        setArchivedLoading(false);
      }
    }
  }

  async function handleRestore(id, habitName) {
    try {
      await apiClient.restoreHabit(id);
      setArchivedHabits((prev) => prev.filter((h) => h.id !== id));
      showToast(`"${habitName}" restored.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to restore habit.', true);
    }
  }

  return (
    <div className="card glass-card" style={{ padding: '1.5rem' }}>
      <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2><i className="fa-solid fa-list-check" style={{ marginRight: 8 }} />Manage Habits</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={toggleShowArchived}>
          <i className="fa-solid fa-box-archive" /> {showArchived ? 'Hide' : 'Show'} Archived
        </button>
      </div>

      {loading && <p className="text-muted">Loading habits...</p>}

      {!loading && habits.length === 0 && (
        <EmptyState icon="fa-list-check" title="No Habits Yet" message="Add your first daily quest below." />
      )}

      {!loading && habits.length > 0 && (
        <div className="habits-manager-list">
          {habits.map((h) => (
            <div key={h.id} className="habit-manager-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="habit-manager-item-left">
                  <i className={h.icon} style={{ color: h.color }} />
                  <span>{h.name}</span>
                  {scheduleSummary(h.schedule) && (
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>({scheduleSummary(h.schedule)})</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className="btn-icon"
                    title="Edit schedule"
                    onClick={() => {
                      if (editingHabitId === h.id) { setEditingHabitId(null); return; }
                      setEditingHabitId(h.id);
                      setEditingSchedule(h.schedule);
                    }}
                  >
                    <i className="fa-solid fa-calendar-days" />
                  </button>
                  <button type="button" className="btn-delete-habit" title="Archive habit" onClick={() => handleDelete(h.id, h.name)}>
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </div>
              {editingHabitId === h.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                  <DayToggleRow value={editingSchedule} onChange={setEditingSchedule} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSaveSchedule(h.id)}>Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingHabitId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showArchived && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: 10 }}>Archived Habits</h3>
          {archivedLoading && <p className="text-muted">Loading...</p>}
          {!archivedLoading && archivedHabits.length === 0 && (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>No archived habits.</p>
          )}
          {!archivedLoading && archivedHabits.length > 0 && (
            <div className="habits-manager-list">
              {archivedHabits.map((h) => (
                <div key={h.id} className="habit-manager-item">
                  <div className="habit-manager-item-left">
                    <i className={h.icon} style={{ color: h.color, opacity: 0.6 }} />
                    <span style={{ opacity: 0.6 }}>{h.name}</span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRestore(h.id, h.name)}>
                    <i className="fa-solid fa-rotate-left" /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleCreate} style={{ marginTop: '1.25rem' }}>
        <div className="form-group">
          <label htmlFor="new-habit-name">Habit Name</label>
          <input
            type="text"
            id="new-habit-name"
            placeholder="e.g. Meditation"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Icon</label>
          <div className="icon-picker-grid">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`icon-picker-option${icon === opt ? ' selected' : ''}`}
                style={icon === opt ? { borderColor: color, color } : undefined}
                onClick={() => setIcon(opt)}
                title={opt}
              >
                <i className={`fa-solid ${opt}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Color</label>
          <div className="color-picker-row">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-picker-swatch${color === c ? ' selected' : ''}`}
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 2px var(--bg-main), 0 0 0 4px ${c}` : undefined,
                }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Schedule (defaults to every day)</label>
          <DayToggleRow value={schedule} onChange={setSchedule} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
          <i className="fa-solid fa-plus" /> {saving ? 'Adding...' : 'Add Habit'}
        </button>
      </form>
    </div>
  );
}
