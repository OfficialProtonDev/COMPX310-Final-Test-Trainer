// Timed mock tests in the real format: 40 multiple choice + 2 written, 50 minutes.
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { useStore, update, recordAnswer } from '../lib/store.js';
import { QBYID, WRITTEN_BY_ID, TOPIC, WEEKS, isCorrect, correctList, optionLabel, PAPER_SHORT } from '../data/index.js';
import { buildMock } from '../lib/stats.js';
import { Html, Btn, Fb, Seg, Chip } from '../ui.jsx';
import { WrittenMarker, bestMark } from './WrittenMarker.jsx';
import { FlagChip } from './QuestionCard.jsx';
import { fmt } from '../lib/svg.js';

// a blank written answer is worth 0 without being marked
const writtenScore = (w) => ((w.text || '').trim() ? bestMark(w.marks, w.text) : 0);
const fmtLabel = (f) => (FORMATS[f] ? FORMATS[f].label : f && f.startsWith('paper:') ? `${PAPER_SHORT[f.slice(6)] || 'Past paper'} (multiple choice)` : f);
const FORMATS = {
  full: { label: 'Full test', desc: '40 multiple choice + 2 written · 50 min', n: 40, written: 2, minutes: 50 },
  mcq: { label: 'Multiple choice only', desc: '40 questions · 40 min', n: 40, written: 0, minutes: 40 },
  quick: { label: 'Quick 20', desc: '20 questions · 20 min', n: 20, written: 0, minutes: 20 },
};

export function Mock({ go }) {
  const active = useStore((s) => s.active);
  const [resultId, setResultId] = useState(null);
  if (active && !active.done) return <MockRun active={active} onDone={(id) => setResultId(id)} />;
  if (resultId) return <MockResult id={resultId} go={go} onBack={() => setResultId(null)} />;
  return <MockSetup go={go} onOpen={setResultId} />;
}

