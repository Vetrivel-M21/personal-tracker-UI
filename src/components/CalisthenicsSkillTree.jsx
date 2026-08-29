import { useEffect, useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { showToast } from './Toast.jsx';
import { playQuestComplete } from '../utils/sound.js';
import EmptyState from './system/EmptyState.jsx';

const BRANCH_ORDER = ['Push', 'Pull', 'Core', 'Legs'];
const BRANCH_ICON = { Push: 'fa-hand-fist', Pull: 'fa-arrows-down-to-line', Core: 'fa-shield-halved', Legs: 'fa-person-running' };

export default function CalisthenicsSkillTree() {
  const [branches, setBranches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.listCalisthenicsSkills()
      .then((data) => { if (!cancelled) setBranches(data.branches || {}); })
      .catch((err) => {
        if (!cancelled) showToast(err instanceof ApiError ? err.message : 'Failed to load skill tree.', true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleUnlock(skillId) {
    setUnlockingId(skillId);
    try {
      const data = await apiClient.unlockCalisthenicsSkill(skillId);
      setBranches(data.branches || {});
      playQuestComplete();
      showToast('Skill Unlocked! 🎉');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to unlock skill.', true);
    } finally {
      setUnlockingId(null);
    }
  }

  if (loading) return <p className="text-muted">Loading skill tree...</p>;
  if (!branches || Object.keys(branches).length === 0) {
    return <EmptyState icon="fa-sitemap" title="No Skills Found" message="The skill tree couldn't be loaded." />;
  }

  return (
    <div className="calisthenics-tree-grid">
      {BRANCH_ORDER.filter((branch) => branches[branch]).map((branch) => (
        <div key={branch}>
          <h3 style={{ marginBottom: '1rem' }}>
            <i className={`fa-solid ${BRANCH_ICON[branch]}`} style={{ color: 'var(--primary)', marginRight: 8 }} />
            {branch}
          </h3>
          <div className="roadmap-flow-container">
            {branches[branch].map((skill, i) => (
              <div key={skill.id}>
                {i > 0 && (
                  <div className="roadmap-connector-line">
                    <i className="fa-solid fa-chevron-down" />
                  </div>
                )}
                <div className={`skill-node${skill.unlocked ? ' unlocked' : skill.available ? ' available' : ' locked'}`}>
                  <div className="skill-node-header">
                    <span className="skill-node-title">{skill.name}</span>
                    <span className={`tier-badge-pill tier-${skill.tier}-badge`}>Tier {skill.tier}</span>
                  </div>
                  <p className="skill-node-desc">{skill.description}</p>
                  <div className="skill-node-action">
                    {skill.unlocked ? (
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        <i className="fa-solid fa-check" style={{ color: 'var(--success)', marginRight: 6 }} />
                        Unlocked
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-unlock"
                        disabled={!skill.available || unlockingId === skill.id}
                        onClick={() => handleUnlock(skill.id)}
                      >
                        <i className={`fa-solid ${skill.available ? 'fa-lock-open' : 'fa-lock'}`} />
                        {unlockingId === skill.id ? 'Unlocking...' : skill.available ? 'Unlock' : 'Locked'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
