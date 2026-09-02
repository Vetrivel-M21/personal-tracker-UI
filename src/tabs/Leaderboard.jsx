import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from '../components/Toast.jsx';
import Pagination from '../components/Pagination.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import RankBadge from '../components/RankBadge.jsx';
import LeaderboardPodium from '../components/LeaderboardPodium.jsx';
import EmptyState from '../components/system/EmptyState.jsx';
import { SkeletonGroup } from '../components/system/Skeleton.jsx';
import { flameClassName } from '../utils/flame.js';

const PAGE_SIZE = 20;

// Public to every logged-in user, ranked by XP or current streak -- no
// friends/follow system, matching the app's "public to all registered
// users" visibility model.
export default function Leaderboard() {
  const { user } = useAuth();
  const [sort, setSort] = useState('xp');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getLeaderboard(sort, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load leaderboard.', true);
    } finally {
      setLoading(false);
    }
  }, [sort, page]);

  useEffect(() => { reload(); }, [reload]);

  function changeSort(next) {
    if (next === sort) return;
    setSort(next);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rankBadgeClass = (rank) => (rank <= 3 ? ` rank-top rank-top-${rank}` : '');

  return (
    <div className="card glass-card" style={{ padding: 0 }}>
      <div className="card-header border-bottom" style={{ padding: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2><i className="fa-solid fa-trophy" style={{ color: 'var(--warning)', marginRight: 8 }} />Leaderboard</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${sort === 'xp' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeSort('xp')}
          >
            By XP
          </button>
          <button
            type="button"
            className={`btn btn-sm ${sort === 'streak' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => changeSort('streak')}
          >
            By Streak
          </button>
        </div>
      </div>

      {loading && <div style={{ padding: '1.5rem' }}><SkeletonGroup count={6} height={44} /></div>}

      {!loading && entries.length === 0 && (
        <EmptyState
          icon="fa-ranking-star"
          title="No Hunters Ranked Yet"
          message="Be the first to log a habit and claim the top spot."
        />
      )}

      {!loading && entries.length >= 3 && page === 1 && (
        <LeaderboardPodium entries={entries.slice(0, 3)} currentUserId={user?.id} sort={sort} />
      )}

      {!loading && entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="portfolio-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Hunter</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Level</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>XP</th>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => {
                const isSelf = row.user_id === user?.id;
                return (
                  <tr
                    key={row.user_id}
                    style={isSelf ? { backgroundColor: 'var(--primary-muted)' } : undefined}
                  >
                    <td data-label="Rank">
                      <span className={`asset-badge${rankBadgeClass(row.rank)}`}>#{row.rank}</span>
                    </td>
                    <td data-label="Hunter">
                      {row.display_name}{isSelf ? <span className="text-muted"> (You)</span> : null}
                    </td>
                    <td data-label="Level"><LevelBadge level={row.level} /></td>
                    <td data-label="Rank"><RankBadge xp={row.xp} /></td>
                    <td data-label="XP">{row.xp}</td>
                    <td data-label="Streak">
                      <i className={`fa-solid fa-fire text-orange ${flameClassName(row.current_streak)}`} /> {row.current_streak}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  );
}
