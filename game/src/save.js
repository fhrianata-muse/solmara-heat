// save.js — Mara's progress in localStorage: cash, jobs finished, and the
// corner she was standing on, so a returning player picks the story up where
// it stopped. The key and shape are v1's, so old saves keep loading. Every
// access is wrapped: a private window or a blocked store simply means the
// run does not persist, never that the game breaks.

const STORAGE_KEY = 'solmara-heat-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.jobsDone !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function storeSave({ cash, jobsDone, x, z }) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cash, jobsDone, x: Math.round(x), z: Math.round(z),
    }));
  } catch { /* storage unavailable: play on, unsaved */ }
}

export function clearSave() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
