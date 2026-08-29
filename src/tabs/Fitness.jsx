import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { showToast } from '../components/Toast.jsx';
import SplitBuilderModal from '../components/SplitBuilderModal.jsx';
import CalisthenicsSkillTree from '../components/CalisthenicsSkillTree.jsx';
import EmptyState from '../components/system/EmptyState.jsx';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let setRowKey = 0;
function newSetRow(exerciseName = '') {
  setRowKey += 1;
  return { key: setRowKey, exerciseName, reps: '', weightKg: '' };
}

export default function Fitness() {
  const [view, setView] = useState('splits');

  const [mySplits, setMySplits] = useState([]);
  const [splitsLoading, setSplitsLoading] = useState(true);
  const [activeSplit, setActiveSplit] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);
  const [templateDetails, setTemplateDetails] = useState({});

  const [newSplitName, setNewSplitName] = useState('');
  const [builderSplitId, setBuilderSplitId] = useState(null);

  const [sessionDate, setSessionDate] = useState(todayStr());
  const [selectedDayId, setSelectedDayId] = useState('');
  const [adHocLabel, setAdHocLabel] = useState('');
  const [setRows, setSetRows] = useState([newSetRow()]);
  const [logging, setLogging] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [exerciseNames, setExerciseNames] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [exerciseHistory, setExerciseHistory] = useState(null);

  const loadMySplits = useCallback(async () => {
    setSplitsLoading(true);
    try {
      setMySplits(await apiClient.listWorkoutSplits());
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load splits.', true);
    } finally {
      setSplitsLoading(false);
    }
  }, []);

  const loadActiveSplit = useCallback(async () => {
    try {
      setActiveSplit(await apiClient.getActiveWorkoutSplit());
    } catch {
      setActiveSplit(null);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      setTemplates(await apiClient.listWorkoutTemplates());
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load templates.', true);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiClient.listWorkoutSessions({ limit: 10 });
      setSessions(data.entries || []);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load session history.', true);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadExerciseNames = useCallback(async () => {
    try {
      setExerciseNames(await apiClient.listExerciseNames());
    } catch {
      setExerciseNames([]);
    }
  }, []);

  useEffect(() => { loadMySplits(); loadActiveSplit(); loadTemplates(); loadSessions(); loadExerciseNames(); }, [
    loadMySplits, loadActiveSplit, loadTemplates, loadSessions, loadExerciseNames,
  ]);

  async function toggleTemplatePreview(id) {
    if (expandedTemplateId === id) {
      setExpandedTemplateId(null);
      return;
    }
    setExpandedTemplateId(id);
    if (!templateDetails[id]) {
      try {
        const detail = await apiClient.getWorkoutTemplate(id);
        setTemplateDetails((d) => ({ ...d, [id]: detail }));
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'Failed to load template.', true);
      }
    }
  }

  async function handleUseTemplate(id) {
    try {
      await apiClient.cloneWorkoutTemplate(id);
      showToast('Split added to your splits.');
      await loadMySplits();
      setView('splits');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to use template.', true);
    }
  }

  async function handleCreateCustomSplit(e) {
    e.preventDefault();
    const name = newSplitName.trim();
    if (!name) return;
    try {
      const created = await apiClient.createWorkoutSplit(name);
      setNewSplitName('');
      await loadMySplits();
      setBuilderSplitId(created.id);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to create split.', true);
    }
  }

  async function handleSetActive(id) {
    try {
      await apiClient.activateWorkoutSplit(id);
      await Promise.all([loadMySplits(), loadActiveSplit()]);
      showToast('Active split updated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to activate split.', true);
    }
  }

  async function handleDeleteSplit(id) {
    if (!window.confirm('Delete this split? Logged session history will be kept.')) return;
    try {
      await apiClient.deleteWorkoutSplit(id);
      await Promise.all([loadMySplits(), loadActiveSplit()]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete split.', true);
    }
  }

  function handlePickDay(dayId) {
    setSelectedDayId(dayId);
    if (!dayId) {
      setSetRows([newSetRow()]);
      return;
    }
    const day = activeSplit?.days?.find((d) => d.id === dayId);
    if (!day) return;
    const rows = [];
    day.exercises.forEach((ex) => {
      for (let i = 0; i < ex.target_sets; i++) rows.push(newSetRow(ex.name));
    });
    setSetRows(rows.length > 0 ? rows : [newSetRow()]);
  }

  function updateSetRow(key, patch) {
    setSetRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleLogSession(e) {
    e.preventDefault();
    const usingDay = Boolean(selectedDayId);
    if (!usingDay && !adHocLabel.trim()) {
      showToast('Pick a split day or enter a label for an ad-hoc session.', true);
      return;
    }
    const sets = [];
    let setNumber = 0;
    for (const row of setRows) {
      const exerciseName = row.exerciseName.trim();
      if (!exerciseName) continue;
      setNumber += 1;
      sets.push({
        exerciseName,
        setNumber,
        reps: Number(row.reps) || 0,
        weightKg: row.weightKg === '' ? null : Number(row.weightKg),
      });
    }
    if (sets.length === 0) {
      showToast('Log at least one set.', true);
      return;
    }

    setLogging(true);
    try {
      await apiClient.logWorkoutSession({
        splitDayId: usingDay ? selectedDayId : null,
        splitId: usingDay ? activeSplit?.id : null,
        label: usingDay ? '' : adHocLabel.trim(),
        sessionDate,
        notes: '',
        sets,
      });
      showToast('Session logged!');
      setSetRows([newSetRow()]);
      setAdHocLabel('');
      await Promise.all([loadSessions(), loadExerciseNames()]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to log session.', true);
    } finally {
      setLogging(false);
    }
  }

  async function handleFilterExercise(name) {
    setHistoryFilter(name);
    if (!name) {
      setExerciseHistory(null);
      return;
    }
    try {
      setExerciseHistory(await apiClient.getExerciseHistory(name));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load exercise history.', true);
    }
  }

  return (
    <>
      <div className="card glass-card" style={{ padding: 0 }}>
        <div className="card-header border-bottom" style={{ padding: '1.5rem' }}>
          <h2><i className="fa-solid fa-dumbbell" style={{ marginRight: 8 }} />Workout Split</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn btn-sm ${view === 'splits' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('splits')}>
              My Splits
            </button>
            <button type="button" className={`btn btn-sm ${view === 'templates' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('templates')}>
              Browse Templates
            </button>
            <button type="button" className={`btn btn-sm ${view === 'skills' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('skills')}>
              Skill Tree
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {view === 'splits' && (
            <>
              {splitsLoading && <p className="text-muted">Loading your training splits...</p>}
              {!splitsLoading && mySplits.length === 0 && (
                <p className="text-muted">No splits yet -- create a custom one below, or browse templates.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
                {mySplits.map((s) => (
                  <div key={s.id} className="habit-manager-item">
                    <div className="habit-manager-item-left">
                      <i className="fa-solid fa-clipboard-list" />
                      <span>{s.name}</span>
                      {s.is_active && <span className="asset-badge" style={{ marginLeft: 8 }}>Active</span>}
                      <span className="text-muted" style={{ marginLeft: 8 }}>{s.day_count} day{s.day_count === 1 ? '' : 's'} &middot; {s.source}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!s.is_active && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleSetActive(s.id)}>Set Active</button>
                      )}
                      <button type="button" className="btn-icon" title="Edit" onClick={() => setBuilderSplitId(s.id)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button type="button" className="btn-icon text-rose" title="Delete" onClick={() => handleDeleteSplit(s.id)}>
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCreateCustomSplit} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" placeholder="New custom split name" style={{ flex: 1 }}
                  value={newSplitName} onChange={(e) => setNewSplitName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="fa-solid fa-plus" /> Create
                </button>
              </form>
            </>
          )}

          {view === 'templates' && (
            <>
              {templatesLoading && <p className="text-muted">Loading training programs...</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {templates.map((t) => (
                  <div key={t.id} className="skill-node available" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <strong>{t.name}</strong>
                        <span className="text-muted" style={{ marginLeft: 8 }}>{t.days_per_week} days/week &middot; {t.level}</span>
                        <p className="stat-desc" style={{ marginTop: 4 }}>{t.description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleTemplatePreview(t.id)}>
                          {expandedTemplateId === t.id ? 'Hide' : 'Preview'}
                        </button>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => handleUseTemplate(t.id)}>
                          Use This Split
                        </button>
                      </div>
                    </div>
                    {expandedTemplateId === t.id && templateDetails[t.id] && (
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {templateDetails[t.id].days.map((day, i) => (
                          <div key={i}>
                            <span className="text-indigo" style={{ fontWeight: 600 }}>{day.name}</span>
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                              {day.exercises.map((ex) => `${ex.name} ${ex.target_sets}x${ex.target_reps}`).join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {view === 'skills' && <CalisthenicsSkillTree />}
        </div>
      </div>

      <div className="split-view" style={{ marginTop: '1rem' }}>
        <div className="pane-left">
          <div className="card glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
              <h2>Log a Session</h2>
            </div>
            <form onSubmit={handleLogSession}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fitness-session-date">Date</label>
                  <input type="date" id="fitness-session-date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="fitness-session-day">Day</label>
                  <select
                    id="fitness-session-day"
                    value={selectedDayId}
                    onChange={(e) => handlePickDay(e.target.value)}
                  >
                    <option value="">Ad-hoc (no split day)</option>
                    {activeSplit?.days?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {!selectedDayId && (
                <div className="form-group">
                  <label htmlFor="fitness-session-label">Label</label>
                  <input
                    type="text" id="fitness-session-label" placeholder="e.g. Extra cardio"
                    value={adHocLabel} onChange={(e) => setAdHocLabel(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1rem' }}>
                <div className="session-set-headers">
                  <span>Exercise</span>
                  <span>Reps</span>
                  <span>Kg</span>
                  <span />
                </div>
                {setRows.map((row) => (
                  <div key={row.key} className="session-set-row">
                    <input
                      type="text" placeholder="e.g. Bench Press"
                      value={row.exerciseName} onChange={(e) => updateSetRow(row.key, { exerciseName: e.target.value })}
                    />
                    <input
                      type="number" placeholder="0" min="0"
                      value={row.reps} onChange={(e) => updateSetRow(row.key, { reps: e.target.value })}
                    />
                    <input
                      type="number" placeholder="0" min="0" step="0.5"
                      value={row.weightKg} onChange={(e) => updateSetRow(row.key, { weightKg: e.target.value })}
                    />
                    <button
                      type="button" className="btn-icon text-rose"
                      onClick={() => setSetRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== row.key) : rows))}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setSetRows((rows) => [...rows, newSetRow()])}>
                  <i className="fa-solid fa-plus" /> Add Set
                </button>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={logging}>
                <i className="fa-solid fa-floppy-disk" /> {logging ? 'Logging...' : 'Log Session'}
              </button>
            </form>
          </div>
        </div>

        <div className="pane-right">
          <div className="card glass-card" style={{ padding: 0 }}>
            <div className="card-header border-bottom">
              <h2>Recent Sessions</h2>
            </div>
            <div className="task-list-wrapper">
              {sessionsLoading && <p className="text-muted" style={{ padding: '1.5rem' }}>Loading recent sessions...</p>}
              {!sessionsLoading && sessions.length === 0 && (
                <EmptyState icon="fa-dumbbell" title="No Sessions Logged" message="Log your first training session below." />
              )}
              {sessions.map((s) => (
                <div key={s.id} className="ledger-item-card">
                  <div
                    className="ledger-card-header clickable-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedSessionId((cur) => (cur === s.id ? null : s.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedSessionId((cur) => (cur === s.id ? null : s.id));
                      }
                    }}
                  >
                    <div className="ledger-card-date">
                      <i className="fa-regular fa-calendar" style={{ color: 'var(--primary)' }} />{' '}
                      {new Date(`${s.session_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &middot; {s.day_label}
                    </div>
                    <span className="text-muted">{s.sets.length} set{s.sets.length === 1 ? '' : 's'}</span>
                  </div>
                  {expandedSessionId === s.id && (
                    <div className="ledger-card-body">
                      {s.sets.map((set) => (
                        <div key={set.id} className="ledger-metrics-row">
                          <span className="ledger-stat-bubble text-indigo">{set.exercise_name}</span>
                          <span className="text-muted">{set.reps} reps{set.weight_kg != null ? ` @ ${set.weight_kg}kg` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
              <h2>Exercise History</h2>
            </div>
            <div className="form-group">
              <select value={historyFilter} onChange={(e) => handleFilterExercise(e.target.value)}>
                <option value="">Select an exercise...</option>
                {exerciseNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {exerciseHistory && (
              <>
                {exerciseHistory.best && (
                  <p className="stat-desc" style={{ marginBottom: '0.75rem' }}>
                    Best: {exerciseHistory.best.weight_kg != null ? `${exerciseHistory.best.weight_kg}kg x ` : ''}
                    {exerciseHistory.best.reps} reps ({exerciseHistory.best.date})
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {exerciseHistory.sets.map((set, i) => (
                    <div key={i} className="ledger-metrics-row">
                      <span className="text-muted">{set.date}</span>
                      <span>{set.weight_kg != null ? `${set.weight_kg}kg x ` : ''}{set.reps} reps</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SplitBuilderModal
        splitId={builderSplitId}
        open={builderSplitId !== null}
        onClose={() => setBuilderSplitId(null)}
        onChanged={() => { loadMySplits(); loadActiveSplit(); }}
      />
    </>
  );
}
