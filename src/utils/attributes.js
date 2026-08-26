// RPG "Attribute" scores for the Profile character sheet. Only attributes
// backed by real data are computed here - DIS (discipline), LEA (learning),
// STR (strength), END (endurance). FIN/SOC are intentionally omitted: there
// is no money-tracking or social-interaction data anywhere in the backend to
// derive them from (see server/internal/api - no schema for either).
//
// All windowed scores use a trailing 90-day window rather than a lifetime
// total: this keeps the numbers reflecting "current form" instead of an
// ever-inflating counter, and bounds how much data needs to be fetched
// regardless of account age.
import { apiClient } from '../api/apiClient.js';

const WINDOW_DAYS = 90;

// Tunable thresholds for a maxed-out (100) bar. These are reasonable
// starting points, not derived from product research - expect to retune
// after seeing real usage.
const DISCIPLINE_STREAK_DAYS_FOR_MAX = 30;
const LEARNING_HOURS_FOR_MAX = 60; // ~40 min/day sustained over 90 days
const STRENGTH_TONNAGE_KG_FOR_MAX = 15000; // sum(reps * weight_kg) over 90 days
const ENDURANCE_SETS_FOR_MAX = 250; // total logged sets over 90 days

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgoStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function disciplineScore(currentStreak) {
  return clampScore(((currentStreak || 0) / DISCIPLINE_STREAK_DAYS_FOR_MAX) * 100);
}

export function learningScore(hours90d) {
  return clampScore(((hours90d || 0) / LEARNING_HOURS_FOR_MAX) * 100);
}

export function strengthScore(tonnageKg90d) {
  return clampScore(((tonnageKg90d || 0) / STRENGTH_TONNAGE_KG_FOR_MAX) * 100);
}

export function enduranceScore(setCount90d) {
  return clampScore(((setCount90d || 0) / ENDURANCE_SETS_FOR_MAX) * 100);
}

// Sums learning_hours across the trailing 90-day daily-progress range.
export async function fetchLearningHours90d() {
  const data = await apiClient.listProgress({ from: daysAgoStr(WINDOW_DAYS - 1), to: todayStr() });
  const entries = data?.entries ?? [];
  return entries.reduce((sum, e) => sum + (Number(e.learning_hours) || 0), 0);
}

// listWorkoutSessions has no server-side date filter and caps `limit` at 200,
// so we page through sessions (already sorted newest-first by the backend)
// and stop as soon as we cross the 90-day cutoff - everything after is even
// older. For accounts with >200 sessions inside the window this can still
// undercount if a single page straddles the cutoff awkwardly; acceptable for
// a v1 attribute estimate, called out as a known limitation.
export async function fetchWorkoutVolume90d() {
  const cutoff = daysAgoStr(WINDOW_DAYS - 1);
  let tonnageKg = 0;
  let setCount = 0;
  let offset = 0;
  const pageSize = 200;

  for (let page = 0; page < 5; page += 1) {
    const data = await apiClient.listWorkoutSessions({ limit: pageSize, offset });
    const sessions = data?.entries ?? [];
    if (sessions.length === 0) break;

    let hitCutoff = false;
    for (const session of sessions) {
      if (session.session_date < cutoff) {
        hitCutoff = true;
        break;
      }
      for (const set of session.sets || []) {
        setCount += 1;
        if (set.weight_kg != null) tonnageKg += Number(set.weight_kg) * Number(set.reps || 0);
      }
    }
    if (hitCutoff || sessions.length < pageSize) break;
    offset += pageSize;
  }

  return { tonnageKg, setCount };
}

// Orchestrates all four fetches/scores for the Profile screen.
export async function computeAttributes(user) {
  const [learningHours90d, volume90d] = await Promise.all([
    fetchLearningHours90d(),
    fetchWorkoutVolume90d(),
  ]);

  return [
    {
      code: 'DIS', label: 'Discipline', icon: 'fa-shield-halved',
      color: 'var(--attr-dis)', glow: 'var(--attr-dis-glow)',
      value: disciplineScore(user?.current_streak),
    },
    {
      code: 'LEA', label: 'Learning', icon: 'fa-book-open',
      color: 'var(--attr-lea)', glow: 'var(--attr-lea-glow)',
      value: learningScore(learningHours90d),
    },
    {
      code: 'STR', label: 'Strength', icon: 'fa-dumbbell',
      color: 'var(--attr-str)', glow: 'var(--attr-str-glow)',
      value: strengthScore(volume90d.tonnageKg),
    },
    {
      code: 'END', label: 'Endurance', icon: 'fa-heart-pulse',
      color: 'var(--attr-end)', glow: 'var(--attr-end-glow)',
      value: enduranceScore(volume90d.setCount),
    },
  ];
}
