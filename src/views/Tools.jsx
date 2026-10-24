// Every interactive visual and calculator in one place.
import { WIDGETS, WIDGET } from '../widgets/index.js';
import { WEEK, TOPIC } from '../data/index.js';
import { Btn } from '../ui.jsx';
import { SafeWidget } from './SafeWidget.jsx';

export function Tools({ go }) {
  const late = WIDGETS.filter((w) => w.week >= 7 && !w.id.endsWith('-exam'));
  const early = WIDGETS.filter((w) => w.week < 7 && !w.id.endsWith('-exam'));
  const exam = WIDGETS.filter((w) => w.id.endsWith('-exam'));
  const Grid = ({ list }) => (
    <div class="tool-grid">
      {list.map((w) => (
        <button type="button" key={w.id} class="card tool-card" onClick={() => go({ v: 'tool', p: w.id })}>
          <div class="row small">
            <span class="chip">W{w.week}</span>
            <span class="faint">{TOPIC[w.topic]?.name}</span>
            {w.tool && <span class="chip blue">calculator</span>}
          </div>
          <b class="tool-title">{w.title}</b>
          <span class="small muted">{w.blurb}</span>
        </button>
      ))}
    </div>
  );
  return (
    <div class="stack">
      <header class="page-head">
        <div class="h-kicker">Visuals & calculators</div>
        <h1 class="h-title">See how each method works</h1>
        <p class="h-sub">Small interactive models of the mechanisms the questions test. Each opens with the lecture's own example loaded; change the numbers and watch what moves.</p>
      </header>
      {exam.length > 0 && (
        <section class="stack-sm">
          <h2 class="h2">Practice-paper problems, interactive</h2>
          <Grid list={exam} />
        </section>
      )}
      <section class="stack-sm">
        <h2 class="h2">Weeks 7–12</h2>
        <Grid list={late} />
      </section>
      <section class="stack-sm">
        <h2 class="h2">Weeks 1–6</h2>
        <Grid list={early} />
      </section>
    </div>
  );
}

export function ToolView({ go, id }) {
  const w = WIDGET[id];
  if (!w) return <div class="empty">That visual isn't available.</div>;
  return (
    <div class="stack">
      <div class="row">
        <Btn kind="ghost" size="sm" onClick={() => go({ v: 'tools' })}>
          ← All visuals
        </Btn>
        <span class="spacer" />
        <Btn kind="ghost" size="sm" onClick={() => go({ v: 'week', p: w.week })}>
          Week {w.week}: {WEEK[w.week]?.title} →
        </Btn>
      </div>
      <SafeWidget w={w} />
    </div>
  );
}
