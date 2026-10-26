// Past papers: the lecturer's tests with official keys, and the 2019 practice paper with worked answers.
import { useState } from 'preact/hooks';
import { useStore, update, recordAnswer } from '../lib/store.js';
import { PAPERS, TOPIC, PAPER_SHORT, isCorrect, correctList, optionLabel, QBYID } from '../data/index.js';
import { Html, Btn, Seg, Chip, Fb } from '../ui.jsx';
import { FlagChip } from './QuestionCard.jsx';
import { WrittenMarker } from './WrittenMarker.jsx';
import { WIDGET } from '../widgets/index.js';
import { SafeWidget } from './SafeWidget.jsx';

const mcqItems = (p) => (p.sections || []).filter((s) => s.kind === 'mcq').flatMap((s) => s.items || []);
const fmtLabelShort = (f) => (f === 'full' ? 'Full test' : f === 'mcq' ? 'Multiple choice only' : f === 'quick' ? 'Quick 20' : f && f.startsWith('paper:') ? `${PAPER_SHORT[f.slice(6)] || 'Past paper'} (timed)` : 'Mock');
const writtenItems = (p) => (p.sections || []).filter((s) => s.kind !== 'mcq').flatMap((s) => s.items || []);

const WHY = {
  'test2-2023': 'The 2023 version of this very test: 36 multiple choice + 2 written (7 marks) in 50 minutes, across the whole course with most questions on the second half. No official key — answers are ours.',
  'practice-2019': 'Posted by the lecturer this week as the practice test for the final. Best guide to which second-half ideas get asked.',
  'test1-2025': 'Last year’s Test 1 with the lecturer’s circled answers — exactly the real format (40 + 2, 50 min).',
  'mock-2019': '2019 mock with circled answers. 10 of its 26 questions came back reworded in the 2025 Test 1.',
  'test1-2024': '2024 Test 1 (Moodle quiz), Weeks 1–6 heavy. No official key — answers are ours.',
};

export function Papers({ go }) {
  const st = useStore((s) => s.papers);
  return (
    <div class="stack">
      <header class="page-head">
        <div class="h-kicker">Past papers</div>
        <h1 class="h-title">Past papers</h1>
        <p class="h-sub">
          The lecturer reuses questions: 10 of the 26 questions on the 2019 mock reappeared, reworded, in the 2025 Test 1. Work through these. Every past-paper question
          is also mixed into Practice and the mock tests.
        </p>
      </header>
      <div class="paper-list">
        {PAPERS.map((p) => {
          const items = mcqItems(p).filter((it) => it.answer != null);
          const picks = st[p.id]?.picks || {};
          const done = items.filter((it) => picks[it.n] != null);
          const right = done.filter((it) => isCorrect(it, picks[it.n]));
          return (
            <button type="button" key={p.id} class="card paper-card" onClick={() => go({ v: 'paper', p: p.id })}>
              <div class="row">
                <b class="paper-title">{p.title}</b>
                {p.official ? <Chip kind="good">Official answers</Chip> : <Chip kind="warn">Our worked answers</Chip>}
              </div>
              <div class="small muted">{p.format}</div>
              <p class="small">{WHY[p.id] || p.subtitle}</p>
              <div class="row small">
                <span class="nums">
                  {done.length}/{items.length} answered
                </span>
                {done.length > 0 && <span class="nums">· {Math.round((100 * right.length) / done.length)}% right</span>}
                <span class="spacer" />
                <span class="linkish">Open →</span>
              </div>
            </button>
          );
        })}
        {PAPERS.length === 0 && <div class="empty">Papers are loading.</div>}
      </div>
    </div>
  );
}

