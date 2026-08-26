import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/apiClient.js';
import { showToast } from '../components/Toast.jsx';

const USERNAME_HINT = '3-32 characters: letters, numbers, underscore';

export default function AuthScreen() {
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await signUp(username.trim(), password, displayName.trim());
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      showToast(message, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-overlay" id="auth-container">
      <div className="auth-card glass-card">
        <div className="auth-brand">
          <div className="logo-icon">
            <i className="fa-solid fa-wand-magic-sparkles" />
          </div>
          <span className="status-label" style={{ marginBottom: 0 }}>System Access</span>
          <h2>Aura</h2>
          <p>Personal Progress Tracker</p>
        </div>

        <div>
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form active" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="signup-name">Display Name</label>
                <input
                  type="text"
                  id="signup-name"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-username">Username</label>
              <input
                type="text"
                id="auth-username"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_]+"
                placeholder="e.g. alex_j"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {mode === 'signup' && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>{USERNAME_HINT}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                type="password"
                id="auth-password"
                required
                minLength={8}
                maxLength={200}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={submitting}>
              <i className={`fa-solid ${mode === 'login' ? 'fa-arrow-right-to-bracket' : 'fa-user-plus'}`} />
              {' '}
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Register Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
