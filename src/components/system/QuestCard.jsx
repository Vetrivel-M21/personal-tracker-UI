import { playQuestComplete } from '../../utils/sound.js';

// Reskins a single habit as a "Daily Quest" - wraps the orphaned
// .quest-item/.btn-claim-xp CSS that existed but was never wired to a
// component. The +XP reward shown matches the real server-side grant
// (+10 XP per completed habit, see server/internal/api/progress.go).
export default function QuestCard({ icon, iconColor, name, xpReward = 10, checked, onToggle }) {
  function activate() {
    if (!checked) playQuestComplete();
    onToggle?.();
  }

  return (
    <div
      className={`quest-item${checked ? ' quest-item-complete' : ''}`}
      onClick={activate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div
        className="quest-icon-wrapper"
        style={{ backgroundColor: `${iconColor}22`, color: iconColor }}
      >
        <i className={icon} />
      </div>
      <div className="quest-item-body">
        <span className="quest-item-label">Daily Quest</span>
        <span className="quest-item-name">{name}</span>
      </div>
      {checked ? (
        <span className="badge-claimed"><i className="fa-solid fa-check" /> +{xpReward} XP</span>
      ) : (
        <span className="btn-claim-xp">+{xpReward} XP</span>
      )}
    </div>
  );
}
