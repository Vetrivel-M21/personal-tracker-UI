import { useMemo, useState } from 'react';
import { dueHabitsOn } from '../utils/schedule.js';
import { levelForRatio } from '../utils/habitLevel.js';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MIN_MONTH_OFFSET = -11; // roughly matches the 365-day range Tracker fetches

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Month-at-a-glance view of logged progress, built from the same range data
// Tracker already loads for the Activity Ledger - no extra API calls.
export default function CalendarMonth({ entries, habits, onSelectDate }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const byDate = useMemo(() => {
    const map = {};
    (entries || []).forEach((e) => { map[e.date] = e; });
    return map;
  }, [entries]);

  const viewDate = new Date();
  viewDate.setDate(1);
  viewDate.setMonth(viewDate.getMonth() + monthOffset);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const todayKey = dateKey(new Date());
  const now = new Date();

  const cells = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = dateKey(d);
    const entry = byDate[key];
    const completed = entry && Array.isArray(entry.completed_habit_ids) ? entry.completed_habit_ids.length : 0;
    const due = dueHabitsOn(habits, d).length;
    const ratio = due > 0 ? completed / due : 0;
    cells.push({
      day,
      key,
      hasEntry: Boolean(entry),
      level: levelForRatio(ratio),
      isToday: key === todayKey,
      isFuture: d > now,
    });
  }

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar-month">
      <div className="calendar-month-header">
        <button
          type="button" className="btn-icon" title="Previous month"
          disabled={monthOffset <= MIN_MONTH_OFFSET}
          onClick={() => setMonthOffset((o) => o - 1)}
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        <span>{monthLabel}</span>
        <button
          type="button" className="btn-icon" title="Next month"
          disabled={monthOffset >= 0}
          onClick={() => setMonthOffset((o) => o + 1)}
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
      <div className="calendar-weekday-row">
        {WEEKDAY_LABELS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="calendar-cell blank" />
        ))}
        {cells.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`calendar-cell${c.hasEntry ? ` level-${c.level}` : ''}${c.isToday ? ' today' : ''}`}
            disabled={c.isFuture}
            title={c.hasEntry ? `${c.key}: logged` : c.key}
            onClick={() => onSelectDate?.(c.key)}
          >
            {c.day}
          </button>
        ))}
      </div>
    </div>
  );
}
