// Letter-rank (E/D/C/B/A/S) helper - display-only, computed client-side from
// fixed XP thresholds derived from the canonical level formula:
//   level = floor(sqrt(xp / 50)) + 1
// Thresholds (per the plan): E 1-4 / 0-799, D 5-9 / 800-4049, C 10-19 / 4050-18049,
// B 20-34 / 18050-57799, A 35-49 / 57800-120049, S 50+ / 120050+.

export const RANKS = [
  { rank: 'E', minXp: 0 },
  { rank: 'D', minXp: 800 },
  { rank: 'C', minXp: 4050 },
  { rank: 'B', minXp: 18050 },
  { rank: 'A', minXp: 57800 },
  { rank: 'S', minXp: 120050 },
];

export function getLevelForXP(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

export function getRankForXP(xp) {
  let current = RANKS[0].rank;
  for (const { rank, minXp } of RANKS) {
    if (xp >= minXp) current = rank;
  }
  return current;
}
