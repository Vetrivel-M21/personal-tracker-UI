import { useState } from 'react';
import Modal from './Modal.jsx';

// Mobile bottom tab bar - mirrors the sidebar's nav items. Only `primary`
// -flagged tabs get a slot in the fixed-width bar; everything else lives
// behind a "More" sheet so the bar doesn't overcrowd as tabs are added.
export default function BottomNav({ tabs, activeTab, onTabChange }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryTabs = tabs.filter((t) => t.primary);
  const overflowTabs = tabs.filter((t) => !t.primary);
  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);

  function selectTab(id) {
    setMoreOpen(false);
    onTabChange(id);
  }

  return (
    <>
      <nav className="bottom-nav">
        {primaryTabs.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
            onClick={(e) => { e.preventDefault(); selectTab(tab.id); }}
          >
            <i className={`fa-solid ${tab.icon}`} />
            <span>{tab.label}</span>
          </a>
        ))}
        {overflowTabs.length > 0 && (
          <a
            href="#more"
            className={`nav-item${isOverflowActive ? ' active' : ''}`}
            onClick={(e) => { e.preventDefault(); setMoreOpen(true); }}
          >
            <i className="fa-solid fa-ellipsis" />
            <span>More</span>
          </a>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="nav-menu">
          {overflowTabs.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={`nav-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); selectTab(tab.id); }}
            >
              <i className={`fa-solid ${tab.icon}`} />
              <span>{tab.label}</span>
            </a>
          ))}
        </div>
      </Modal>
    </>
  );
}
