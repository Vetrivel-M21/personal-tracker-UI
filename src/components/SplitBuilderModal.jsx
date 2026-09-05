import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { showToast } from './Toast.jsx';
import Modal from './Modal.jsx';

// Full days/exercises editor for one workout split. Reorder uses plain
// up/down buttons (no drag-and-drop library, matching this app's style) --
// each click calls the reorder endpoint with the full new id order.
export default function SplitBuilderModal({ splitId, open, onClose, onChanged }) {
  const [split, setSplit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [expandedDayId, setExpandedDayId] = useState(null);
  const [newExercise, setNewExercise] = useState({ name: '', targetSets: 3, targetReps: '8-12', notes: '' });
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [editingExercise, setEditingExercise] = useState({ name: '', targetSets: 3, targetReps: '', notes: '' });

  const reload = useCallback(async () => {
    if (!splitId) return;
    setLoading(true);
    try {
      const data = await apiClient.getWorkoutSplit(splitId);
      setSplit(data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load split.', true);
    } finally {
      setLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  async function notifyChanged() {
    await reload();
    onChanged?.();
  }

  async function handleAddDay(e) {
    e.preventDefault();
    const name = newDayName.trim();
    if (!name) return;
    try {
      await apiClient.addSplitDay(splitId, { name });
      setNewDayName('');
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to add day.', true);
    }
  }

  async function handleRenameDay(dayId, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await apiClient.updateSplitDay(splitId, dayId, { name: trimmed });
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to rename day.', true);
    }
  }

  async function handleDeleteDay(dayId) {
    if (!window.confirm('Delete this day and all its exercises?')) return;
    try {
      await apiClient.deleteSplitDay(splitId, dayId);
      if (expandedDayId === dayId) setExpandedDayId(null);
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete day.', true);
    }
  }

  async function handleMoveDay(index, direction) {
    if (!split) return;
    const days = [...split.days];
    const target = index + direction;
    if (target < 0 || target >= days.length) return;
    [days[index], days[target]] = [days[target], days[index]];
    try {
      await apiClient.reorderSplitDays(splitId, days.map((d) => d.id));
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to reorder days.', true);
    }
  }

  async function handleAddExercise(e, dayId) {
    e.preventDefault();
    const name = newExercise.name.trim();
    const reps = newExercise.targetReps.trim();
    if (!name || !reps || newExercise.targetSets < 1) {
      showToast('Exercise name, sets and reps are required.', true);
      return;
    }
    try {
      await apiClient.addSplitExercise(splitId, dayId, {
        name, targetSets: Number(newExercise.targetSets), targetReps: reps, notes: newExercise.notes.trim(),
      });
      setNewExercise({ name: '', targetSets: 3, targetReps: '8-12', notes: '' });
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to add exercise.', true);
    }
  }

  async function handleDeleteExercise(dayId, exerciseId) {
    try {
      await apiClient.deleteSplitExercise(splitId, dayId, exerciseId);
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete exercise.', true);
    }
  }

  function startEditExercise(ex) {
    setEditingExerciseId(ex.id);
    setEditingExercise({ name: ex.name, targetSets: ex.target_sets, targetReps: ex.target_reps, notes: ex.notes || '' });
  }

  async function handleSaveExercise(dayId, exerciseId) {
    const name = editingExercise.name.trim();
    const reps = editingExercise.targetReps.trim();
    if (!name || !reps || editingExercise.targetSets < 1) {
      showToast('Exercise name, sets and reps are required.', true);
      return;
    }
    try {
      await apiClient.updateSplitExercise(splitId, dayId, exerciseId, {
        name, targetSets: Number(editingExercise.targetSets), targetReps: reps, notes: editingExercise.notes.trim(),
      });
      setEditingExerciseId(null);
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update exercise.', true);
    }
  }

  async function handleRenameSplit() {
    const name = window.prompt('Rename split', split.name);
    if (!name || !name.trim()) return;
    try {
      await apiClient.updateWorkoutSplit(splitId, { name: name.trim() });
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to rename split.', true);
    }
  }

  async function handleMoveExercise(day, index, direction) {
    const exercises = [...day.exercises];
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
    try {
      await apiClient.reorderSplitExercises(splitId, day.id, exercises.map((ex) => ex.id));
      await notifyChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to reorder exercises.', true);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={split ? `Edit "${split.name}"` : 'Edit Split'} maxWidth={640}>
      {loading && <p className="text-muted">Loading split details...</p>}
      {!loading && split && (
        <>
          <button
            type="button" className="btn btn-secondary btn-sm"
            style={{ marginBottom: '1.25rem' }}
            onClick={handleRenameSplit}
          >
            <i className="fa-solid fa-pen" /> Rename Split
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
            {split.days.length === 0 && <p className="text-muted">No days yet -- add one below.</p>}
            {split.days.map((day, index) => (
              <div key={day.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div className="habit-manager-item" style={{ border: 'none', borderRadius: 0 }}>
                  <div className="habit-manager-item-left" style={{ flex: 1 }}>
                    <button type="button" className="btn-icon" onClick={() => handleMoveDay(index, -1)} disabled={index === 0} title="Move up">
                      <i className="fa-solid fa-chevron-up" />
                    </button>
                    <button type="button" className="btn-icon" onClick={() => handleMoveDay(index, 1)} disabled={index === split.days.length - 1} title="Move down">
                      <i className="fa-solid fa-chevron-down" />
                    </button>
                    <span
                      className="clickable-row"
                      role="button"
                      tabIndex={0}
                      style={{ flex: 1 }}
                      onClick={() => setExpandedDayId((cur) => (cur === day.id ? null : day.id))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedDayId((cur) => (cur === day.id ? null : day.id));
                        }
                      }}
                    >
                      {day.name} <span className="text-muted">({day.exercises.length})</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Rename"
                      onClick={() => {
                        const name = window.prompt('Rename day', day.name);
                        if (name) handleRenameDay(day.id, name);
                      }}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button type="button" className="btn-icon text-rose" title="Delete day" onClick={() => handleDeleteDay(day.id)}>
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </div>

                {expandedDayId === day.id && (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)' }}>
                    {day.exercises.map((ex, exIndex) => (
                      editingExerciseId === ex.id ? (
                        <form
                          key={ex.id}
                          onSubmit={(e) => { e.preventDefault(); handleSaveExercise(day.id, ex.id); }}
                          style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}
                        >
                          <input
                            type="text" placeholder="Exercise name" style={{ flex: 2, minWidth: 140 }}
                            value={editingExercise.name} onChange={(e) => setEditingExercise((s) => ({ ...s, name: e.target.value }))}
                          />
                          <input
                            type="number" min="1" placeholder="Sets" style={{ width: 70 }}
                            value={editingExercise.targetSets} onChange={(e) => setEditingExercise((s) => ({ ...s, targetSets: e.target.value }))}
                          />
                          <input
                            type="text" placeholder="Reps (e.g. 8-12)" style={{ width: 110 }}
                            value={editingExercise.targetReps} onChange={(e) => setEditingExercise((s) => ({ ...s, targetReps: e.target.value }))}
                          />
                          <button type="submit" className="btn btn-primary btn-sm">Save</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingExerciseId(null)}>Cancel</button>
                        </form>
                      ) : (
                        <div key={ex.id} className="habit-manager-item" style={{ marginBottom: 6 }}>
                          <div className="habit-manager-item-left">
                            <button type="button" className="btn-icon" onClick={() => handleMoveExercise(day, exIndex, -1)} disabled={exIndex === 0} title="Move up">
                              <i className="fa-solid fa-chevron-up" />
                            </button>
                            <button type="button" className="btn-icon" onClick={() => handleMoveExercise(day, exIndex, 1)} disabled={exIndex === day.exercises.length - 1} title="Move down">
                              <i className="fa-solid fa-chevron-down" />
                            </button>
                            <span>{ex.name} <span className="text-muted">{ex.target_sets}x{ex.target_reps}</span></span>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className="btn-icon" title="Edit exercise" onClick={() => startEditExercise(ex)}>
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button type="button" className="btn-icon text-rose" title="Delete exercise" onClick={() => handleDeleteExercise(day.id, ex.id)}>
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        </div>
                      )
                    ))}

                    <form onSubmit={(e) => handleAddExercise(e, day.id)} style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <input
                        type="text" placeholder="Exercise name" style={{ flex: 2, minWidth: 140 }}
                        value={newExercise.name} onChange={(e) => setNewExercise((s) => ({ ...s, name: e.target.value }))}
                      />
                      <input
                        type="number" min="1" placeholder="Sets" style={{ width: 70 }}
                        value={newExercise.targetSets} onChange={(e) => setNewExercise((s) => ({ ...s, targetSets: e.target.value }))}
                      />
                      <input
                        type="text" placeholder="Reps (e.g. 8-12)" style={{ width: 110 }}
                        value={newExercise.targetReps} onChange={(e) => setNewExercise((s) => ({ ...s, targetReps: e.target.value }))}
                      />
                      <button type="submit" className="btn btn-secondary btn-sm">
                        <i className="fa-solid fa-plus" /> Add
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddDay} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text" placeholder="New day name (e.g. Day 4 - Arms)" style={{ flex: 1 }}
              value={newDayName} onChange={(e) => setNewDayName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus" /> Add Day
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
