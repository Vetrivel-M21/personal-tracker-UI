// Applies the already-existing theme CSS systems (style.css has full
// body.light-theme/cyberpunk-theme/nordic-theme/emerald-theme rulesets, plus
// .theme-shop-card/.theme-preview-swatch for a picker UI, but nothing ever
// applied any of it) - same persisted-preference pattern as utils/sound.js.
const STORAGE_KEY = 'aura-theme';

export const THEMES = [
  { id: 'dark', name: 'Dark', className: null, swatch: ['#060913', '#22d3ee', '#a855f7'] },
  { id: 'light', name: 'Light', className: 'light-theme', swatch: ['#f8fafc', '#22d3ee', '#a855f7'] },
  { id: 'cyberpunk', name: 'Cyberpunk', className: 'cyberpunk-theme', swatch: ['#06060c', '#06b6d4', '#ec4899'] },
  { id: 'nordic', name: 'Nordic', className: 'nordic-theme', swatch: ['#0f172a', '#38bdf8', '#818cf8'] },
  { id: 'emerald', name: 'Emerald', className: 'emerald-theme', swatch: ['#022c22', '#10b981', '#f59e0b'] },
];

const THEME_CLASSES = THEMES.map((t) => t.className).filter(Boolean);

export function getTheme() {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.some((t) => t.id === stored) ? stored : 'dark';
}

function applyTheme(id) {
  document.body.classList.remove(...THEME_CLASSES);
  const theme = THEMES.find((t) => t.id === id);
  if (theme?.className) document.body.classList.add(theme.className);
}

export function setTheme(id) {
  window.localStorage.setItem(STORAGE_KEY, id);
  applyTheme(id);
}

// Called once at startup, before anything renders, so there's no flash of
// the wrong theme.
export function applyStoredTheme() {
  applyTheme(getTheme());
}
