// Shared "System" empty-state panel (spec: "SYSTEM / NO ACTIVE QUESTS / Your
// next mission awaits" pattern) - reused across Tracker/Achievements/Analytics
// instead of each screen inventing its own copy/markup.
export default function EmptyState({ icon = 'fa-circle-exclamation', title, message, action }) {
  return (
    <div className="system-empty-state">
      <span className="system-empty-state-tag">SYSTEM</span>
      <i className={`fa-solid ${icon}`} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
