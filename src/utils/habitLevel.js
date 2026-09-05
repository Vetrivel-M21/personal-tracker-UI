// Shared "how much of a day's due habits got done" tier, used by both the
// Activity Heatmap and the Calendar Month view for consistent coloring.
export function levelForRatio(ratio) {
  if (ratio <= 0) return 0;
  if (ratio < 0.5) return 1;
  if (ratio < 1) return 2;
  return 3;
}
