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

async function request(method, path, body) {
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

  if (res.status === 401) {
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
  signup(username, password, displayName) {
    return request('POST', '/api/auth/signup', { username, password, display_name: displayName });
  },
  login(username, password) {
    return request('POST', '/api/auth/login', { username, password });
  },
  logout() {
    return request('POST', '/api/auth/logout');
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
