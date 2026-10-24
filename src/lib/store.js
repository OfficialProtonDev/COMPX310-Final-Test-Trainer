// Per-viewer progress, kept in this browser only (localStorage, best-effort).
import { useEffect, useState } from 'preact/hooks';

export const STORE_KEY = 'compx310-final-v1';

const DEFAULT = () => ({
  v: 1,
  prefs: { theme: 'light' },
  ans: {}, // qid -> { n, c, ok, last, streak }
  sessions: 0,
  mocks: [], // finished mock tests (newest first)
  active: null, // a mock in progress
  written: {}, // wid -> { text, marks: {i: m}, claude: {...}, at }
  weak: {}, // topic -> true (manual "I'm weak at this")
  papers: {}, // paperId -> { picks: {n: idx}, done, best }
  pinnedBlocks: {}, // cheat block id -> true (from topic pages)
  sheet: { font: 6.5, cols: 4, title: 'COMPX310 Machine Learning · final test notes', mode: 'auto', include: [], exclude: [], weakFirst: true, qa: true },
});

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT();
    const s = JSON.parse(raw);
    const d = DEFAULT();
    return { ...d, ...s, prefs: { ...d.prefs, ...(s.prefs || {}) }, sheet: { ...d.sheet, ...(s.sheet || {}) } };
  } catch (e) {
    return DEFAULT();
  }
}

let state = load();
const subs = new Set();
let saveTimer = null;

function save() {
  saveTimer = null;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    /* storage blocked or full: progress just won't survive a reload */
  }
}
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}
// write a pending save straight away when the page is hidden or closed (switching apps on a phone, reloading)
function flush() {
  if (saveTimer == null) return;
  clearTimeout(saveTimer);
  save();
}
try {
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
} catch (e) {}

export const getState = () => state;

/** update(draft => { ...mutate... }) — draft is a deep copy; the result replaces the state. */
export function update(mutator) {
  const next = structuredClone(state);
  mutator(next);
  state = next;
  persist();
  subs.forEach((f) => f(state));
}

export function useStore(select = (s) => s) {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  return select(state);
}

/** Record one answer to a question (practice, paper or mock). */
export function recordAnswer(draft, qid, correct) {
  const a = draft.ans[qid] || { n: 0, c: 0, ok: false, last: 0, streak: 0 };
  a.n += 1;
  if (correct) a.c += 1;
  a.ok = !!correct;
  a.streak = correct ? (a.streak || 0) + 1 : 0;
  a.last = Date.now();
  draft.ans[qid] = a;
}

export function resetAll() {
  state = DEFAULT();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch (e) {}
  subs.forEach((f) => f(state));
}
