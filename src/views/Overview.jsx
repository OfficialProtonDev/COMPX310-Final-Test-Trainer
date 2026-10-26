// Overview: the test, a plan for the days left, and readiness by week.
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '../lib/store.js';
import { WEEKS, MOCK_WEEK_QUOTA, POOL, WRITTEN, PAPERS, CHEAT } from '../data/index.js';
import { allTopicStats, weekStat, predictedMcq } from '../lib/stats.js';
import { WIDGETS } from '../widgets/index.js';
import { Btn, Bar } from '../ui.jsx';
import { TEST_AT } from '../app.jsx';
import { IS_WEB } from '../lib/host.js';

const DAY = 86400000;
const nzDate = (t) => new Date(t).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short' });
const nzDayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' });

function plan(now) {
  // Steps keyed to calendar days before the test (NZ time).
  const testDay = nzDayKey(TEST_AT);
  const today = nzDayKey(now);
  const days = Math.round((Date.parse(testDay) - Date.parse(today)) / DAY);
  const steps = [
    { d: 3, title: 'Find your weak spots', body: 'A Quick 20 mock or 20 Smart-mix questions. Mark anything that felt like a guess as weak on its week page.', go: { v: 'mock' }, cta: 'Quick mock' },
    { d: 2, title: 'Weeks 7–9: ensembles, SVMs, Bayes & GPs', body: 'Read each week’s key facts, play with the visuals (voting, OOB, AdaBoost, SVM margin, γ/C, GP bands), then practise each week until ~80%.', go: { v: 'week', p: 7 }, cta: 'Start Week 7' },
    { d: 2, title: 'Full mock #1', body: '40 + 2 under the 50-minute clock. Review every miss, then let Practice re-ask them.', go: { v: 'mock' }, cta: 'Sit a mock' },
    { d: 1, title: 'Weeks 10–12, then a Weeks 1–6 refresh', body: 'PCA & clustering (DBSCAN labelling!), attention & BERT/GPT, practical ML & fairness. Then a quick pass over Weeks 1–6 — about 13 of the 40 questions.', go: { v: 'week', p: 10 }, cta: 'Start Week 10' },
    { d: 1, title: 'Full mock #2 + two written answers', body: 'Another full mock, then one explain and one worked written question marked against the mark points.', go: { v: 'written' }, cta: 'Written practice' },
    { d: 1, title: 'Build and print the cheat sheet', body: 'Auto-fill puts your weak topics first, then the most-tested facts. Save it, print A4 double-sided, check it reads at that size.', go: { v: 'sheet' }, cta: 'Cheat sheet' },
    { d: 0, title: 'Test morning: light review only', body: 'Re-ask your remaining misses, skim the sheet, past-paper Q→A lines. No new material.', go: { v: 'practice', p: { mode: 'missed' } }, cta: 'Missed questions' },
  ];
  return { steps, days };
}

