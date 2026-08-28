import { useEffect } from 'react';

// Generic modal, built on the app's existing .auth-overlay/.glass-card look
// (matches old app's modal dialogs: update-password-modal, habits-modal, etc.)
export default function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="auth-overlay modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="auth-card glass-card" style={{ maxWidth, position: 'relative' }}>
        {title && (
          <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
            <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '2.5rem' }}>
              {title}
            </h2>
            <button
              type="button"
              className="btn-icon"
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem' }}
              onClick={onClose}
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
