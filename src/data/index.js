// Derived content indexes used across the app.
import { QUESTIONS, WRITTEN, PAPERS, CHEAT } from './all.js';
import { TOPICS, TOPIC, WEEKS, MOCK_WEEK_QUOTA } from './topics.js';

export { TOPICS, TOPIC, WEEKS, MOCK_WEEK_QUOTA, PAPERS, WRITTEN, CHEAT };

const LETTER_PAPERS = { 'practice-2019': 'abc', 'test1-2024': 'abcd' };
export const optionLabel = (paperId, i) => (LETTER_PAPERS[paperId] ? LETTER_PAPERS[paperId][i] : String(i + 1));

export const PAPER_SHORT = {
  'practice-2019': '2019 practice paper',
  'test1-2025': '2025 Test 1',
  'mock-2019': '2019 mock',
  'test1-2024': '2024 Test 1',
};

// Past-paper MCQs as practice questions (skipping ones whose picture is missing).
export const PAPER_Q = [];
for (const p of PAPERS) {
  for (const s of p.sections || []) {
    if (s.kind !== 'mcq') continue;
    for (const it of s.items || []) {
      if (it.answer == null || !TOPIC[it.topic]) continue;
      PAPER_Q.push({
        id: `${p.id}#${it.n}`,
        week: it.week ?? TOPIC[it.topic].week,
        topic: it.topic,
        type: 'mcq',
        q: it.q,
        options: it.options,
        answer: it.answer,
        explain: it.explain || '',
        src: `${PAPER_SHORT[p.id] || p.title} Q${it.n}`,
        level: 2,
        origin: 'paper',
        paperId: p.id,
        official: !!p.official,
        flag: it.flag,
        note: it.note,
      });
    }
  }
}

export const BANK = QUESTIONS.map((q) => ({ ...q, origin: 'bank' }));
export const POOL = [...BANK, ...PAPER_Q];
export const QBYID = Object.fromEntries(POOL.map((q) => [q.id, q]));

export const isCorrect = (q, pick) => (Array.isArray(q.answer) ? q.answer.includes(pick) : q.answer === pick);
export const correctList = (q) => (Array.isArray(q.answer) ? q.answer : [q.answer]);

const group = (arr, key) => {
  const m = {};
  for (const x of arr) (m[key(x)] ||= []).push(x);
  return m;
};
export const POOL_BY_TOPIC = group(POOL, (q) => q.topic);
export const POOL_BY_WEEK = group(POOL, (q) => q.week);
export const WRITTEN_BY_WEEK = group(WRITTEN, (w) => w.week);
export const WRITTEN_BY_ID = Object.fromEntries(WRITTEN.map((w) => [w.id, w]));
export const CHEAT_BY_TOPIC = group(CHEAT, (b) => b.topic);
export const CHEAT_BY_ID = Object.fromEntries(CHEAT.map((b) => [b.id, b]));
export const TOPICS_BY_WEEK = group(TOPICS, (t) => t.week);
export const WEEK = Object.fromEntries(WEEKS.map((w) => [w.week, w]));

export const paperById = (id) => PAPERS.find((p) => p.id === id);

// Near-duplicate past-paper questions (the lecturer reuses questions across years). A mock never
// includes two from the same group.
const words = (q) => new Set(String(q.q + ' ' + q.options[Array.isArray(q.answer) ? q.answer[0] : q.answer]).replace(/<[^>]+>/g, ' ').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
export const DUP_GROUP = {};
{
  const items = PAPER_Q.map((q) => ({ id: q.id, w: words(q) }));
  let g = 0;
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].w;
      const b = items[j].w;
      let inter = 0;
      for (const x of a) if (b.has(x)) inter++;
      if (inter / (a.size + b.size - inter || 1) > 0.62) {
        const gi = DUP_GROUP[items[i].id] ?? DUP_GROUP[items[j].id] ?? ++g;
        DUP_GROUP[items[i].id] = gi;
        DUP_GROUP[items[j].id] = gi;
      }
    }
}
