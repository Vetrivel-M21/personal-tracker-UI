import { useState } from 'react';
import { apiClient, ApiError } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { showToast } from '../components/Toast.jsx';
import { isSoundEnabled, setSoundEnabled, playQuestComplete } from '../utils/sound.js';
import ToggleSwitch from '../components/system/ToggleSwitch.jsx';
import HabitManager from '../components/HabitManager.jsx';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.date_of_birth || '');
  const [savingName, setSavingName] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  function handleToggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playQuestComplete();
  }

  const [publicProfile, setPublicProfile] = useState(!user?.profile_private);
  const [showHabits, setShowHabits] = useState(!user?.hide_habits);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function handleTogglePublicProfile() {
    const next = !publicProfile;
    setPublicProfile(next);
    setSavingPrivacy(true);
    try {
      const updated = await apiClient.updateMe({ display_name: user?.display_name || '', profile_private: !next });
      updateUser({ profile_private: updated.profile_private, hide_habits: updated.hide_habits });
    } catch (err) {
      setPublicProfile(!next);
      showToast(err instanceof ApiError ? err.message : 'Failed to update privacy setting.', true);
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleToggleShowHabits() {
    const next = !showHabits;
    setShowHabits(next);
    setSavingPrivacy(true);
    try {
      const updated = await apiClient.updateMe({ display_name: user?.display_name || '', hide_habits: !next });
      updateUser({ profile_private: updated.profile_private, hide_habits: updated.hide_habits });
    } catch (err) {
      setShowHabits(!next);
      showToast(err instanceof ApiError ? err.message : 'Failed to update privacy setting.', true);
    } finally {
      setSavingPrivacy(false);
    }
  }

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveProfile(e) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      showToast('Display name is required.', true);
      return;
    }
    setSavingName(true);
    try {
      const updated = await apiClient.updateMe({ display_name: trimmed, date_of_birth: dateOfBirth || null });
      updateUser({ display_name: updated.display_name, date_of_birth: updated.date_of_birth, age: updated.age });
      showToast('Profile updated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update profile.', true);
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', true);
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', true);
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to change password.', true);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <div className="split-view">
        <div className="pane-left">
          <div className="card glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
              <h2><i className="fa-solid fa-id-badge" style={{ marginRight: 8 }} />Profile</h2>
            </div>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label htmlFor="settings-display-name">Display Name</label>
                <input
                  type="text"
                  id="settings-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="settings-dob">
                  Date of Birth
                  {user?.age != null && (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> (Age {user.age})</span>
                  )}
                </label>
                <input
                  type="date"
                  id="settings-dob"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={savingName}>
                <i className="fa-solid fa-floppy-disk" /> {savingName ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          <div className="card glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
              <h2><i className="fa-solid fa-sliders" style={{ marginRight: 8 }} />System Preferences</h2>
            </div>
            <ToggleSwitch checked={soundOn} onChange={handleToggleSound} label="System Sound Effects" />
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
              Plays short synthesized tones for quest completions, level-ups, and system messages.
            </p>
          </div>

          <div className="card glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
              <h2><i className="fa-solid fa-user-shield" style={{ marginRight: 8 }} />Privacy</h2>
            </div>
            <ToggleSwitch checked={publicProfile} onChange={handleTogglePublicProfile} label="Public Profile" />
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem', marginBottom: '1.25rem' }}>
              When off, your profile is hidden from Community and Leaderboard for everyone but you.
            </p>
            <ToggleSwitch
              checked={showHabits}
              onChange={handleToggleShowHabits}
              label="Show My Habits"
            />
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
              When off, other hunters can still see your stats but not your individual habit list.
            </p>
            {savingPrivacy && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Saving...</p>}
          </div>
        </div>

        <div className="pane-right">
          <div className="card glass-card" style={{ padding: '1.5rem' }}>
            <div className="card-header border-bottom" style={{ padding: '0 0 1rem 0', marginBottom: '1.25rem' }}>
              <h2><i className="fa-solid fa-lock" style={{ marginRight: 8 }} />Account Security</h2>
            </div>
            {user?.has_password === false ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                <i className="fa-brands fa-google" style={{ marginRight: 8, color: 'var(--primary)' }} />
                Signed in with Google -- there's no separate password for this account.
              </p>
            ) : (
              <>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label htmlFor="settings-current-password">Current Password</label>
                    <input
                      type="password"
                      id="settings-current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="settings-new-password">New Password</label>
                      <input
                        type="password"
                        id="settings-new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="settings-confirm-password">Confirm New Password</label>
                      <input
                        type="password"
                        id="settings-confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                    <i className="fa-solid fa-key" /> {savingPassword ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
                <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                  There's no self-service password reset yet -- if you forget your password, an admin will need to reset it directly.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <HabitManager />
      </div>
    </>
  );
}
