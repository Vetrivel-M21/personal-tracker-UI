import { getRankForXP } from '../utils/rank.js';

// Letter-rank pill (E/D/C/B/A/S), derived client-side from total XP.
// S-rank gets an animated glow via the .rank-pill-s CSS class.
export default function RankBadge({ xp }) {
  const rank = getRankForXP(xp || 0);
  return <span className={`rank-pill rank-pill-${rank.toLowerCase()}`}>{rank}-Rank</span>;
}