export function PaperView({ go, id }) {
  const p = PAPERS.find((x) => x.id === id);
  const st = useStore((s) => s.papers[id] || { picks: {}, written: {} });
  const live = useStore((s) => s.active);
  const [mode, setMode] = useState('practice');
  const [ask, setAsk] = useState(null); // 'replace' | 'reset'
  if (!p) return <div class="empty">Paper not found.</div>;
  const mcq = mcqItems(p);
  const wr = writtenItems(p);
  const picks = st.picks || {};
  const answered = mcq.filter((it) => it.answer != null && picks[it.n] != null);
  const right = answered.filter((it) => isCorrect(it, picks[it.n]));

  const choose = (it, k) => {
    if (picks[it.n] != null || mode !== 'practice') return;
    update((d) => {
      d.papers[id] ||= { picks: {}, written: {} };
      d.papers[id].picks[it.n] = k;
      const qid = `${id}#${it.n}`;
      if (QBYID[qid]) recordAnswer(d, qid, isCorrect(it, k));
    });
  };
  // Reset clears the multiple-choice picks only; written answers stay.
  const resetPaper = () =>
    update((d) => {
      d.papers[id] ||= { picks: {}, written: {} };
      d.papers[id].picks = {};
    });
  const liveLeft = live && !live.done ? live.startedAt + live.minutes * 60000 - Date.now() : 0;
  const sitTimed = () =>
    update((d) => {
      const ids = mcq.filter((it) => QBYID[`${id}#${it.n}`]).map((it) => `${id}#${it.n}`);
      d.active = { id: 'm' + Date.now(), format: 'paper:' + id, startedAt: Date.now(), minutes: ids.length, mcq: ids, written: [], picks: {}, flags: {}, texts: {} };
    });

  return (
    <div class="stack">
      <div class="row">
        <Btn kind="ghost" size="sm" onClick={() => go({ v: 'papers' })}>
          ← All papers
        </Btn>
      </div>
      <header class="page-head">
        <div class="h-kicker">
          {p.official ? 'Official answers' : 'Our worked answers'} · {p.format}
        </div>
        <h1 class="h-title">{p.title}</h1>
        {p.subtitle && <p class="h-sub">{p.subtitle}</p>}
      </header>
      {p.note && <Html as="div" class="card flat rich paper-note" html={p.note} />}
      <div class="card flat row">
        <Seg
          label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'practice', label: 'Answer as I go' },
            { value: 'answers', label: 'Show all answers' },
          ]}
        />
        <span class="small nums">
          {answered.length}/{mcq.filter((it) => it.answer != null).length} answered{answered.length ? ` · ${right.length} right` : ''}
        </span>
        <span class="spacer" />
        <Btn
          size="sm"
          onClick={() => {
            if (liveLeft > 0) return setAsk('replace');
            sitTimed();
            go({ v: 'mock' });
          }}
        >
          Sit the multiple choice timed
        </Btn>
        {answered.length > 0 && (
          <Btn size="sm" kind="ghost" onClick={() => setAsk('reset')}>
            Reset answers
          </Btn>
        )}
      </div>
      {ask === 'replace' && (
        <div class="card confirm" role="alertdialog" aria-label="A mock is in progress">
          <b>You have a mock in progress</b>
          <span class="muted">
            {fmtLabelShort(live.format)}, {Math.max(1, Math.round(liveLeft / 60000))} min left. Starting this paper would discard it.
          </span>
          <div class="row">
            <Btn kind="primary" onClick={() => go({ v: 'mock' })}>
              Resume my mock
            </Btn>
            <Btn
              onClick={() => {
                setAsk(null);
                sitTimed();
                go({ v: 'mock' });
              }}
            >
              Discard it and start this paper
            </Btn>
            <Btn kind="ghost" onClick={() => setAsk(null)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}
      {ask === 'reset' && (
        <div class="card confirm" role="alertdialog" aria-label="Reset your answers?">
          <b>Clear your multiple-choice answers on this paper?</b>
          <span class="muted">Your written answers and their marks stay. Your practice statistics aren’t changed.</span>
          <div class="row">
            <Btn
              kind="primary"
              onClick={() => {
                resetPaper();
                setAsk(null);
              }}
            >
              Clear my answers
            </Btn>
            <Btn kind="ghost" onClick={() => setAsk(null)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      <div class="card stack">
        {mcq.map((it) => {
          const pick = picks[it.n];
          const reveal = mode === 'answers' || pick != null || it.answer == null;
          const right = it.answer == null ? [] : correctList(it);
          const t = TOPIC[it.topic];
          return (
            <div class="qblock" key={it.n} id={`p-${it.n}`}>
              <div class="row">
                <span class="qnum">Q{it.n}</span>
                {t && (
                  <button type="button" class="chip src linkchip" onClick={() => go({ v: 'week', p: t.week })}>
                    W{t.week} · {t.name}
                  </button>
                )}
                <FlagChip flag={it.flag} note={it.note} />
              </div>
              <Html as="div" class="qtext" html={it.q} />
              <div class="opts compact">
                {it.options.map((o, k) => {
                  let cls = 'opt';
                  if (reveal && right.includes(k)) cls += ' right';
                  else if (pick === k) cls += ' wrong';
                  return (
                    <button type="button" key={k} class={cls} disabled={reveal || mode !== 'practice'} onClick={() => choose(it, k)}>
                      <span class="key">{optionLabel(id, k)}</span>
                      <Html html={o} />
                      {pick === k && <span class="opt-tag">{right.includes(k) ? 'your answer ✓' : 'your answer'}</span>}
                    </button>
                  );
                })}
              </div>
              {reveal && (
                <div class="small stack-sm">
                  {it.explain && <Html as="div" html={it.explain} />}
                  {it.note && <div class="muted">Note: {it.note}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {wr.length > 0 && (
        <div class="stack">
          <h2 class="h2">Written questions</h2>
          {wr.map((it) => (
            <PaperWritten key={it.n} paperId={id} it={it} saved={(st.written || {})[it.n]} />
          ))}
        </div>
      )}
    </div>
  );
}

function PaperWritten({ paperId, it, saved = {} }) {
  const [show, setShow] = useState(false);
  const W = it.widget === 'conv-exam' ? WIDGET['conv-pool'] : WIDGET[it.widget];
  const t = TOPIC[it.topic];
  const save = (patch) =>
    update((d) => {
      d.papers[paperId] ||= { picks: {}, written: {} };
      d.papers[paperId].written ||= {};
      d.papers[paperId].written[it.n] = { ...(d.papers[paperId].written[it.n] || {}), ...patch };
    });
  const w = { ...it, marks: it.marks || 5, points: it.points || [], model: it.model || '' };
  return (
    <div class="card stack">
      <div class="mq-head">
        <span class="qnum">Q{it.n}</span>
        <Chip>{w.marks} marks</Chip>
        {t && (
          <Chip kind="blue">
            W{t.week} · {t.name}
          </Chip>
        )}
      </div>
      <Html as="div" class="qtext rich" html={it.prompt} />
      {W && (
        <div class="embed">
          <SafeWidget w={W} props={it.widget === 'conv-exam' ? { preset: 'exam2019', quiz: true } : W.props || {}} />
        </div>
      )}
      {!W && it.widget && <Fb kind="hint">The interactive version of this question is still being built.</Fb>}
      <textarea
        class="input"
        rows={6}
        placeholder="Optional: write your answer, then mark it."
        aria-label={`Your answer to question ${it.n}`}
        value={saved.text || ''}
        onInput={(e) => save({ text: e.currentTarget.value })}
      />
      {w.points.length > 0 ? (
        <WrittenMarker w={w} text={saved.text || ''} marks={saved.marks || {}} onChange={(marks) => save({ marks })} />
      ) : (
        <div>
          <Btn size="sm" onClick={() => setShow(!show)}>
            {show ? 'Hide model answer' : 'Show model answer'}
          </Btn>
          {show && <Html as="div" class="rich model" html={it.model} />}
        </div>
      )}
      {it.note && <div class="small muted">Note: {it.note}</div>}
    </div>
  );
}

export { PAPER_SHORT };
