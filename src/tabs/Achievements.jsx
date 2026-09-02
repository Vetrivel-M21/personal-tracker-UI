import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import AchievementCard from '../components/system/AchievementCard.jsx';
import { showToast } from '../components/Toast.jsx';
import { Skeleton } from '../components/system/Skeleton.jsx';
import { ApiError } from '../api/apiClient.js';
import { buildAchievements } from '../utils/achievements.js';
import { playLevelUp } from '../utils/sound.js';

// Module-level (not component-level) so it survives this tab unmounting when
// the user switches tabs - a per-component ref would reset on every remount
// and the "newly earned" diff below would never see a second data point.
// Keyed by user id so switching accounts in the same tab doesn't leak state.
let lastKnownEarned = null;

// Client-derived "Milestones" grid - see utils/achievements.js for why these
// are recomputed live rather than persisted (no user_achievements table).
export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justEarned, setJustEarned] = useState(new Set());
  const celebrateTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    buildAchievements(user)
      .then((list) => {
        if (cancelled) return;
        setAchievements(list);
        const currentNames = new Set(list.filter((a) => a.earned).map((a) => a.name));
        // Skip celebrating on the very first load seen for this user - only fresh unlocks count.
        if (lastKnownEarned && lastKnownEarned.userId === user?.id) {
          const newlyEarned = [...currentNames].filter((name) => !lastKnownEarned.names.has(name));
          if (newlyEarned.length > 0) {
            newlyEarned.forEach((name) => showToast(`Milestone Unlocked: ${name}!`));
            playLevelUp();
            setJustEarned(new Set(newlyEarned));
            if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);
            celebrateTimeoutRef.current = setTimeout(() => setJustEarned(new Set()), 2200);
          }
        }
        lastKnownEarned = { userId: user?.id, names: currentNames };
      })
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Failed to load milestones.', true))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);
    };
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
      {loading && (
        <div className="skill-nodes-grid">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={112} />)}
        </div>
      )}
      {!loading && achievements && (
        <div className="skill-nodes-grid">
          {achievements.map((a) => <AchievementCard key={a.name} {...a} celebrate={justEarned.has(a.name)} />)}
        </div>
      )}
    </div>
  );
}
