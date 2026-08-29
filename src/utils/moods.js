// Shared mood metadata - Dashboard's daily-log mood picker and Tracker's
// mood distribution card both need the same value/label/icon/color set.
export const MOODS = [
  { value: 'Great', label: 'Great', emoji: '😄', icon: 'fa-face-laugh-beam', color: 'var(--success)', glow: 'rgba(16, 185, 129, 0.5)' },
  { value: 'Good', label: 'Good', emoji: '🙂', icon: 'fa-face-smile', color: 'var(--primary)', glow: 'rgba(34, 211, 238, 0.5)' },
  { value: 'Average', label: 'Average', emoji: '😐', icon: 'fa-face-meh', color: 'var(--warning)', glow: 'rgba(245, 158, 11, 0.5)' },
  { value: 'Bad', label: 'Bad', emoji: '😔', icon: 'fa-face-frown', color: 'var(--danger)', glow: 'rgba(239, 68, 68, 0.5)' },
];
