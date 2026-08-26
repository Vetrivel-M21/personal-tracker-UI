import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from '../components/Toast.jsx';
import Pagination from '../components/Pagination.jsx';
import Modal from '../components/Modal.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import RankBadge from '../components/RankBadge.jsx';
import EmptyState from '../components/system/EmptyState.jsx';

const PAGE_SIZE = 20;

// Public directory: every registered user, browsable/searchable by any
// logged-in user, with a read-only view of their habits + streak. No
// friend/follow system, matching the app's visibility model.
export default function Community() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.listUsers(query, PAGE_SIZE, (page - 1) * PAGE_SIZE);
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load users.', true);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  // Debounce the search query.
  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [reload]);

  async function openHabits(userId) {
    setSelectedUserId(userId);
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const data = await apiClient.getUserHabitsSummary(userId);
      setSummary(data);
    } catch (err) {
      setSummaryError(err instanceof ApiError ? err.message : 'Failed to load this user.');
    } finally {
      setSummaryLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="card glass-card" style={{ padding: '1.5rem' }}>
        <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
          <h2><i className="fa-solid fa-users" style={{ color: 'var(--primary)', marginRight: 8 }} />Community</h2>
          <span className="card-action text-muted">{total} Hunter{total === 1 ? '' : 's'}</span>
        </div>
        <div className="form-group search-input-wrapper" style={{ marginBottom: 0 }}>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="Search by name..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading && <p className="text-muted" style={{ marginTop: '1rem' }}>Scanning the hunter registry...</p>}

      {!loading && entries.length === 0 && (
        <div style={{ marginTop: '1rem' }}>
          <EmptyState icon="fa-user-slash" title="No Hunters Found" message="Try a different search." />
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="community-list" style={{ marginTop: '1rem' }}>
          {entries.map((row) => (
            <div key={row.user_id} className="card glass-card community-row">
              <div className="community-row-main">
                <h3>
                  {row.display_name}{row.user_id === user?.id ? <span className="text-muted"> (You)</span> : null}
                </h3>
                <LevelBadge level={row.level} />
                <RankBadge xp={row.xp} />
                <span className="text-orange" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  <i className="fa-solid fa-fire" /> {row.current_streak} day{row.current_streak === 1 ? '' : 's'}
                </span>
                {row.active_split_name && (
                  <span className="stat-desc" style={{ whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-dumbbell" style={{ marginRight: 6 }} />{row.active_split_name}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openHabits(row.user_id)}
              >
                View Habits
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="card glass-card" style={{ padding: 0, marginTop: '1rem' }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      )}

      <Modal open={selectedUserId !== null} onClose={() => setSelectedUserId(null)} title={summary?.display_name || 'Hunter Profile'}>
        {summaryLoading && <p className="text-muted">Loading hunter profile...</p>}
        {summaryError && <p style={{ color: 'var(--danger)' }}>{summaryError}</p>}
        {summary && !summaryLoading && !summaryError && (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem' }}>
              <LevelBadge level={summary.level} />
              <RankBadge xp={summary.xp} />
              <span className="text-orange" style={{ fontSize: '0.85rem' }}>
                <i className="fa-solid fa-fire" /> {summary.current_streak} day{summary.current_streak === 1 ? '' : 's'}
              </span>
            </div>
            {summary.active_split_name && (
              <p className="stat-desc" style={{ marginBottom: '1.25rem' }}>
                <i className="fa-solid fa-dumbbell" style={{ marginRight: 6 }} />Following: {summary.active_split_name}
              </p>
            )}
            <div className="habit-manager-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(summary.habits || []).length === 0 && <p className="text-muted">No habits yet.</p>}
              {(summary.habits || []).map((h) => (
                <div key={h.id} className="habit-manager-item">
                  <div className="habit-manager-item-left">
                    <i className={h.icon} style={{ color: h.color }} />
                    <span>{h.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
