// Thin fetch() wrapper for the Aura Go backend.
// Same-origin: '' base URL. Vite's dev server proxy forwards /api to the
// backend locally; Caddy does the equivalent in production.

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const BASE_URL = '';

// Access tokens are short-lived (15 min); the refresh token cookie lasts 30
// days. A single in-flight refresh is shared across concurrent 401s so a
// burst of requests doesn't fire the refresh endpoint multiple times.
let refreshInFlight = null;

function attemptRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function request(method, path, body, isRetry = false) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  // A 401 on an authenticated endpoint usually just means the access token
  // expired -- try a silent refresh and transparently retry once before
  // treating it as a real session expiry. Skip this for /api/auth/* itself:
  // those 401s are real login/signup failures, not session expiry, and
  // /api/auth/refresh must never try to refresh itself.
  if (res.status === 401 && !isRetry && !path.startsWith('/api/auth/')) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return request(method, path, body, true);
    }
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }

  if (res.ok) {
    if (res.status === 204) return null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return null;
  }

  // Non-2xx: try to parse a structured error body, fall back to statusText.
  let code = 'UNKNOWN_ERROR';
  let message = res.statusText || 'Something went wrong.';
  try {
    const data = await res.json();
    if (data) {
      code = data.code || code;
      message = data.message || message;
    }
  } catch {
    // no JSON body - keep defaults
  }
  throw new ApiError(res.status, code, message);
}

