// GitHub-style activity heatmap - wires up the .habit-heatmap/.heatmap-day/
// .level-0..3 CSS that already existed in style.css but nothing rendered.
// Fed by the same listProgress range data Tracker/Dashboard already fetch.
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function levelForRatio(ratio) {
  if (ratio <= 0) return 0;
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  return 3;
}

export default function ActivityHeatmap({ entries, habitCount, days = 182 }) {
  const byDate = {};
  (entries || []).forEach((e) => { byDate[e.date] = e; });

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));
  const leadingBlanks = startDate.getDay();

  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const entry = byDate[key];
    const completed = entry && Array.isArray(entry.completed_habit_ids) ? entry.completed_habit_ids.length : 0;
    const ratio = habitCount > 0 ? completed / habitCount : 0;
    cells.push({
      key,
      date: d,
      level: levelForRatio(ratio),
      title: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${completed}/${habitCount} habits`,
    });
  }

  // Month labels: chunk the same leading-blanks-then-cells sequence into
  // columns of 7 (one per week, matching the grid below) and label each
  // column with its first dated cell's month, only when that month differs
  // from the previous column's.
  const allCells = [...Array.from({ length: leadingBlanks }, () => null), ...cells];
  const monthLabels = [];
  let lastMonth = null;
  for (let i = 0; i < allCells.length; i += 7) {
    const column = allCells.slice(i, i + 7);
    const firstDated = column.find((c) => c);
    if (!firstDated) { monthLabels.push(''); continue; }
    const month = firstDated.date.getMonth();
    monthLabels.push(month === lastMonth ? '' : firstDated.date.toLocaleDateString('en-US', { month: 'short' }));
    lastMonth = month;
  }

  return (
    <div className="card glass-card habit-grid-card">
      <div className="habit-heatmap-wrapper">
        <div className="heatmap-months">
          {monthLabels.map((label, i) => (
            <span key={i} className="heatmap-month-label">{label}</span>
          ))}
        </div>
        <div className="habit-heatmap">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} className="heatmap-day" style={{ visibility: 'hidden' }} />
          ))}
          {cells.map((cell) => (
            <div key={cell.key} className={`heatmap-day level-${cell.level}`} title={cell.title} />
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <span className="legend-box level-0" />
          <span className="legend-box level-1" />
          <span className="legend-box level-2" />
          <span className="legend-box level-3" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
