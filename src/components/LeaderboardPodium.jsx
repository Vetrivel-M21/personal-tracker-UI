import LevelBadge from './LevelBadge.jsx';
import RankBadge from './RankBadge.jsx';
import { flameClassName } from '../utils/flame.js';

const PODIUM_META = {
  1: { icon: 'fa-crown', order: 0, rankClass: 'rank-1' },
  2: { icon: 'fa-medal', order: -1, rankClass: 'rank-2' },
  3: { icon: 'fa-medal', order: 1, rankClass: 'rank-3' },
};

// Promotes the top 3 leaderboard rows out of the table into a visual podium
// (2nd-1st-3rd, 1st raised/center), reusing the rank-top-N glow palette
// already defined for the table's rank pills.
export default function LeaderboardPodium({ entries, currentUserId, sort }) {
  return (
    <div className="podium-grid">
      {entries.map((row, i) => {
        const rank = i + 1;
        const meta = PODIUM_META[rank];
        const isSelf = row.user_id === currentUserId;
        const metricValue = sort === 'streak' ? row.current_streak : row.xp;
        const metricLabel = sort === 'streak' ? 'Streak' : 'XP';
        return (
          <div
            key={row.user_id}
            className={`podium-card ${meta.rankClass}`}
            style={{ order: meta.order }}
          >
            <i className={`fa-solid ${meta.icon} podium-rank-icon`} />
            <div className="podium-name">
              {row.display_name}{isSelf ? <span className="text-muted"> (You)</span> : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '6px 0' }}>
              <LevelBadge level={row.level} />
              <RankBadge xp={row.xp} />
            </div>
            <div className="podium-metric">
              {sort === 'streak' && <i className={`fa-solid fa-fire text-orange ${flameClassName(row.current_streak)}`} />}
              {' '}{metricValue} {metricLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
