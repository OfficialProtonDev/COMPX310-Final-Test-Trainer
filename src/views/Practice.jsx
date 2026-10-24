// Practice: one question at a time, smart ordering, missed questions come back until right.
import { useState, useMemo, useCallback } from 'preact/hooks';
import { useStore, update, recordAnswer, getState } from '../lib/store.js';
import { WEEKS, TOPICS_BY_WEEK, POOL, QBYID, TOPIC, isCorrect } from '../data/index.js';
import { pickNext, allTopicStats } from '../lib/stats.js';
import { QuestionCard } from './QuestionCard.jsx';
import { Seg, Btn, Fb } from '../ui.jsx';

const newSession = () => ({ recent: [], requeue: [], count: 0, answered: 0, correct: 0, streak: 0, best: 0 });

export function Practice({ go, init }) {
  const state = useStore();
  const [mode, setMode] = useState(init?.mode || 'smart');
  const [topics, setTopics] = useState(() => new Set(init?.topics || []));
  const [session, setSession] = useState(newSession);
  const [cur, setCur] = useState(null);
  const [pick, setPick] = useState(null);
  const [showPicker, setShowPicker] = useState(!!(init?.topics && init.topics.length === 0));

  const missedCount = useMemo(() => POOL.filter((q) => state.ans[q.id] && !state.ans[q.id].ok).length, [state.ans]);
  const filter = useMemo(
    () => ({
      topics: mode === 'topics' ? topics : null,
      origin: mode === 'papers' ? 'paper' : 'all',
      missedOnly: mode === 'missed',
    }),
    [mode, topics]
  );

  const next = useCallback(
    (sess = session) => {
      const id = pickNext(getState(), filter, sess);
      setCur(id);
      setPick(null);
    },
    [filter, session]
  );

  // first question (and whenever the filter changes)
  const filterKey = mode + ':' + [...topics].sort().join(',');
  const [lastKey, setLastKey] = useState(null);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    const sess = newSession();
    setSession(sess);
    setCur(pickNext(getState(), filter, sess));
    setPick(null);
  }

  const q = cur ? QBYID[cur] : null;

  const onPick = (i) => {
    if (!q || pick != null) return;
    const ok = isCorrect(q, i);
    setPick(i);
    update((d) => recordAnswer(d, q.id, ok));
    setSession((s) => {
      const requeue = s.requeue.filter((r) => r.id !== q.id);
      if (!ok) requeue.push({ id: q.id, after: s.count + 4 + Math.floor(Math.random() * 3) });
      const streak = ok ? s.streak + 1 : 0;
      return { ...s, requeue, recent: [...s.recent, q.id], count: s.count + 1, answered: s.answered + 1, correct: s.correct + (ok ? 1 : 0), streak, best: Math.max(s.best, streak) };
    });
  };

  const onNext = () => next(session);

  const toggleTopic = (k) => {
    const n = new Set(topics);
    n.has(k) ? n.delete(k) : n.add(k);
    setTopics(n);
  };
  const setWeeks = (ws) => {
    const n = new Set();
    ws.forEach((w) => (TOPICS_BY_WEEK[w] || []).forEach((t) => n.add(t.key)));
    setTopics(n);
  };
  const ts = allTopicStats(state);
  const inPool = (k) => ts[k]?.total || 0;

  return (
    <div class="stack">
      <header class="page-head">
        <div class="h-kicker">Practice</div>
        <h1 class="h-title">Multiple-choice practice</h1>
        <p class="h-sub">
          Questions written from the lecture slides plus every past-paper question. Smart mix follows the test’s mix of weeks (about two-thirds from Weeks 7–12)
          and leans towards your weak topics. Anything you get wrong comes back a few questions later, and stays first in line next time until you get it right.
        </p>
      </header>

      <div class="card flat practice-bar">
        <Seg
          label="Practice mode"
          value={mode}
          onChange={(v) => {
            setMode(v);
            if (v === 'topics') setShowPicker(true);
          }}
          options={[
            { value: 'smart', label: 'Smart mix' },
            { value: 'topics', label: 'Choose topics' },
            { value: 'missed', label: `Missed (${missedCount})` },
            { value: 'papers', label: 'Past-paper Qs' },
          ]}
        />
        <div class="sess-stats" aria-live="polite">
          <span>
            <b class="nums">{session.answered}</b> answered
          </span>
          <span>
            <b class="nums">{session.answered ? Math.round((100 * session.correct) / session.answered) : 0}%</b> right
          </span>
          <span>
            streak <b class="nums">{session.streak}</b>
          </span>
          {session.requeue.length > 0 && <span class="chip warn">{session.requeue.length} coming back</span>}
        </div>
      </div>

      {mode === 'topics' && (
        <div class="card stack-sm">
          <div class="row">
            <b>Topics</b>
            <span class="spacer" />
            <Btn size="sm" onClick={() => setWeeks([7, 8, 9, 10, 11, 12])}>
              Weeks 7–12
            </Btn>
            <Btn size="sm" onClick={() => setWeeks([1, 2, 3, 4, 5, 6])}>
              Weeks 1–6
            </Btn>
            <Btn size="sm" kind="ghost" onClick={() => setTopics(new Set())}>
              Clear
            </Btn>
            <Btn size="sm" kind="ghost" onClick={() => setShowPicker(!showPicker)}>
              {showPicker ? 'Hide list' : 'Show list'}
            </Btn>
          </div>
          {showPicker && (
            <div class="topic-picker">
              {WEEKS.map((w) => (
                <div key={w.week} class="tp-week">
                  <div class="tp-wk">
                    W{w.week} <span class="faint">{w.title}</span>
                  </div>
                  <div class="tp-list">
                    {(TOPICS_BY_WEEK[w.week] || []).map((t) => (
                      <label key={t.key} class={`tp-item ${topics.has(t.key) ? 'on' : ''}`}>
                        <input type="checkbox" checked={topics.has(t.key)} onChange={() => toggleTopic(t.key)} />
                        <span>{t.name}</span>
                        <span class="faint nums">{inPool(t.key)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {topics.size === 0 && <p class="small muted">No topics ticked, so questions come from everything.</p>}
          {topics.size > 0 && !showPicker && (
            <p class="small muted">
              Practising {topics.size} topic{topics.size === 1 ? '' : 's'}: {[...topics].map((k) => TOPIC[k]?.name).filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      {q ? (
        <QuestionCard key={q.id + ':' + session.count} q={q} pick={pick} onPick={onPick} onNext={onNext} go={go} />
      ) : (
        <div class="empty">
          {mode === 'missed' ? (
            <>Nothing to fix: you've no outstanding misses. Try Smart mix or a mock test.</>
          ) : POOL.length === 0 ? (
            <>The question bank is still loading.</>
          ) : (
            <>No questions match. Tick some topics or switch mode.</>
          )}
        </div>
      )}

      {session.answered >= 10 && session.answered % 10 === 0 && pick != null && (
        <Fb kind="info">
          {session.answered} done this session at {Math.round((100 * session.correct) / session.answered)}%. Best streak {session.best}.
          {session.correct / session.answered < 0.7 ? ' Open the week pages for the topics you are missing, then come back.' : ' Good pace — try a timed mock when ready.'}
        </Fb>
      )}
    </div>
  );
}
