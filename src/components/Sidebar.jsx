import LevelBadge from './LevelBadge.jsx';
import RankBadge from './RankBadge.jsx';
import ExpBar from './system/ExpBar.jsx';

// Desktop sidebar nav + user profile/XP block, plus the mobile top header bar
// (shown instead of the sidebar below the 1023px breakpoint via existing CSS).
export default function Sidebar({ tabs, activeTab, onTabChange, user, onLogout }) {
  const level = user?.level ?? 1;
  const xp = user?.xp ?? 0;
  const xpIntoLevel = user?.xp_into_level ?? 0;
  const xpForNextLevel = user?.xp_for_next_level ?? 50;

  return (
    <>
      <header className="mobile-nav-header">
        <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon">
            <i className="fa-solid fa-wand-magic-sparkles" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>Aura</span>
            <span style={{ marginTop: 3, alignSelf: 'flex-start' }}><LevelBadge level={level} /></span>
          </div>
        </div>
        <div className="mobile-header-actions">
          <button type="button" className="btn-icon text-rose" onClick={onLogout} title="Sign Out">
            <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="brand">
          <div className="logo-icon">
            <i className="fa-solid fa-wand-magic-sparkles" />
          </div>
          <h2>Aura</h2>
        </div>

        <nav className="nav-menu">
          {tabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); onTabChange(tab.id); }}
            >
              <i className={`fa-solid ${tab.icon}`} />
              <span>{tab.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <span className="status-label">Status</span>
            <div className="profile-top-row">
              <div className="profile-name-area">
                <i className="fa-solid fa-circle-user text-indigo" />
                <span>{user?.display_name || 'Adventurer'}</span>
              </div>
              <LevelBadge level={level} />
            </div>
            <ExpBar xpIntoLevel={xpIntoLevel} xpForNextLevel={xpForNextLevel} />
            <div style={{ marginTop: 8 }}>
              <RankBadge xp={xp} />
            </div>
          </div>
          <button type="button" className="footer-btn text-rose" onClick={onLogout} title="Sign Out">
            <i className="fa-solid fa-arrow-right-from-bracket" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
