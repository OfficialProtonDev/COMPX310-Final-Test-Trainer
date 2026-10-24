// Progress maths: per-topic accuracy, weakness, predicted score, question picking and mock assembly.
import { TOPICS, WEEKS, MOCK_WEEK_QUOTA, POOL, POOL_BY_TOPIC, POOL_BY_WEEK, WRITTEN, QBYID, DUP_GROUP } from '../data/index.js';
import { shuffle } from './svg.js';

const PRIOR = 0.6; // assumed accuracy on a topic with no evidence

export function topicStat(state, key) {
  const qs = POOL_BY_TOPIC[key] || [];
  let attempted = 0;
  let ok = 0;
  let n = 0;
  let c = 0;
  for (const q of qs) {
    const a = state.ans[q.id];
    if (!a) continue;
    attempted++;
    if (a.ok) ok++;
    n += a.n;
    c += a.c;
  }
  // Blend "currently right" (last answer) with all-time accuracy, then smooth towards the prior.
  const cur = attempted ? ok / attempted : null;
  const all = n ? c / n : null;
  const raw = cur == null ? null : 0.6 * cur + 0.4 * all;
  const acc = attempted ? (raw * attempted + PRIOR * 2) / (attempted + 2) : PRIOR;
  const flagged = !!state.weak[key];
  let weakness = attempted >= 2 ? 1 - acc : 0.45;
  if (flagged) weakness = Math.max(weakness, 0.75);
  return { key, total: qs.length, attempted, ok, raw, acc, weakness, flagged, evidence: attempted };
}

export function allTopicStats(state) {
  return Object.fromEntries(TOPICS.map((t) => [t.key, topicStat(state, t.key)]));
}

export function weekStat(state, week, ts = allTopicStats(state)) {
  const topics = TOPICS.filter((t) => t.week === week).map((t) => ts[t.key]);
  const total = topics.reduce((s, t) => s + t.total, 0);
  const attempted = topics.reduce((s, t) => s + t.attempted, 0);
  const ok = topics.reduce((s, t) => s + t.ok, 0);
  const w = topics.reduce((s, t) => s + Math.max(1, t.attempted), 0);
  const acc = topics.reduce((s, t) => s + t.acc * Math.max(1, t.attempted), 0) / (w || 1);
  return { week, total, attempted, ok, acc, raw: attempted ? ok / attempted : null };
}

/** Expected marks out of 40 for the MCQ section, from per-week accuracy and the test's week quota. */
export function predictedMcq(state) {
  const ts = allTopicStats(state);
  let exp = 0;
  let evidence = 0;
  for (const w of WEEKS) {
    const s = weekStat(state, w.week, ts);
    exp += MOCK_WEEK_QUOTA[w.week] * s.acc;
    evidence += s.attempted;
  }
  return { exp, evidence };
}

/**
 * Pick the next practice question.
 * filter: { topics?: Set, origin?: 'bank'|'paper'|'all', missedOnly?: bool }
 * session: { recent: [ids served this session, in order], requeue: [{id, after}], count }
 * 1. A question missed this session comes back once its turn is due (4–6 questions later).
 * 2. Otherwise pick a week so that, over a session, weeks come up in the test's proportions
 *    (quota / (served this session + 1), nudged towards weak weeks), then the best question in that week:
 *    earlier misses first, then unseen (past-paper ones slightly preferred), then ones you know, spreading topics.
 */
export function pickNext(state, filter, session) {
  const ts = allTopicStats(state);
  let pool = POOL;
  if (filter.topics && filter.topics.size) pool = pool.filter((q) => filter.topics.has(q.topic));
  if (filter.origin === 'bank') pool = pool.filter((q) => q.origin === 'bank');
  if (filter.origin === 'paper') pool = pool.filter((q) => q.origin === 'paper');
  if (filter.missedOnly) pool = pool.filter((q) => state.ans[q.id] && !state.ans[q.id].ok);
  const inPool = new Set(pool.map((q) => q.id));
  const last3 = new Set(session.recent.slice(-3));
  const due = session.requeue.find((r) => r.after <= session.count && !last3.has(r.id) && (inPool.has(r.id) || !filter.missedOnly));
  if (due) return due.id;
  if (!pool.length) return null;
  // never repeat one of the last few (the window shrinks for small pools, so they cycle instead of repeating)
  const recent = new Set(session.recent.slice(-Math.min(12, pool.length - 1)));
  const fresh = pool.filter((q) => !recent.has(q.id));
  if (!fresh.length) return pool[Math.floor(Math.random() * pool.length)].id;

  // choose the week
  const served = {};
  for (const id of session.recent) {
    const w = QBYID[id]?.week;
    if (w) served[w] = (served[w] || 0) + 1;
  }
  const byWeek = {};
  for (const q of fresh) (byWeek[q.week] ||= []).push(q);
  let bestW = null;
  let bestP = -Infinity;
  for (const w of Object.keys(byWeek)) {
    const topics = TOPICS.filter((t) => t.week === +w);
    const weak = topics.reduce((s, t) => s + ts[t.key].weakness, 0) / (topics.length || 1);
    const p = ((MOCK_WEEK_QUOTA[w] || 1) * (0.7 + 0.6 * weak)) / ((served[w] || 0) + 1) * (0.85 + 0.3 * Math.random());
    if (p > bestP) {
      bestP = p;
      bestW = w;
    }
  }
  // choose the question inside that week: an earlier miss (60% of the time), else an unseen one (past-paper
  // or written-from-slides, close to evenly), else the one you've got right least often
  const cands = byWeek[bestW];
  const missedBefore = cands.filter((q) => state.ans[q.id] && !state.ans[q.id].ok);
  const unseen = cands.filter((q) => !state.ans[q.id]);
  let group = cands;
  if (missedBefore.length && (filter.missedOnly || !unseen.length || Math.random() < 0.6)) group = missedBefore;
  else if (unseen.length) {
    const up = unseen.filter((q) => q.origin === 'paper');
    const ub = unseen.filter((q) => q.origin !== 'paper');
    group = up.length && ub.length ? (Math.random() < 0.45 ? up : ub) : unseen;
  }
  const lastTopics = session.recent.slice(-2).map((id) => QBYID[id]?.topic);
  return best(group, (q) => {
    const a = state.ans[q.id];
    const t = ts[q.topic];
    let sc = 20 * t.weakness;
    if (a && a.ok) sc -= Math.min(12, a.streak * 3);
    if (lastTopics[1] === q.topic) sc -= 8;
    if (lastTopics[0] === q.topic && lastTopics[1] === q.topic) sc -= 25;
    return sc + Math.random() * 16;
  }).id;
}

