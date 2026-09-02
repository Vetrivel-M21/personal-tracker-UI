import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { apiClient, ApiError } from '../api/apiClient.js';
import { useHabits } from '../hooks/useHabits.js';
import { showToast } from '../components/Toast.jsx';
import ActivityHeatmap from '../components/system/ActivityHeatmap.jsx';
import { Skeleton } from '../components/system/Skeleton.jsx';
import { ChartTooltip, axisProps, gridProps, CHART_COLORS } from '../components/system/ChartTheme.jsx';
import {
  buildCompletionSeries, buildXpSeries, buildVolumeSeries, fetchWorkoutSessionsSince,
} from '../utils/analyticsData.js';

const RANGE_DAYS = 180;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgoStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "System Statistics" screen - real trend charts (habit completion, learning
// hours, workout volume) plus one estimated series (XP growth, clearly
// labeled) reconstructed from daily grants since XP has no stored history.
export default function Analytics() {
  const { habits } = useHabits();
  const [granularity, setGranularity] = useState('week');
  const [rangeEntries, setRangeEntries] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const from = daysAgoStr(RANGE_DAYS - 1);
      const to = todayStr();
      try {
        const [progressData, sessionRows] = await Promise.all([
          apiClient.listProgress({ from, to }),
          fetchWorkoutSessionsSince(from),
        ]);
        if (cancelled) return;
        setRangeEntries(progressData?.entries ?? []);
        setSessions(sessionRows);
      } catch (err) {
        if (!cancelled) showToast(err instanceof ApiError ? err.message : 'Failed to load statistics.', true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const completionSeries = useMemo(
    () => buildCompletionSeries(rangeEntries, habits.length, granularity),
    [rangeEntries, habits.length, granularity],
  );
  const xpSeries = useMemo(() => buildXpSeries(rangeEntries, granularity), [rangeEntries, granularity]);
  const volumeSeries = useMemo(() => buildVolumeSeries(sessions, granularity), [sessions, granularity]);

  return (
    <>
      <div className="card glass-card" style={{ padding: '1.5rem' }}>
        <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2><i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)', marginRight: 8 }} />System Statistics</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn btn-sm ${granularity === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGranularity('week')}>
              Weekly
            </button>
            <button type="button" className={`btn btn-sm ${granularity === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGranularity('month')}>
              Monthly
            </button>
          </div>
        </div>
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>Covering the last {RANGE_DAYS} days.</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <Skeleton height={260} />
          <Skeleton height={260} />
          <Skeleton height={260} />
        </div>
      )}

      {!loading && (
        <>
          <div className="card glass-card chart-container-card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Habit Completion &amp; Learning Hours</h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionSeries}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis yAxisId="left" {...axisProps} />
                  <YAxis yAxisId="right" orientation="right" {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line yAxisId="left" type="monotone" dataKey="completionPct" name="Completion %" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="learningHours" name="Learning Hours" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card glass-card chart-container-card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              XP Growth <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>(estimated)</span>
            </h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={xpSeries}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="xp" name="Cumulative XP (est.)" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Reconstructed from daily habit/learning-hour grants, not a stored ledger — treat as an estimate.
            </p>
          </div>

          <div className="card glass-card chart-container-card" style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Workout Volume</h2>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeSeries}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="tonnageKg" name="Tonnage (kg)" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Activity Heatmap</h2>
            <ActivityHeatmap entries={rangeEntries} habitCount={habits.length} days={182} />
          </div>
        </>
      )}
    </>
  );
}
