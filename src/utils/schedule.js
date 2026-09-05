// Habit schedule is a 7-bit mask (bit0=Mon...bit6=Sun), matching the
// server's convention in server/internal/api/habits.go. 127 = every day.
export function isDueOn(schedule, date) {
  const dow = date.getDay(); // 0=Sun..6=Sat
  const bit = dow === 0 ? 6 : dow - 1;
  return ((schedule ?? 127) & (1 << bit)) !== 0;
}

export function dueHabitsOn(habits, date) {
  return habits.filter((h) => isDueOn(h.schedule, date));
}
