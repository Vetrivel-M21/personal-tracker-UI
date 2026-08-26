import { useCallback, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import AuthScreen from './tabs/AuthScreen.jsx';
import Dashboard from './tabs/Dashboard.jsx';
import Tracker from './tabs/Tracker.jsx';
import Leaderboard from './tabs/Leaderboard.jsx';
import Community from './tabs/Community.jsx';
import Fitness from './tabs/Fitness.jsx';
import Settings from './tabs/Settings.jsx';
import Profile from './tabs/Profile.jsx';
import Achievements from './tabs/Achievements.jsx';
import Analytics from './tabs/Analytics.jsx';
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';

// Tab registry: adding a new tab later is just pushing one more entry here -
// no other restructuring needed. `primary: true` tabs get a slot in the fixed
// -width mobile bottom bar; the rest live behind its "More" overflow sheet
// (see BottomNav.jsx) so the bar doesn't overcrowd as tabs grow.
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high', component: Dashboard, primary: true },
  { id: 'tracker', label: 'Daily Logs', icon: 'fa-calendar-check', component: Tracker, primary: true },
  { id: 'fitness', label: 'Workout Split', icon: 'fa-dumbbell', component: Fitness, primary: true },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'fa-trophy', component: Leaderboard, primary: true },
  { id: 'community', label: 'Community', icon: 'fa-users', component: Community },
  { id: 'profile', label: 'Profile', icon: 'fa-id-badge', component: Profile },
  { id: 'achievements', label: 'Milestones', icon: 'fa-medal', component: Achievements },
  { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line', component: Analytics },
  { id: 'settings', label: 'Settings', icon: 'fa-gear', component: Settings },
];

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  // Shared cross-tab state: Tracker's "edit this date" actions jump to the
  // Dashboard tab pre-loaded with that date's entry (matches the old app's
  // loadDateLog + switchTab('dashboard') behavior).
  const [dashboardFocusDate, setDashboardFocusDate] = useState(null);

  const handleEditDate = useCallback((date) => {
    setDashboardFocusDate(date);
    setActiveTab('dashboard');
  }, []);

  const handleFocusDateConsumed = useCallback(() => setDashboardFocusDate(null), []);

  if (loading) {
    return (
      <div className="global-loader-overlay">
        <div className="loader-content">
          <div className="energy-sphere">
            <div className="core-glow" />
            <div className="orbit path-1"><div className="particle" /></div>
            <div className="orbit path-2"><div className="particle" /></div>
            <div className="orbit path-3"><div className="particle" /></div>
          </div>
          <p className="loader-subtitle">Synchronizing with the System...</p>
          <div className="loader-progress-track"><div className="loader-progress-bar" /></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <Toast />
      </>
    );
  }

  const activeTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveComponent = activeTabDef.component;
  const dateSubtitle = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="app-container">
      <BottomNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <Sidebar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={logout} />

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1>{activeTabDef.label}</h1>
            <p className="subtitle">{dateSubtitle}</p>
          </div>
        </header>

        <div className="tab-content-container">
          {activeTabDef.id === 'dashboard' ? (
            <ActiveComponent focusDate={dashboardFocusDate} onFocusDateConsumed={handleFocusDateConsumed} />
          ) : (
            <ActiveComponent onEditDate={handleEditDate} />
          )}
        </div>
      </main>

      <Toast />
    </div>
  );
}
