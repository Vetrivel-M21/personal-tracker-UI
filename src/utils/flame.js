// Maps a streak length to a visual intensity tier, used to scale the glow on
// every fa-fire icon in the app (Dashboard/Profile/Tracker/Leaderboard/Community).
export function flameTier(streak) {
  const n = Number(streak) || 0;
  if (n >= 14) return 'legendary';
  if (n >= 7) return 'high';
  if (n >= 3) return 'medium';
  return 'none';
}

export function flameClassName(streak) {
  const tier = flameTier(streak);
  return tier === 'none' ? '' : `flame-icon-${tier}`;
}
