import { useEffect, useRef, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { showToast } from './Toast.jsx';
import { playTimerAlarm } from '../utils/sound.js';

const DURATIONS = [5, 10, 15, 20, 30];
const SESSION_TYPES = [
  { value: 'Focus', icon: 'fa-bolt' },
  { value: 'Meditation', icon: 'fa-spa' },
];

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatRelativeDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FocusTimer() {
  const [sessionType, setSessionType] = useState('Focus');
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [totalThisWeek, setTotalThisWeek] = useState(0);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const startedAtRef = useRef(null);
  const intervalRef = useRef(null);

  const running = secondsLeft !== null;

  useEffect(() => {
    let cancelled = false;
    apiClient.listFocusSessions(5, 0)
      .then((data) => {
        if (cancelled) return;
        setRecent(data.entries || []);
        setTotalThisWeek(data.total_minutes_this_week || 0);
      })
      .catch(() => {
        // History is a nice-to-have on top of the timer - don't block on failure.
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    clearInterval(intervalRef.current);
    completeSession(selectedMinutes);
    setSecondsLeft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  async function logSession(durationMinutes) {
    try {
      const result = await apiClient.logFocusSession(sessionType, durationMinutes);
      setTotalThisWeek(result.total_minutes_this_week || 0);
      setRecent((prev) => [result.session, ...prev].slice(0, 5));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save session.', true);
    }
  }

  function completeSession(durationMinutes) {
    playTimerAlarm();
    showToast(`${sessionType} session complete! 🎉`);
    logSession(durationMinutes);
    startedAtRef.current = null;
  }

  function handleStart() {
    startedAtRef.current = Date.now();
    setSecondsLeft(selectedMinutes * 60);
  }

  function handleStop() {
    clearInterval(intervalRef.current);
    const elapsedMinutes = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 60000)
      : 0;
    setSecondsLeft(null);
    startedAtRef.current = null;
    if (elapsedMinutes >= 1) {
      logSession(elapsedMinutes);
    }
  }

  return (
    <div className="card glass-card" style={{ padding: '1.5rem' }}>
      <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
        <h2><i className="fa-solid fa-stopwatch" style={{ color: 'var(--primary)', marginRight: 8 }} />Focus & Meditation</h2>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>{totalThisWeek} min this week</span>
      </div>

      {!running ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
            {SESSION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`btn btn-sm ${sessionType === t.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSessionType(t.value)}
              >
                <i className={`fa-solid ${t.icon}`} /> {t.value}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {DURATIONS.map((min) => (
              <button
                key={min}
                type="button"
                className={`btn btn-sm ${selectedMinutes === min ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedMinutes(min)}
              >
                {min} min
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleStart}>
            <i className="fa-solid fa-play" /> Start {sessionType} Session
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1.25rem' }}>
            {formatClock(secondsLeft)}
          </div>
          <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleStop}>
            <i className="fa-solid fa-stop" /> Stop
          </button>
        </div>
      )}

      {!loading && recent.length > 0 && (
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Recent Sessions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recent.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>
                  <i className={`fa-solid ${s.session_type === 'Meditation' ? 'fa-spa' : 'fa-bolt'}`} style={{ marginRight: 8, color: 'var(--primary)' }} />
                  {s.session_type}
                </span>
                <span className="text-muted">{s.duration_minutes} min &middot; {formatRelativeDate(s.completed_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