function qs(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') usp.set(key, value);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const apiClient = {
  // --- Auth ---
  signup(username, password, displayName, email, dateOfBirth) {
    return request('POST', '/api/auth/signup',
      { username, password, display_name: displayName, email, date_of_birth: dateOfBirth });
  },
  login(username, password) {
    return request('POST', '/api/auth/login', { username, password });
  },
  logout() {
    return request('POST', '/api/auth/logout');
  },
  loginWithGoogle(credential) {
    return request('POST', '/api/auth/google', { credential });
  },
  verifyEmail(username, code) {
    return request('POST', '/api/auth/verify-email', { username, code });
  },
  resendVerification(username) {
    return request('POST', '/api/auth/resend-verification', { username });
  },
  forgotPassword(username) {
    return request('POST', '/api/auth/forgot-password', { username });
  },
  resetPassword(username, code, newPassword) {
    return request('POST', '/api/auth/reset-password', { username, code, new_password: newPassword });
  },

  // --- Profile ---
  getMe() {
    return request('GET', '/api/me');
  },
  getMeStats() {
    return request('GET', '/api/me/stats');
  },
  updateMe(patch) {
    return request('PATCH', '/api/me', patch);
  },
  changePassword(currentPassword, newPassword) {
    return request('PATCH', '/api/me/password', { current_password: currentPassword, new_password: newPassword });
  },
  deleteAccount(password) {
    return request('DELETE', '/api/me', { password });
  },
  exportData() {
    return request('GET', '/api/me/export');
  },

  // --- Habits ---
  listHabits() {
    return request('GET', '/api/habits');
  },
  createHabit(name, color, icon) {
    return request('POST', '/api/habits', { name, color, icon });
  },
  deleteHabit(id) {
    return request('DELETE', `/api/habits/${id}`);
  },

  // --- To-dos ---
  listTodos() {
    return request('GET', '/api/todos');
  },
  createTodo(title, priority) {
    return request('POST', '/api/todos', { title, priority });
  },
  updateTodo(id, patch) {
    return request('PATCH', `/api/todos/${id}`, patch);
  },
  deleteTodo(id) {
    return request('DELETE', `/api/todos/${id}`);
  },

  // --- Focus / meditation sessions ---
  logFocusSession(sessionType, durationMinutes) {
    return request('POST', '/api/focus-sessions', { session_type: sessionType, duration_minutes: durationMinutes });
  },
  listFocusSessions(limit, offset) {
    return request('GET', `/api/focus-sessions${qs({ limit, offset })}`);
  },

  // --- Calisthenics skill tree ---
  listCalisthenicsSkills() {
    return request('GET', '/api/calisthenics/skills');
  },
  unlockCalisthenicsSkill(skillId) {
    return request('POST', `/api/calisthenics/skills/${skillId}/unlock`);
  },

  // --- Progress / daily check-in ---
  getProgressByDate(date) {
    return request('GET', `/api/progress/${date}`);
  },
  listProgress({ from, to } = {}) {
    return request('GET', `/api/progress${qs({ from, to })}`);
  },
  saveProgress(date, payload) {
    return request('PUT', `/api/progress/${date}`, payload);
  },
  deleteProgress(date) {
    return request('DELETE', `/api/progress/${date}`);
  },

  // --- Social ---
  getLeaderboard(sort, limit, offset) {
    return request('GET', `/api/leaderboard${qs({ sort, limit, offset })}`);
  },
  listUsers(query, limit, offset) {
    return request('GET', `/api/users${qs({ query, limit, offset })}`);
  },
  getUserHabitsSummary(userId) {
    return request('GET', `/api/users/${userId}/habits-summary`);
  },
  giveKudos(userId) {
    return request('POST', `/api/users/${userId}/kudos`);
  },

  // --- Workouts: templates ---
  listWorkoutTemplates() {
    return request('GET', '/api/workouts/templates');
  },
  getWorkoutTemplate(id) {
    return request('GET', `/api/workouts/templates/${id}`);
  },
  cloneWorkoutTemplate(id) {
    return request('POST', `/api/workouts/templates/${id}/clone`);
  },

  // --- Workouts: splits ---
  listWorkoutSplits() {
    return request('GET', '/api/workouts/splits');
  },
  createWorkoutSplit(name) {
    return request('POST', '/api/workouts/splits', { name });
  },
  getWorkoutSplit(id) {
    return request('GET', `/api/workouts/splits/${id}`);
  },
  updateWorkoutSplit(id, patch) {
    return request('PATCH', `/api/workouts/splits/${id}`, patch);
  },
  deleteWorkoutSplit(id) {
    return request('DELETE', `/api/workouts/splits/${id}`);
  },
  activateWorkoutSplit(id) {
    return request('POST', `/api/workouts/splits/${id}/activate`);
  },
  deactivateWorkoutSplit() {
    return request('POST', '/api/workouts/splits/deactivate');
  },
  getActiveWorkoutSplit() {
    return request('GET', '/api/workouts/splits/active');
  },

  // --- Workouts: split days ---
  // NOTE: dayId/exId are globally-unique UUIDs, but the backend still nests
  // these under /splits/{splitId}/days/{dayId}[/exercises/{exId}] to verify
  // ownership via a single join per request -- pass splitId through even
  // though it looks redundant.
  addSplitDay(splitId, payload) {
    return request('POST', `/api/workouts/splits/${splitId}/days`, payload);
  },
  updateSplitDay(splitId, dayId, patch) {
    return request('PATCH', `/api/workouts/splits/${splitId}/days/${dayId}`, patch);
  },
  deleteSplitDay(splitId, dayId) {
    return request('DELETE', `/api/workouts/splits/${splitId}/days/${dayId}`);
  },
  reorderSplitDays(splitId, orderedDayIds) {
    return request('PUT', `/api/workouts/splits/${splitId}/days/reorder`, { orderedDayIds });
  },

  // --- Workouts: split exercises ---
  addSplitExercise(splitId, dayId, payload) {
    return request('POST', `/api/workouts/splits/${splitId}/days/${dayId}/exercises`, payload);
  },
  updateSplitExercise(splitId, dayId, exerciseId, patch) {
    return request('PATCH', `/api/workouts/splits/${splitId}/days/${dayId}/exercises/${exerciseId}`, patch);
  },
  deleteSplitExercise(splitId, dayId, exerciseId) {
    return request('DELETE', `/api/workouts/splits/${splitId}/days/${dayId}/exercises/${exerciseId}`);
  },
  reorderSplitExercises(splitId, dayId, orderedExerciseIds) {
    return request('PUT', `/api/workouts/splits/${splitId}/days/${dayId}/exercises/reorder`, { orderedExerciseIds });
  },

  // --- Workouts: sessions ---
  logWorkoutSession(payload) {
    return request('POST', '/api/workouts/sessions', payload);
  },
  listWorkoutSessions({ splitID, dayID, exercise, limit, offset } = {}) {
    return request('GET', `/api/workouts/sessions${qs({ splitID, dayID, exercise, limit, offset })}`);
  },
  getWorkoutSession(id) {
    return request('GET', `/api/workouts/sessions/${id}`);
  },
  updateWorkoutSession(id, payload) {
    return request('PUT', `/api/workouts/sessions/${id}`, payload);
  },
  deleteWorkoutSession(id) {
    return request('DELETE', `/api/workouts/sessions/${id}`);
  },

  // --- Workouts: exercise history ---
  listExerciseNames() {
    return request('GET', '/api/workouts/exercise-names');
  },
  getExerciseHistory(name) {
    return request('GET', `/api/workouts/exercise-history/${encodeURIComponent(name)}`);
  },
};

export default apiClient;
