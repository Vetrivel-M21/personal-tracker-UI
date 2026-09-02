import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import RankBadge from '../components/RankBadge.jsx';
import ExpBar from '../components/system/ExpBar.jsx';
import StatCard from '../components/system/StatCard.jsx';
import AttributeBar from '../components/system/AttributeBar.jsx';
import { SkeletonGroup } from '../components/system/Skeleton.jsx';
import { computeAttributes } from '../utils/attributes.js';
import { flameClassName } from '../utils/flame.js';

// Character-sheet screen: consolidates the level/rank/XP already shown in
// the Sidebar into a centerpiece, plus the Attributes panel (backed only by
// real streak/learning/workout data - see utils/attributes.js).
export default function Profile() {
  const { user } = useAuth();
  const [attributes, setAttributes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    computeAttributes(user)
      .then((attrs) => { if (!cancelled) setAttributes(attrs); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <>
      <div className="card glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <span className="status-label">Hunter Profile</span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: 4 }}>
          {user?.display_name || 'Adventurer'}
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <LevelBadge level={user?.level ?? 1} />
          <RankBadge xp={user?.xp ?? 0} />
        </div>
        <div style={{ maxWidth: 360, margin: '0 auto' }}>
          <ExpBar xpIntoLevel={user?.xp_into_level ?? 0} xpForNextLevel={user?.xp_for_next_level ?? 50} size="lg" />
        </div>
      </div>

      <div className="overview-grid" style={{ marginTop: '1rem' }}>
        <StatCard
          icon="fa-fire"
          iconBg="bg-orange-alpha"
          iconStyle={{ color: 'var(--orange)' }}
          iconClassName={flameClassName(user?.current_streak)}
          label="Current Streak"
          value={`${user?.current_streak ?? 0} Day${(user?.current_streak ?? 0) === 1 ? '' : 's'}`}
          valueStyle={{ color: 'var(--orange)' }}
          sublabel={`🛡️ ${user?.shields_remaining ?? 0} Shields Active`}
        />
        <StatCard
          icon="fa-bolt"
          iconBg="bg-indigo-alpha"
          iconStyle={{ color: 'var(--primary)' }}
          label="Total XP"
          value={user?.xp ?? 0}
          sublabel="Lifetime experience earned"
        />
      </div>

      <div className="card glass-card" style={{ padding: '1.5rem' }}>
        <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
          <h2>Attributes</h2>
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>Trailing 90 days</span>
        </div>
        {loading && <SkeletonGroup count={4} height={40} />}
        {!loading && attributes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {attributes.map((attr) => <AttributeBar key={attr.code} {...attr} />)}
          </div>
        )}
      </div>
    </>
  );
}
