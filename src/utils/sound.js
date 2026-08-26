// Lightweight synthesized "System" sound effects via the Web Audio API - no
// external audio files/assets needed. User-toggleable (defaults to on),
// preference persisted in localStorage.
const STORAGE_KEY = 'aura-sound-enabled';
let audioCtx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function setSoundEnabled(enabled) {
  window.localStorage.setItem(STORAGE_KEY, String(enabled));
}

function tone(ctx, freq, startTime, duration, { type = 'sine', gain = 0.08 } = {}) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function play(fn) {
  if (!isSoundEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    fn(ctx);
  } catch {
    // Sound is a nice-to-have; never let synthesis fail the interaction.
  }
}

// Short soft "blip" - a habit/daily-quest gets checked off.
export function playQuestComplete() {
  play((ctx) => {
    const t = ctx.currentTime;
    tone(ctx, 660, t, 0.09, { type: 'triangle', gain: 0.07 });
    tone(ctx, 880, t + 0.07, 0.12, { type: 'triangle', gain: 0.06 });
  });
}

// Brighter three-note rise - level up.
export function playLevelUp() {
  play((ctx) => {
    const t = ctx.currentTime;
    tone(ctx, 523.25, t, 0.14, { type: 'sine', gain: 0.09 });
    tone(ctx, 659.25, t + 0.12, 0.14, { type: 'sine', gain: 0.09 });
    tone(ctx, 783.99, t + 0.24, 0.3, { type: 'sine', gain: 0.1 });
  });
}

// Single soft tone for a system message appearing - one pitch for success,
// a lower/rougher one for an error.
export function playSystemMessage(isError = false) {
  play((ctx) => {
    const t = ctx.currentTime;
    if (isError) {
      tone(ctx, 220, t, 0.14, { type: 'sawtooth', gain: 0.045 });
    } else {
      tone(ctx, 740, t, 0.08, { type: 'sine', gain: 0.05 });
    }
  });
}