function best(arr, score) {
  let b = arr[0];
  let bs = -Infinity;
  for (const x of arr) {
    const s = score(x);
    if (s > bs) {
      bs = s;
      b = x;
    }
  }
  return b;
}

/**
 * Assemble a mock test: per-week quota (scaled to n), spread across topics, preferring unseen and weak.
 * opts: { n = 40, written = 2, papers = true }
 */
export function buildMock(state, { n = 40, written = 2, papers = true } = {}) {
  const ts = allTopicStats(state);
  const scaleQ = n / 40;
  const picks = [];
  const quotas = {};
  let assigned = 0;
  for (const w of WEEKS) {
    quotas[w.week] = Math.round(MOCK_WEEK_QUOTA[w.week] * scaleQ);
    assigned += quotas[w.week];
  }
  // fix rounding drift by adjusting the heaviest second-half weeks
  const order = [10, 7, 8, 9, 11, 12, 6, 3, 4, 2, 5, 1];
  let i = 0;
  while (assigned !== n && i < 100) {
    const w = order[i % order.length];
    if (assigned < n) {
      quotas[w]++;
      assigned++;
    } else if (quotas[w] > 0) {
      quotas[w]--;
      assigned--;
    }
    i++;
  }
  const usedGroups = new Set();
  for (const w of WEEKS) {
    let cands = (POOL_BY_WEEK[w.week] || []).filter((q) => papers || q.origin === 'bank');
    const score = (q) => {
      const a = state.ans[q.id];
      const t = ts[q.topic];
      let s = Math.random() * 10;
      if (!a) s += 30;
      else if (!a.ok) s += 22;
      else s -= 10 * Math.min(3, a.streak);
      s += 12 * t.weakness;
      if (q.level === 3) s -= 4;
      if (q.origin === 'paper') s += 3;
      return s;
    };
    cands = cands.map((q) => ({ q, s: score(q) })).sort((a, b) => b.s - a.s);
    // round-robin over topics so one topic doesn't eat the week's quota
    const byTopic = {};
    cands.forEach(({ q }) => (byTopic[q.topic] ||= []).push(q));
    const topicOrder = shuffle(Object.keys(byTopic));
    const chosen = [];
    while (chosen.length < quotas[w.week] && topicOrder.some((k) => byTopic[k].length)) {
      for (const k of topicOrder) {
        if (chosen.length >= quotas[w.week]) break;
        const q = byTopic[k].shift();
        if (!q) continue;
        const g = DUP_GROUP[q.id];
        if (g && usedGroups.has(g)) continue;
        if (g) usedGroups.add(g);
        chosen.push(q.id);
      }
    }
    picks.push(...chosen);
  }
  // If a week has too few questions to meet its quota, top up from the same half of the course.
  if (picks.length < n) {
    const have = new Set(picks);
    const lateShort = WEEKS.filter((w) => w.week >= 7).reduce((s, w) => s + Math.max(0, quotas[w.week] - picks.filter((id) => QBYID[id]?.week === w.week).length), 0);
    const rest = shuffle(POOL.filter((q) => !have.has(q.id) && (papers || q.origin === 'bank')));
    rest.sort((a, b) => (lateShort > 0 ? (b.week >= 7) - (a.week >= 7) : 0) || (!!state.ans[a.id]) - (!!state.ans[b.id]));
    for (const q of rest) {
      if (picks.length >= n) break;
      picks.push(q.id);
    }
  }
  const mcq = shuffle(picks);
  // Written: one explanation and one worked problem, mostly from Weeks 7-12.
  const wr = [];
  if (written > 0 && WRITTEN.length) {
    const want = ['explain', 'worked'];
    for (const kind of want.slice(0, written)) {
      const pool = WRITTEN.filter((x) => x.kind === kind && !wr.includes(x.id));
      const late = pool.filter((x) => x.week >= 7);
      const src = late.length && Math.random() < 0.75 ? late : pool;
      const unseen = src.filter((x) => !state.written[x.id]?.text);
      const from = unseen.length ? unseen : src;
      if (from.length) wr.push(from[Math.floor(Math.random() * from.length)].id);
    }
  }
  return { mcq, written: wr };
}

export function fmtDuration(ms) {
  if (ms <= 0) return 'now';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${mm} min`;
  return `${mm} min`;
}

