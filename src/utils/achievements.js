// Client-derived "Achievements" (Milestones) badges. Everything here is
// recomputed live from real fields on every call - there is no
// `user_achievements` table, so there is no persisted "unlocked on" date.
// A badge reflects current standing, not a permanent trophy: e.g. a streak
// reset un-earns a streak badge. See the redesign plan for why persistence
// was scoped out (no backend table exists for it).
import { apiClient } from '../api/apiClient.js';
import { getRankForXP } from './rank.js';

const RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
const LIFETIME_LOOKBACK_YEARS = 3;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yearsAgoStr(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lifetime sum of completed_habit_ids across all daily-progress entries.
// Windowed to a 3-year lookback rather than truly unbounded - listProgress
// has no pagination, so this keeps the single request reasonably sized.
export async function fetchLifetimeHabitCompletions() {
  const data = await apiClient.listProgress({ from: yearsAgoStr(LIFETIME_LOOKBACK_YEARS), to: todayStr() });
  const entries = data?.entries ?? [];
  return entries.reduce((sum, e) => sum + (Array.isArray(e.completed_habit_ids) ? e.completed_habit_ids.length : 0), 0);
}

// The sessions list endpoint returns `total` on every page, so a single
// limit=1 request is enough to get the lifetime count without fetching data.
export async function fetchLifetimeWorkoutSessionCount() {
  const data = await apiClient.listWorkoutSessions({ limit: 1, offset: 0 });
  return data?.total ?? 0;
}

const STREAK_MILESTONES = [
  { days: 7, tier: 1 },
  { days: 30, tier: 2 },
  { days: 100, tier: 3 },
  { days: 365, tier: 4 },
];

const LEVEL_MILESTONES = [
  { level: 5, tier: 1 },
  { level: 10, tier: 2 },
  { level: 20, tier: 3 },
  { level: 35, tier: 3 },
  { level: 50, tier: 4 },
];

const RANK_MILESTONES = [
  { rank: 'D', tier: 1 },
  { rank: 'C', tier: 2 },
  { rank: 'B', tier: 3 },
  { rank: 'A', tier: 3 },
  { rank: 'S', tier: 4 },
];

export async function buildAchievements(user) {
  const [habitCompletions, sessionCount] = await Promise.all([
    fetchLifetimeHabitCompletions(),
    fetchLifetimeWorkoutSessionCount(),
  ]);

  const streak = user?.current_streak ?? 0;
  const level = user?.level ?? 1;
  const rankIndex = RANK_ORDER.indexOf(getRankForXP(user?.xp ?? 0));

  const achievements = [
    ...STREAK_MILESTONES.map(({ days, tier }) => ({
      icon: 'fa-fire',
      tier,
      name: `${days}-Day Streak`,
      description: `Maintain a ${days}-day habit streak.`,
      earned: streak >= days,
    })),
    ...LEVEL_MILESTONES.map(({ level: lvl, tier }) => ({
      icon: 'fa-star',
      tier,
      name: `Level ${lvl}`,
      description: `Reach character level ${lvl}.`,
      earned: level >= lvl,
    })),
    ...RANK_MILESTONES.map(({ rank, tier }) => ({
      icon: 'fa-ranking-star',
      tier,
      name: `${rank}-Rank Hunter`,
      description: `Reach ${rank}-Rank standing.`,
      earned: rankIndex >= RANK_ORDER.indexOf(rank),
    })),
    {
      icon: 'fa-circle-check',
      tier: 2,
      name: 'Century of Habits',
      description: 'Complete 100 lifetime habit check-ins.',
      earned: habitCompletions >= 100,
    },
    {
      icon: 'fa-dumbbell',
      tier: 2,
      name: 'Iron Body',
      description: 'Log 50 lifetime workout sessions.',
      earned: sessionCount >= 50,
    },
  ];

  return achievements;
}
