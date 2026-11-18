// save.js — localStorage save for Solmara Heat: cash, jobs finished, wanted
// stars and where Mara was standing, so a returning player continues the story.

const SAVE_KEY = 'solmara-heat-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.jobsDone !== 'number') return null;
    return data;
  } catch { return null; }
}

export function storeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, jobsDone: state.jobsDone,
      x: Math.round(state.x), z: Math.round(state.z),
    }));
  } catch { /* private window: the run simply does not persist */ }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
