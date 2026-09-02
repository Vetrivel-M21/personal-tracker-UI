// Wraps the orphaned .skill-node/.tier-badge-pill CSS as a badge card.
// `earned` is recomputed live from real data on every render (see
// utils/achievements.js) - there is no persisted "unlocked on" date, so this
// reflects current standing rather than a permanent trophy.
export default function AchievementCard({ icon, name, description, tier = 1, earned, celebrate = false }) {
  return (
    <div className={`skill-node${earned ? ' unlocked' : ' locked'}${celebrate ? ' just-earned' : ''}`}>
      <div className="skill-node-header">
        <span className="skill-node-title">
          <i className={`fa-solid ${icon}`} style={{ marginRight: 6 }} />
          {name}
        </span>
        <span className={`tier-badge-pill tier-${tier}-badge`}>Tier {tier}</span>
      </div>
      <p className="skill-node-desc">{description}</p>
      <div className="skill-node-action">
        {earned ? (
          <span className="badge-claimed">Current Standing: Earned</span>
        ) : (
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Not yet earned</span>
        )}
      </div>
    </div>
  );
}
