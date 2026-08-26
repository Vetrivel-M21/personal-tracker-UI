import { useState } from 'react';
import { useHabits } from '../hooks/useHabits.js';
import { showToast } from './Toast.jsx';
import { ApiError } from '../api/apiClient.js';
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

// Habit CRUD - the createHabit/deleteHabit methods on useHabits() already
// existed and worked, they just had no UI calling them anywhere in the app.
export default function HabitManager() {
  const { habits, loading, createHabit, deleteHabit } = useHabits();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createHabit(trimmed, color, `fa-solid ${icon}`);
      setName('');
      showToast('New quest added to your daily log.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create habit.', true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, habitName) {
    if (!window.confirm(`Delete "${habitName}"? Past logged progress for it is kept.`)) return;
    try {
      await deleteHabit(id);
      showToast('Habit deleted.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete habit.', true);
    }
  }

  return (
    <div className="card glass-card" style={{ padding: '1.5rem' }}>
      <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
        <h2><i className="fa-solid fa-list-check" style={{ marginRight: 8 }} />Manage Habits</h2>
      </div>

      {loading && <p className="text-muted">Loading habits...</p>}

      {!loading && habits.length === 0 && (
        <EmptyState icon="fa-list-check" title="No Habits Yet" message="Add your first daily quest below." />
      )}

      {!loading && habits.length > 0 && (
        <div className="habits-manager-list">
          {habits.map((h) => (
            <div key={h.id} className="habit-manager-item">
              <div className="habit-manager-item-left">
                <i className={h.icon} style={{ color: h.color }} />
                <span>{h.name}</span>
              </div>
              <button type="button" className="btn-delete-habit" title="Delete habit" onClick={() => handleDelete(h.id, h.name)}>
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          ))}
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

        <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
          <i className="fa-solid fa-plus" /> {saving ? 'Adding...' : 'Add Habit'}
        </button>
      </form>
    </div>
  );
}
