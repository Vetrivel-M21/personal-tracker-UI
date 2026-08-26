import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import AchievementCard from '../components/system/AchievementCard.jsx';
import { showToast } from '../components/Toast.jsx';
import { ApiError } from '../api/apiClient.js';
import { buildAchievements } from '../utils/achievements.js';

// Client-derived "Milestones" grid - see utils/achievements.js for why these
// are recomputed live rather than persisted (no user_achievements table).
export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    buildAchievements(user)
      .then((list) => { if (!cancelled) setAchievements(list); })
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Failed to load milestones.', true))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const earnedCount = achievements ? achievements.filter((a) => a.earned).length : 0;

  return (
    <div className="card glass-card" style={{ padding: '1.5rem' }}>
      <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2><i className="fa-solid fa-medal" style={{ color: 'var(--warning)', marginRight: 8 }} />Milestones</h2>
        {achievements && <span className="card-action text-muted">{earnedCount} / {achievements.length} Earned</span>}
      </div>
      <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Reflects your current standing, not a permanent unlock — a badge can un-earn itself if the underlying streak or level drops.
      </p>
      {loading && <p className="text-muted">Scanning your records...</p>}
      {!loading && achievements && (
        <div className="skill-nodes-grid">
          {achievements.map((a) => <AchievementCard key={a.name} {...a} />)}
        </div>
      )}
    </div>
  );
}
