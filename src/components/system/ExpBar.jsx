// XP progress bar - extracted from the markup previously inlined only in
// Sidebar.jsx, so Profile/SystemAnnouncement can reuse the exact same look.
export default function ExpBar({ xpIntoLevel, xpForNextLevel, size = 'md' }) {
  const pct = xpForNextLevel > 0
    ? Math.min(100, Math.max(0, (xpIntoLevel / xpForNextLevel) * 100))
    : 0;

  return (
    <div className={`exp-bar exp-bar-${size}`}>
      <div className="xp-progress-container">
        <div className="xp-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="xp-text">{xpIntoLevel} / {xpForNextLevel} XP</div>
    </div>
  );
}
