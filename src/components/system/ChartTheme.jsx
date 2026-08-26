// Shared Recharts theming so every chart on the Analytics screen matches the
// same dark System palette instead of each chart hand-rolling colors.
// Hardcoded hex (not CSS var(...)) since these values feed SVG/inline-style
// props Recharts controls directly, and the app has no light-theme toggle
// wired up anywhere to make CSS-var theming worth the indirection.
export const CHART_COLORS = {
  primary: '#22d3ee',
  secondary: '#a855f7',
  success: '#10b981',
  warning: '#f59e0b',
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: '#5b6b8c',
};

export const gridProps = {
  stroke: CHART_COLORS.grid,
  vertical: false,
};

export const axisProps = {
  stroke: CHART_COLORS.axis,
  tick: { fill: CHART_COLORS.axis, fontSize: 11, fontFamily: 'Inter, sans-serif' },
  tickLine: false,
  axisLine: { stroke: 'rgba(255, 255, 255, 0.08)' },
};

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(11, 15, 25, 0.92)',
        border: '1px solid rgba(94, 234, 255, 0.3)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: '0.8rem',
        color: '#e9f4fb',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ color: '#93a4c3', marginBottom: 4, fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}