export function Overview({ go }) {
  const state = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = TEST_AT - now;
  const d = Math.max(0, Math.floor(left / DAY));
  const h = Math.max(0, Math.floor((left % DAY) / 3600000));
  const m = Math.max(0, Math.floor((left % 3600000) / 60000));
  const s = Math.max(0, Math.floor((left % 60000) / 1000));
  const ts = allTopicStats(state);
  const pred = predictedMcq(state);
  const answered = Object.keys(state.ans).length;
  const { steps, days } = plan(now);
  const curIdx = Math.max(0, steps.findIndex((x) => x.d <= Math.max(0, days) && x.d >= Math.max(0, days) - 0));
  const mocks = state.mocks.length;
  const act = state.active && !state.active.done ? state.active : null;
  const actLeft = act ? act.startedAt + act.minutes * 60000 - now : 0;

  return (
    <div class="stack home">
      {act && (
        <div class="card resume-bar" role="status">
          <span>
            <b>{actLeft > 0 ? 'Your mock is still running' : 'Your mock’s time ran out'}</b>{' '}
            <span class="muted">
              {actLeft > 0
                ? `${Math.floor(actLeft / 60000)}:${String(Math.floor((actLeft % 60000) / 1000)).padStart(2, '0')} left · ${act.mcq.filter((id) => act.picks[id] != null).length} of ${act.mcq.length} answered`
                : 'Open it to see your marks.'}
            </span>
          </span>
          <Btn kind="primary" size="sm" onClick={() => go({ v: 'mock' })}>
            {actLeft > 0 ? 'Resume the mock' : 'See the result'}
          </Btn>
        </div>
      )}
      <section class="home-hero">
        <div class="home-intro">
          <div class="h-kicker">COMPX310 · Machine Learning</div>
          <h1 class="home-title">Final test trainer</h1>
          <p class="home-sub">
            Everything for Tuesday’s test in one place: {POOL.length} practice questions (with every past-paper question), {WRITTEN.length} written prompts, timed mocks in the
            real format, {WIDGETS.length} interactive visuals, and a builder for your one double-sided A4 sheet.
          </p>
          <div class="home-cta">
            <Btn kind="primary" onClick={() => go({ v: 'practice' })}>
              {answered ? 'Continue practising' : 'Start practising'}
            </Btn>
            <Btn onClick={() => go({ v: 'mock' })}>Sit a timed mock</Btn>
            <Btn onClick={() => go({ v: 'sheet' })}>Build my cheat sheet</Btn>
          </div>
        </div>
        <div class="ticket open">
          <div class="tk-top">
            <div class="tk-row">
              <span class="tk-label">Final test</span>
              <span class="tk-date">{nzDate(TEST_AT)}, 10:00</span>
            </div>
            {left > 0 ? (
              <div class="tk-count nums" aria-label="Time until the test">
                <b>{d}</b>
                <small>d</small> <b>{h}</b>
                <small>h</small> <b>{String(m).padStart(2, '0')}</b>
                <small>m</small> <b>{String(s).padStart(2, '0')}</b>
                <small>s</small>
              </div>
            ) : (
              <div class="tk-now">{left > -3600000 ? 'Happening now — good luck.' : 'The test is over.'}</div>
            )}
          </div>
          <dl class="tk-list">
            <div>
              <dt>Format</dt>
              <dd>40 multiple choice (1 mark, 4 options) + 2 written (5 marks) = 50 marks</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>50 minutes</dd>
            </div>
            <div>
              <dt>Mix</dt>
              <dd>≈ 13 questions on Weeks 1–6, ≈ 27 on Weeks 7–12</dd>
            </div>
            <div>
              <dt>Pace</dt>
              <dd>MCQs ≈ 45 s each (30 min), written ≈ 8 min each, 4 min to check</dd>
            </div>
            <div>
              <dt>Allowed</dt>
              <dd>One double-sided A4 cheat sheet · no calculator</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="home-sec">
        <div class="sec-head">
          <span class="sec-num">1</span>
          <h2 class="sec-title">Plan for the days left</h2>
          <p class="sec-sub">{days > 0 ? `${days} day${days === 1 ? '' : 's'} to go. The highlighted step is where you should be now.` : 'Test day.'}</p>
        </div>
        <ol class="plan-steps">
          {steps.map((st, i) => {
            const isNow = i === curIdx;
            const past = st.d > Math.max(0, days);
            return (
              <li key={i} class={`plan-step ${isNow ? 'now' : ''} ${past ? 'past' : ''}`}>
                <div class="ps-when">{st.d === 0 ? 'Test morning' : nzDate(TEST_AT - st.d * DAY)}</div>
                <div class="ps-main">
                  <b>{st.title}</b>
                  <span class="small muted">{st.body}</span>
                </div>
                <Btn size="sm" kind={isNow ? 'primary' : ''} onClick={() => go(st.go)}>
                  {st.cta}
                </Btn>
              </li>
            );
          })}
        </ol>
      </section>

      <section class="home-sec">
        <div class="sec-head">
          <span class="sec-num">2</span>
          <h2 class="sec-title">Readiness by week</h2>
          <p class="sec-sub">
            {pred.evidence >= 10
              ? `At your current accuracy you’d expect about ${Math.round(pred.exp)} / 40 on the multiple choice (from ${answered} questions answered, ${mocks} mock${mocks === 1 ? '' : 's'}).`
              : 'Answer a few questions per week and this turns into a score estimate.'}
          </p>
        </div>
        <div class="card plan readiness">
          <div class="rd-head small">
            <span>Week</span>
            <span>Your accuracy</span>
            <span class="rd-q">≈ test Qs</span>
          </div>
          {WEEKS.map((w) => {
            const st = weekStat(state, w.week, ts);
            const tone = !st.attempted ? 'ink' : st.raw >= 0.8 ? 'tick' : st.raw >= 0.6 ? 'biro' : 'marker';
            return (
              <button type="button" class={`rd-row ${w.week >= 7 ? 'late' : ''}`} key={w.week} onClick={() => go({ v: 'week', p: w.week })}>
                <span class="rd-wk">
                  <b>W{w.week}</b> <span class="rd-title">{w.title}</span>
                </span>
                <span class="rd-bar">
                  <Bar value={st.attempted ? st.raw : 0} tone={tone} />
                  <span class="small nums">{st.attempted ? `${Math.round(st.raw * 100)}% of ${st.attempted}` : `${st.total} Qs`}</span>
                </span>
                <span class="rd-q nums">{MOCK_WEEK_QUOTA[w.week]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section class="home-pair">
        <div class="card home-card">
          <h2 class="h2">The lecturer reuses questions</h2>
          <p>
            The 2023 Test 2 is the closest match to this test: 50 minutes, the whole course, mostly the second half. 13 of its 36 multiple-choice questions also appear
            on the other papers here (8 in the 2024 Test 1), and 10 of the 26 on the 2019 mock came back in the 2025 Test 1. Every past-paper question is in Practice
            and the mocks.
          </p>
          <div class="row">
            <Btn size="sm" onClick={() => go({ v: 'paper', p: 'test2-2023' })}>
              Open the 2023 Test 2
            </Btn>
            <Btn size="sm" onClick={() => go({ v: 'paper', p: 'practice-2019' })}>
              Open the practice paper
            </Btn>
          </div>
        </div>
        <div class="card home-card">
          <h2 class="h2">New this half, not on old papers</h2>
          <p>
            Bayesian linear regression, attention/transformers (BERT vs GPT) and practical ML & fairness are in this term’s slides but on no past paper, and Gaussian
            processes get only two questions (2023 Test 2), so the questions here are the main practice for them. Give Weeks 9, 11 and 12 a proper pass.
          </p>
          <div class="row">
            <Btn size="sm" onClick={() => go({ v: 'week', p: 9 })}>
              Week 9
            </Btn>
            <Btn size="sm" onClick={() => go({ v: 'week', p: 11 })}>
              Week 11
            </Btn>
            <Btn size="sm" onClick={() => go({ v: 'week', p: 12 })}>
              Week 12
            </Btn>
          </div>
        </div>
      </section>

      <footer class="home-foot">
        <p>
          Content: {POOL.length} questions, {WRITTEN.length} written prompts, {PAPERS.length} past papers, {CHEAT.length} key-fact boxes, built from the 12 weeks of
          slides. Your answers and mock results stay in this browser.{' '}
          {IS_WEB ? '“Ask Claude” buttons open claude.ai in a new tab.' : 'Claude marking and “Ask Claude” use your own Claude account.'}
        </p>
      </footer>
    </div>
  );
}
