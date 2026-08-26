import { useEffect } from 'react';
import RankBadge from './RankBadge.jsx';
import { playLevelUp } from '../utils/sound.js';

// Full-screen "level up" overlay - replaces the old toast+confetti for
// level-ups specifically. Auto-dismisses after ~2.8s, but is also
// click-anywhere/Escape dismissible so it never blocks daily use.
export default function SystemAnnouncement({ level, xp, visible, onDismiss }) {
  useEffect(() => {
    if (!visible) return;
    playLevelUp();
    const timer = setTimeout(() => onDismiss?.(), 2800);
    function onKeyDown(e) {
      if (e.key === 'Escape') onDismiss?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="system-announcement-overlay" onClick={onDismiss}>
      <div className="system-announcement-card">
        <div className="system-announcement-tag">SYSTEM</div>
        <div className="system-announcement-title">LEVEL UP</div>
        <div className="system-announcement-level">{level}</div>
        <RankBadge xp={xp} />
        <div className="system-announcement-dismiss-hint">Click anywhere or press Esc to dismiss</div>
      </div>
    </div>
  );
}
