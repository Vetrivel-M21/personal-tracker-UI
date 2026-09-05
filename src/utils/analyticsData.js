// Pure aggregation helpers + one paginated fetch for the Analytics screen.
import { apiClient } from '../api/apiClient.js';
import { dueHabitsOn } from './schedule.js';

function bucketKey(dateStr, granularity) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (granularity === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function bucketLabel(key, granularity) {
  if (granularity === 'month') {
    return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sortedBuckets(map) {
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
}

// Real aggregation: habit-completion % and learning hours per bucket.
// completionPct divides by each day's actual due-habit count (respecting
// per-habit schedules), not a flat total, so a habit scheduled for only a
// few days a week doesn't drag the average down on its off-days.
export function buildCompletionSeries(rangeEntries, habits, granularity = 'week') {
  const buckets = new Map();
  for (const entry of rangeEntries) {
    const key = bucketKey(entry.date, granularity);
    if (!buckets.has(key)) buckets.set(key, { completedSum: 0, dayCount: 0, learningHours: 0 });
    const b = buckets.get(key);
    const completed = Array.isArray(entry.completed_habit_ids) ? entry.completed_habit_ids.length : 0;
    const dueThatDay = dueHabitsOn(habits, new Date(`${entry.date}T00:00:00`)).length;
    if (dueThatDay > 0) {
      b.completedSum += completed / dueThatDay;
      b.dayCount += 1;
    }
    b.learningHours += Number(entry.learning_hours) || 0;
  }
  return sortedBuckets(buckets).map(([key, b]) => ({
    label: bucketLabel(key, granularity),
    completionPct: b.dayCount > 0 ? Math.round((b.completedSum / b.dayCount) * 100) : 0,
    learningHours: Math.round(b.learningHours * 10) / 10,
  }));
}

// Approximation, not a real ledger: XP is not stored as a time series on the
// backend, only reconstructable from the same +10/habit +20/learning-hour
// grant the server applies per day (server/internal/api/progress.go). This
// silently omits any future XP source that isn't habit/learning-derived -
// label this series "(estimated)" wherever it's shown.
export function buildXpSeries(rangeEntries, granularity = 'week') {
  const sorted = [...rangeEntries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const buckets = new Map();
  let cumulative = 0;
  for (const entry of sorted) {
    const completed = Array.isArray(entry.completed_habit_ids) ? entry.completed_habit_ids.length : 0;
    cumulative += completed * 10 + (Number(entry.learning_hours) || 0) * 20;
    buckets.set(bucketKey(entry.date, granularity), Math.round(cumulative));
  }
  return sortedBuckets(buckets).map(([key, xp]) => ({ label: bucketLabel(key, granularity), xp }));
}

// Real aggregation: tonnage (reps * weight_kg) and set count per bucket,
// from actual logged workout sets - no approximation needed here.
export function buildVolumeSeries(sessions, granularity = 'week') {
  const buckets = new Map();
  for (const session of sessions) {
    const key = bucketKey(session.session_date, granularity);
    if (!buckets.has(key)) buckets.set(key, { tonnageKg: 0, setCount: 0 });
    const b = buckets.get(key);
    for (const set of session.sets || []) {
      b.setCount += 1;
      if (set.weight_kg != null) b.tonnageKg += Number(set.weight_kg) * Number(set.reps || 0);
    }
  }
  return sortedBuckets(buckets).map(([key, b]) => ({
    label: bucketLabel(key, granularity),
    tonnageKg: Math.round(b.tonnageKg),
    setCount: b.setCount,
  }));
}

// listWorkoutSessions has no server-side date filter and caps `limit` at
// 200, but returns sessions newest-first, so we page through and stop as
// soon as we cross the cutoff (see the same pattern in utils/attributes.js).
export async function fetchWorkoutSessionsSince(cutoffDateStr) {
  const collected = [];
  let offset = 0;
  const pageSize = 200;

  for (let page = 0; page < 5; page += 1) {
    const data = await apiClient.listWorkoutSessions({ limit: pageSize, offset });
    const sessions = data?.entries ?? [];
    if (sessions.length === 0) break;

    let hitCutoff = false;
    for (const session of sessions) {
      if (session.session_date < cutoffDateStr) {
        hitCutoff = true;
        break;
      }
      collected.push(session);
    }
    if (hitCutoff || sessions.length < pageSize) break;
    offset += pageSize;
  }

  return collected;
}
