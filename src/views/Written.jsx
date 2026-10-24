// Written-answer practice: explanation prompts and worked problems, marked by Claude or by checklist.
import { useState, useEffect } from 'preact/hooks';
import { useStore, update } from '../lib/store.js';
import { WRITTEN, WRITTEN_BY_ID, TOPIC, WEEK } from '../data/index.js';
import { Html, Btn, Chip, Seg } from '../ui.jsx';
import { WrittenMarker, bestMark } from './WrittenMarker.jsx';
import { fmt } from '../lib/svg.js';
import { WIDGET } from '../widgets/index.js';
import { SafeWidget } from './SafeWidget.jsx';
import { IS_WEB } from '../lib/host.js';

const WIDGET_FOR = { 'w10-dbscan': 'dbscan-lab', 'w6-cnn': 'conv-pool', 'w11-attn': 'attention-calc', 'w12-ethics': 'fairness-calc', 'w7-voting': 'voting-calc', 'w9-blr': 'bayes-slopes', 'w4-metrics': 'metrics-threshold', 'w10-pca': 'pca-explorer' };

export function Written({ go, init }) {
  const [open, setOpen] = useState(init || null);
  const [kind, setKind] = useState('all');
  const saved = useStore((s) => s.written);
  if (open && WRITTEN_BY_ID[open]) return <WrittenEditor w={WRITTEN_BY_ID[open]} onBack={() => setOpen(null)} go={go} />;
  const list = WRITTEN.filter((w) => kind === 'all' || w.kind === kind).sort((a, b) => (b.week >= 7) - (a.week >= 7) || a.week - b.week);
  return (
    <div class="stack">
      <header class="page-head">
        <div class="h-kicker">Written answers</div>
        <h1 class="h-title">Practise the two 5-mark questions</h1>
        <p class="h-sub">
          Test 1’s written questions were explanations (cross-validation; supervised vs unsupervised). The practice paper’s were worked problems (DBSCAN labelling,
          convolution, drawing an SVM margin). Expect either. Aim for about 5 minutes each.{' '}
          {IS_WEB ? 'Then tick off the mark points yourself, or have Claude mark it in a new tab.' : 'Claude marks against the mark points, or tick them off yourself.'}
        </p>
      </header>
      <div class="card flat row">
        <Seg
          label="Kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: `All (${WRITTEN.length})` },
            { value: 'explain', label: 'Explain' },
            { value: 'worked', label: 'Worked problems' },
          ]}
        />
      </div>
      <div class="wlist">
        {list.map((w) => {
          const s = saved[w.id];
          const m = bestMark(s?.marks, s?.text || '');
          return (
            <button type="button" class="card wcard" key={w.id} onClick={() => setOpen(w.id)}>
              <div class="row">
                <Chip kind={w.week >= 7 ? 'blue' : ''}>W{w.week}</Chip>
                <Chip>{w.kind === 'worked' ? 'Worked' : 'Explain'}</Chip>
                <span class="spacer" />
                {m != null ? <span class="mq-score part nums">{fmt(m, 1)}/5</span> : s?.text ? <span class="small faint">draft</span> : null}
              </div>
              <div class="wcard-topic">{TOPIC[w.topic]?.name}</div>
              <Html as="div" class="small muted wcard-prompt" html={w.prompt} />
            </button>
          );
        })}
        {WRITTEN.length === 0 && <div class="empty">Written prompts are loading.</div>}
      </div>
    </div>
  );
}

function WrittenEditor({ w, onBack, go }) {
  const s = useStore((st) => st.written[w.id] || {});
  const [submitted, setSubmitted] = useState(!!(s.marks && (s.marks.claude || s.marks.self)));
  const timer = s.timerEnd || null; // end timestamp, kept with the draft so leaving the page doesn't reset it
  const setTimer = (t) => update((d) => (d.written[w.id] = { ...(d.written[w.id] || {}), timerEnd: t }));
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer]);
  const save = (patch) => update((d) => (d.written[w.id] = { ...(d.written[w.id] || {}), ...patch, at: Date.now() }));
  const left = timer ? Math.max(0, timer - now) : null;
  const wid = WIDGET_FOR[w.topic];
  const W = wid && WIDGET[wid];
  return (
    <div class="stack">
      <div class="row">
        <Btn kind="ghost" size="sm" onClick={onBack}>
          ← All written questions
        </Btn>
      </div>
      <div class="card stack">
        <div class="mq-head">
          <span class="qnum">Written</span>
          <Chip>5 marks</Chip>
          <button type="button" class="chip src linkchip" onClick={() => go({ v: 'week', p: w.week })}>
            W{w.week} · {TOPIC[w.topic]?.name}
          </button>
          <Chip>{w.kind === 'worked' ? 'Worked problem' : 'Explain'}</Chip>
          <span class="spacer" />
          {left == null || left === 0 ? (
            <Btn size="sm" onClick={() => setTimer(Date.now() + 6 * 60000)}>
              {left === 0 ? 'Time’s up · restart the timer' : 'Start a 6-minute timer'}
            </Btn>
          ) : (
            <span class={`timer ${left < 60000 ? 'low' : ''}`}>
              {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
            </span>
          )}
        </div>
        <Html as="div" class="qtext rich" html={w.prompt} />
        <textarea
          class="input"
          rows={10}
          aria-label="Your answer"
          placeholder="Write it as you would in the test: short, precise points."
          value={s.text || ''}
          onInput={(e) => save({ text: e.currentTarget.value })}
        />
        {!submitted ? (
          <div class="row">
            <Btn kind="primary" onClick={() => setSubmitted(true)}>
              I'm done — mark it
            </Btn>
            <span class="small faint">Your draft saves as you type.</span>
          </div>
        ) : (
          <WrittenMarker w={w} text={s.text || ''} marks={s.marks || {}} onChange={(marks) => save({ marks })} />
        )}
        <div class="small faint">Source: {w.src}</div>
      </div>
      {W && submitted && (
        <div class="stack-sm">
          <div class="h-kicker">Check your working with the visual</div>
          <SafeWidget w={W} />
        </div>
      )}
    </div>
  );
}

export { WEEK };