function MockSetup({ go, onOpen }) {
  const mocks = useStore((s) => s.mocks);
  const [fmtKey, setFmt] = useState('full');
  const [papers, setPapers] = useState(true);
  const start = () => {
    const f = FORMATS[fmtKey];
    update((d) => {
      const m = buildMock(d, { n: f.n, written: f.written, papers });
      d.active = { id: 'm' + Date.now(), format: fmtKey, startedAt: Date.now(), minutes: f.minutes, mcq: m.mcq, written: m.written, picks: {}, flags: {}, texts: {} };
    });
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  };
  return (
    <div class="stack">
      <header class="page-head">
        <div class="h-kicker">Mock test</div>
        <h1 class="h-title">Sit a mock under test conditions</h1>
        <p class="h-sub">
          Same shape as the real thing: 40 multiple-choice questions, about a third from Weeks 1–6 and two-thirds from Weeks 7–12, then two 5-mark written
          answers (one explanation, one worked problem). Nothing is marked until you submit, and Ask Claude is paused while the clock runs.
        </p>
      </header>
      <div class="card stack">
        <div class="stack-sm">
          <div class="label">Format</div>
          <div class="fmt-grid">
            {Object.entries(FORMATS).map(([k, f]) => (
              <button type="button" key={k} class={`opt ${fmtKey === k ? 'picked' : ''}`} onClick={() => setFmt(k)} aria-pressed={fmtKey === k}>
                <span class="key">{fmtKey === k ? '●' : '○'}</span>
                <span>
                  <b>{f.label}</b>
                  <br />
                  <span class="small muted">{f.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <label class="check-row">
          <input type="checkbox" checked={papers} onChange={(e) => setPapers(e.currentTarget.checked)} />
          <span>
            Mix in past-paper questions{' '}
            <span class="small muted">
              — recommended: 10 of the 26 questions on the 2019 mock came back reworded in the 2025 Test 1. They keep their original options (the 2019 practice
              paper used three).
            </span>
          </span>
        </label>
        <div class="row">
          <Btn kind="primary" onClick={start}>
            Start the {FORMATS[fmtKey].minutes}-minute clock
          </Btn>
          <span class="small faint">Unseen and weak-topic questions are chosen first.</span>
        </div>
      </div>
      {mocks.length > 0 && (
        <div class="card stack-sm">
          <h2 class="h2">Your mock results</h2>
          <div class="table-scroll">
          <table class="plain">
            <thead>
              <tr>
                <th>When</th>
                <th>Format</th>
                <th>Multiple choice</th>
                <th>Written</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mocks.map((m) => {
                const wr = (m.written || []).map(writtenScore);
                const wrKnown = wr.filter((x) => x != null);
                return (
                  <tr key={m.id}>
                    <td class="nums">{new Date(m.at).toLocaleString('en-NZ', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                    <td>{fmtLabel(m.format)}</td>
                    <td class="nums">
                      <b>
                        {m.score} / {m.total}
                      </b>{' '}
                      <span class="faint">({Math.round((100 * m.score) / Math.max(1, m.total))}%)</span>
                    </td>
                    <td class="nums">{m.written?.length ? (wrKnown.length ? `${fmt(wrKnown.reduce((a, b) => a + b, 0), 1)} / ${5 * m.written.length}` : 'not marked') : '—'}</td>
                    <td>
                      <Btn size="sm" onClick={() => onOpen(m.id)}>
                        Review
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

function useTick(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function finish(active, auto) {
  let id = active.id;
  update((d) => {
    const a = d.active;
    if (!a) return;
    const items = a.mcq.map((qid) => {
      const q = QBYID[qid];
      const pick = a.picks[qid];
      const ok = q && pick != null && isCorrect(q, pick);
      // a blank scores 0 here but isn't a practice attempt (it says nothing about what you know)
      if (q && pick != null) recordAnswer(d, qid, ok);
      return { id: qid, pick: pick ?? null, ok: !!ok };
    });
    const score = items.filter((x) => x.ok).length;
    d.mocks.unshift({
      id: a.id,
      at: Date.now(),
      format: a.format,
      minutes: a.minutes,
      usedMs: Math.min(Date.now() - a.startedAt, a.minutes * 60000),
      auto: !!auto,
      items,
      score,
      total: items.length,
      written: a.written.map((wid) => ({ id: wid, text: a.texts[wid] || '', marks: {} })),
    });
    d.mocks = d.mocks.slice(0, 30);
    d.active = null;
  });
  return id;
}

function MockRun({ active, onDone }) {
  const now = useTick(1000);
  const end = active.startedAt + active.minutes * 60000;
  const left = Math.max(0, end - now);
  const [confirm, setConfirm] = useState(null); // 'submit' | 'abandon'
  const fired = useRef(false);
  const dlgBtn = useRef(null);
  useEffect(() => {
    if (!confirm) return;
    try {
      dlgBtn.current && dlgBtn.current.focus();
    } catch (e) {}
    const onKey = (e) => e.key === 'Escape' && setConfirm(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm]);
  const total = active.mcq.length + active.written.length;
  const answered = active.mcq.filter((id) => active.picks[id] != null).length + active.written.filter((w) => (active.texts[w] || '').trim()).length;

  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      const id = finish(active, true);
      onDone(id);
    }
  }, [left]);

  const pick = (qid, i) => update((d) => d.active && (d.active.picks[qid] = i));
  const flag = (qid) => update((d) => d.active && (d.active.flags[qid] = !d.active.flags[qid]));
  const setText = (wid, t) => update((d) => d.active && (d.active.texts[wid] = t));
  // scroll so the question's header lands just below the sticky bar (and the phone top bar)
  const jump = (n) => {
    const el = document.getElementById('mq-' + n);
    if (!el) return;
    const bar = document.querySelector('.mockbar');
    const stuckBottom = bar ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight : 0;
    const y = el.getBoundingClientRect().top + window.scrollY - stuckBottom - 12;
    let smooth = true;
    try {
      smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
  };
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const abandon = () => update((d) => (d.active = null));
  const unanswered = total - answered;

  return (
    <div class="stack">
      <div class="mockbar" role="region" aria-label="Test controls">
        <span class={`timer ${left < 5 * 60000 ? 'low' : ''}`} aria-live="off" title="Time left">
          {mm}:{String(ss).padStart(2, '0')}
        </span>
        <div class="qchips" aria-label="Jump to question">
          {[...active.mcq, ...active.written].map((id, i) => {
            const isW = i >= active.mcq.length;
            const done = isW ? (active.texts[id] || '').trim() : active.picks[id] != null;
            return (
              <button type="button" key={id} class={`qchip ${done ? 'on' : ''} ${active.flags[id] ? 'flagged' : ''}`} onClick={() => jump(i + 1)} aria-label={`Question ${i + 1}${done ? ', answered' : ''}${active.flags[id] ? ', flagged' : ''}`}>
                {isW ? 'W' + (i - active.mcq.length + 1) : i + 1}
              </button>
            );
          })}
        </div>
        <span class="spacer" />
        <span class="small nums mockbar-title">
          {answered}/{total}
        </span>
        <Btn kind="primary" size="sm" onClick={() => setConfirm('submit')}>
          Submit
        </Btn>
      </div>

      {confirm && (
        <div class="dlg-scrim" onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          {confirm === 'submit' ? (
            <div class="card confirm dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">
              <b id="dlg-t">Submit now?</b>
              <span class="muted">
                {unanswered > 0 ? `${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered. ` : 'Everything is answered. '}
                {mm} min left.
              </span>
              <div class="row">
                <button type="button" class="btn primary" ref={dlgBtn} onClick={() => onDone(finish(active, false))}>
                  Submit and mark
                </button>
                <Btn onClick={() => setConfirm(null)}>Keep going</Btn>
              </div>
            </div>
          ) : (
            <div class="card confirm dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">
              <b id="dlg-t">Abandon this mock?</b>
              <span class="muted">Your answers are thrown away and nothing is saved or marked.</span>
              <div class="row">
                <Btn kind="danger" onClick={abandon}>
                  Abandon it
                </Btn>
                <button type="button" class="btn primary" ref={dlgBtn} onClick={() => setConfirm(null)}>
                  Keep going
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div class="paper-head">
        <div class="h-kicker">{fmtLabel(active.format)} · {active.mcq.length} questions{active.written.length ? ` + ${active.written.length} written` : ''} · {active.minutes} min</div>
        <p class="small muted">Circle one option per question (1 mark each). Tap ⚑ to flag a question to come back to. The test submits itself when the clock reaches 0:00.</p>
      </div>

      {active.mcq.map((qid, i) => {
        const q = QBYID[qid];
        if (!q) return null;
        return (
          <section class="mq" id={'mq-' + (i + 1)} key={qid}>
            <div class="mq-head">
              <span class="qnum">{i + 1}</span>
              <span class="spacer" />
              <button type="button" class={`btn ghost sm ${active.flags[qid] ? 'flag-on' : ''}`} onClick={() => flag(qid)} aria-pressed={!!active.flags[qid]}>
                ⚑ {active.flags[qid] ? 'Flagged' : 'Flag'}
              </button>
            </div>
            <Html as="div" class="qtext" html={q.q} />
            <div class="opts">
              {q.options.map((o, k) => (
                <button type="button" key={k} class={`opt ${active.picks[qid] === k ? 'picked' : ''}`} aria-pressed={active.picks[qid] === k} onClick={() => pick(qid, k)}>
                  <span class="key">{optionLabel(q.paperId, k)}</span>
                  <Html html={o} />
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {active.written.map((wid, i) => {
        const w = WRITTEN_BY_ID[wid];
        if (!w) return null;
        const n = active.mcq.length + i + 1;
        return (
          <section class="mq" id={'mq-' + n} key={wid}>
            <div class="mq-head">
              <span class="qnum">Written {i + 1}</span>
              <Chip>{w.marks} marks</Chip>
              <Chip kind="blue">{w.kind === 'worked' ? 'Worked problem' : 'Explain'}</Chip>
            </div>
            <Html as="div" class="qtext rich" html={w.prompt} />
            <textarea
              class="input"
              rows={9}
              aria-label={`Answer to written question ${i + 1}`}
              placeholder="Write your answer as you would on paper. Short points are fine."
              value={active.texts[wid] || ''}
              onInput={(e) => setText(wid, e.currentTarget.value)}
            />
          </section>
        );
      })}

      <div class="row mock-end">
        <Btn kind="primary" onClick={() => setConfirm('submit')}>
          Submit and mark
        </Btn>
        <span class="spacer" />
        <Btn kind="ghost danger" size="sm" onClick={() => setConfirm('abandon')}>
          Abandon this mock
        </Btn>
      </div>
    </div>
  );
}

function MockResult({ id, go, onBack }) {
  const m = useStore((s) => s.mocks.find((x) => x.id === id));
  const [filter, setFilter] = useState('wrong');
  const byWeek = useMemo(() => {
    const r = {};
    if (!m) return r;
    for (const it of m.items) {
      const q = QBYID[it.id];
      if (!q) continue;
      const w = q.week;
      r[w] ||= { n: 0, ok: 0, topics: {} };
      r[w].n++;
      if (it.ok) r[w].ok++;
      if (!it.ok) r[w].topics[q.topic] = (r[w].topics[q.topic] || 0) + 1;
    }
    return r;
  }, [m]);
  if (!m) return <div class="empty">That mock isn't saved any more.</div>;
  const wrMarks = (m.written || []).map(writtenScore);
  const wrTotal = wrMarks.reduce((a, b) => a + (b || 0), 0);
  const wrMax = 5 * (m.written || []).length;
  const allMarked = wrMarks.every((x) => x != null);
  const setMarks = (wid, marks) =>
    update((d) => {
      const mm = d.mocks.find((x) => x.id === id);
      const w = mm && mm.written.find((x) => x.id === wid);
      if (w) w.marks = marks;
    });
  const late = m.items.filter((it) => (QBYID[it.id]?.week || 0) >= 7);
  const early = m.items.filter((it) => (QBYID[it.id]?.week || 0) < 7);
  const shown = m.items.filter((it) => filter === 'all' || !it.ok);

  return (
    <div class="stack">
      <div class="row">
        <Btn kind="ghost" size="sm" onClick={onBack}>
          ← All mocks
        </Btn>
      </div>
      <div class="card results-head stack">
        <div class="h-kicker">Mock result · {new Date(m.at).toLocaleString('en-NZ', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</div>
        <div class="score-row">
          <div>
            <div class="score-big nums">
              {m.score}
              <span class="score-of">/{m.total}</span>
            </div>
            <div class="small muted">multiple choice · {Math.round((100 * m.score) / m.total)}%</div>
          </div>
          {wrMax > 0 && (
            <div>
              <div class="score-big nums">
                {allMarked ? fmt(wrTotal, 1) : '?'}
                <span class="score-of">/{wrMax}</span>
              </div>
              <div class="small muted">written {allMarked ? '' : '· mark below'}</div>
            </div>
          )}
          {wrMax > 0 && allMarked && (
            <div>
              <div class="score-big nums">
                {Math.round((100 * (m.score + wrTotal)) / (m.total + wrMax))}%
              </div>
              <div class="small muted">overall ({fmt(m.score + wrTotal, 1)} / {m.total + wrMax})</div>
            </div>
          )}
        </div>
        <div class="small muted">
          Weeks 1–6: {early.filter((x) => x.ok).length}/{early.length} · Weeks 7–12: {late.filter((x) => x.ok).length}/{late.length} · time used{' '}
          {Math.round(m.usedMs / 60000)} of {m.minutes} min{m.auto ? ' (time ran out)' : ''}
        </div>
        <div class="mres-weeks">
          {WEEKS.filter((w) => byWeek[w.week]).map((w) => {
            const b = byWeek[w.week];
            const missed = Object.keys(b.topics);
            return (
              <div class="mres-wk" key={w.week}>
                <span class="mres-name">
                  <b>W{w.week}</b> {w.short}
                </span>
                <span class="mres-bar">
                  <span class="bar">
                    <span style={{ width: `${(100 * b.ok) / b.n}%` }} />
                  </span>
                  <span class="nums small">
                    {b.ok}/{b.n}
                  </span>
                </span>
                <span class="mres-miss small">
                  {missed.map((k) => (
                    <button key={k} type="button" class="linkish" onClick={() => go({ v: 'practice', p: { mode: 'topics', topics: [k] } })}>
                      {TOPIC[k]?.name}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(m.written || []).map((wr, i) => {
        const w = WRITTEN_BY_ID[wr.id];
        if (!w) return null;
        return (
          <div class="card stack" key={wr.id}>
            <div class="mq-head">
              <span class="qnum">Written {i + 1}</span>
              <Chip>{w.marks} marks</Chip>
              <Chip kind="blue">
                W{w.week} · {TOPIC[w.topic]?.name}
              </Chip>
            </div>
            <Html as="div" class="qtext rich" html={w.prompt} />
            <div class="your-answer">
              <div class="label">Your answer</div>
              <div class="answer-text">{wr.text || <span class="faint">(blank)</span>}</div>
            </div>
            <WrittenMarker w={w} text={wr.text} marks={wr.marks} onChange={(mk) => setMarks(wr.id, mk)} />
          </div>
        );
      })}

      <div class="card stack">
        <div class="row">
          <h2 class="h2">Review</h2>
          <span class="spacer" />
          <Seg
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'wrong', label: `Wrong (${m.items.filter((x) => !x.ok).length})` },
              { value: 'all', label: `All (${m.items.length})` },
            ]}
          />
        </div>
        {shown.length === 0 && <Fb kind="good">Nothing wrong. Excellent.</Fb>}
        {shown.map((it) => {
          const q = QBYID[it.id];
          if (!q) return null;
          const n = m.items.indexOf(it) + 1;
          const right = correctList(q);
          return (
            <div class="qblock" key={it.id}>
              <div class="row">
                <span class="qnum">Q{n}</span>
                <span class={`chip ${it.ok ? 'good' : 'bad'}`}>{it.ok ? 'Right' : it.pick == null ? 'Blank' : 'Wrong'}</span>
                <button type="button" class="chip src linkchip" onClick={() => go({ v: 'week', p: q.week })}>
                  W{q.week} · {TOPIC[q.topic]?.name}
                </button>
                {q.origin === 'paper' && <Chip kind="blue">{PAPER_SHORT[q.paperId]}</Chip>}
                <FlagChip flag={q.flag} note={q.note} />
              </div>
              <Html as="div" class="qtext" html={q.q} />
              <div class="opts compact">
                {q.options.map((o, k) => (
                  <div key={k} class={`opt static ${right.includes(k) ? 'right' : k === it.pick ? 'wrong' : ''}`}>
                    <span class="key">{optionLabel(q.paperId, k)}</span>
                    <Html html={o} />
                    {k === it.pick && <span class="opt-tag">{right.includes(k) ? 'your answer ✓' : 'your answer'}</span>}
                  </div>
                ))}
              </div>
              <div class="small">
                <Html html={q.explain} /> <span class="faint">({q.src})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
