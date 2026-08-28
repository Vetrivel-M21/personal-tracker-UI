import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/apiClient.js';
import { showToast } from '../components/Toast.jsx';

const USERNAME_HINT = '3-32 characters: letters, numbers, underscore';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const RESEND_COOLDOWN_SECONDS = 60;

function isoDateNYearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}
const MAX_DOB = isoDateNYearsAgo(13);
const MIN_DOB = isoDateNYearsAgo(120);

export default function AuthScreen() {
  const { login, signUp, verifyEmail, resendVerification, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'verify'
  const [signupStep, setSignupStep] = useState(1); // 1: username/password, 2: display name/email
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [code, setCode] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return undefined;
    const t = setTimeout(() => setResendSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSecondsLeft]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else if (mode === 'signup') {
        const trimmedUsername = username.trim();
        const result = await signUp(trimmedUsername, password, displayName.trim(), email.trim(), dateOfBirth);
        setUsername(trimmedUsername);
        setEmailHint(result?.email_hint || '');
        setCode('');
        setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
        setSignupStep(1);
        setMode('verify');
      } else {
        await verifyEmail(username, code.trim());
      }
    } catch (err) {
      if (mode === 'login' && err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setEmailHint('');
        setCode('');
        setMode('verify');
        try {
          await resendVerification(username.trim());
          setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
        } catch {
          // A fresh code may already be on its way (e.g. from signup) -
          // the resend cooldown itself is a harmless failure to surface here.
        }
        showToast('Please verify your email first -- check your inbox for the code.', true);
      } else {
        const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
        showToast(message, true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setSignupStep(1);
    setMode(nextMode);
  }

  function handleNextStep() {
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 32 || !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      showToast('Enter a valid username (3-32 characters: letters, numbers, underscore).', true);
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', true);
      return;
    }
    setSignupStep(2);
  }

  async function handleResend() {
    if (resendSecondsLeft > 0) return;
    try {
      await resendVerification(username);
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      showToast('A new code is on its way.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to resend code.';
      showToast(message, true);
    }
  }

  // Only load Google Identity Services while this screen is mounted (not
  // site-wide) - lazily injects the script the first time it's needed.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    async function handleCredential(response) {
      try {
        await loginWithGoogle(response.credential);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.';
        showToast(message, true);
      }
    }

    function renderButton() {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
      // Size to the actual card width instead of a fixed 320px so the
      // button never overflows a narrow phone screen's card.
      const width = Math.min(320, Math.max(200, googleButtonRef.current.clientWidth || 320));
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black', size: 'large', width, shape: 'pill',
      });
    }

    if (window.google?.accounts?.id) {
      renderButton();
      return undefined;
    }

    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', renderButton);
      return () => { cancelled = true; existing.removeEventListener('load', renderButton); };
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', renderButton);
    document.body.appendChild(script);
    return () => { cancelled = true; script.removeEventListener('load', renderButton); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-overlay" id="auth-container">
      <div className="auth-card glass-card">
        <div className="auth-brand">
          <div className="logo-icon">
            <img src="/shadow_leveler_logo.png" alt="Aura logo" />
          </div>
          <span className="status-label" style={{ marginBottom: 0 }}>System Access</span>
          <h2>Aura</h2>
          <p>Personal Progress Tracker</p>
        </div>

        <div>
          {(mode === 'login' || (mode === 'signup' && signupStep === 1)) && GOOGLE_CLIENT_ID && (
            <>
              <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }} />
              <div className="auth-divider"><span>or continue with username</span></div>
            </>
          )}

          {mode === 'verify' ? (
            <form className="auth-form active" onSubmit={handleSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 10 }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {emailHint
                    ? <>We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{emailHint}</strong></>
                    : 'We sent a fresh 6-digit code to your email.'}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="verify-code">Verification Code</label>
                <input
                  type="text"
                  id="verify-code"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={submitting || code.length !== 6}>
                <i className="fa-solid fa-check" />
                {' '}
                {submitting ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                className="btn btn-secondary auth-submit-btn"
                disabled={resendSecondsLeft > 0}
                onClick={handleResend}
              >
                {resendSecondsLeft > 0 ? `Resend Code (${resendSecondsLeft}s)` : 'Resend Code'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ width: 'auto', height: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                  onClick={() => switchMode('login')}
                >
                  Use a different account
                </button>
              </p>
            </form>
          ) : (
            <form className="auth-form active" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <>
                  <div className="auth-steps">
                    <div className={`auth-step-dot ${signupStep >= 1 ? 'active' : ''}`}>1</div>
                    <div className={`auth-step-track ${signupStep >= 2 ? 'filled' : ''}`} />
                    <div className={`auth-step-dot ${signupStep >= 2 ? 'active' : ''}`}>2</div>
                  </div>
                  <p className="auth-step-label">
                    Step {signupStep} of 2 -- {signupStep === 1 ? 'Account details' : 'Profile info'}
                  </p>
                </>
              )}

              {(mode === 'login' || signupStep === 1) && (
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
              )}

              {(mode === 'login' || signupStep === 1) && (
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
              )}

              {mode === 'signup' && signupStep === 2 && (
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

              {mode === 'signup' && signupStep === 2 && (
                <div className="form-group">
                  <label htmlFor="signup-dob">Date of Birth</label>
                  <input
                    type="date"
                    id="signup-dob"
                    required
                    min={MIN_DOB}
                    max={MAX_DOB}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    You must be at least 13 years old.
                  </p>
                </div>
              )}

              {mode === 'signup' && signupStep === 2 && (
                <div className="form-group">
                  <label htmlFor="auth-email">Email</label>
                  <input
                    type="email"
                    id="auth-email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    We'll send a verification code here before your account can be used.
                  </p>
                </div>
              )}

              {mode === 'signup' && signupStep === 1 && (
                <button type="button" className="btn btn-primary auth-submit-btn" onClick={handleNextStep}>
                  Next
                  {' '}
                  <i className="fa-solid fa-arrow-right" />
                </button>
              )}

              {mode === 'signup' && signupStep === 2 && (
                <div className="auth-step-nav">
                  <button type="button" className="btn btn-secondary" onClick={() => setSignupStep(1)}>
                    <i className="fa-solid fa-arrow-left" />
                    {' '}
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    <i className="fa-solid fa-user-plus" />
                    {' '}
                    {submitting ? 'Please wait...' : 'Create Account'}
                  </button>
                </div>
              )}

              {mode === 'login' && (
                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={submitting}>
                  <i className="fa-solid fa-arrow-right-to-bracket" />
                  {' '}
                  {submitting ? 'Please wait...' : 'Sign In'}
                </button>
              )}

              {(mode === 'login' || signupStep === 1) && (
                <button
                  type="button"
                  className="btn btn-secondary auth-submit-btn"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                >
                  {mode === 'login' ? 'Create Account' : 'Sign In Instead'}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
