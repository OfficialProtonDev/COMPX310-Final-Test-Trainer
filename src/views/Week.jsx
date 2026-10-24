// A week's page: what to know, interactive visuals, progress by topic, and links to practise.
import { useState } from 'preact/hooks';
import { useStore, update } from '../lib/store.js';
import { WEEK, TOPICS_BY_WEEK, CHEAT_BY_TOPIC, WRITTEN_BY_WEEK, POOL_BY_TOPIC, MOCK_WEEK_QUOTA } from '../data/index.js';
import { allTopicStats } from '../lib/stats.js';
import { WIDGETS } from '../widgets/index.js';
import { Html, Btn, Chip, Bar } from '../ui.jsx';
import { SafeWidget } from './SafeWidget.jsx';

export function Week({ go, week }) {
  const state = useStore();
  const w = WEEK[week];
  const topics = TOPICS_BY_WEEK[week] || [];
  const ts = allTopicStats(state);
  const widgets = WIDGETS.filter((x) => x.week === week && !x.id.endsWith('-exam'));
  const written = WRITTEN_BY_WEEK[week] || [];
  const [openW, setOpenW] = useState(() => (widgets[0] ? widgets[0].id : null));
  if (!w) return <div class="empty">Unknown week.</div>;
  const pinned = state.pinnedBlocks || {};
  const togglePin = (id) => update((d) => (d.pinnedBlocks[id] ? delete d.pinnedBlocks[id] : (d.pinnedBlocks[id] = true)));
  const toggleWeak = (k) => update((d) => (d.weak[k] ? delete d.weak[k] : (d.weak[k] = true)));
  const paperQs = topics.reduce((s, t) => s + (POOL_BY_TOPIC[t.key] || []).filter((q) => q.origin === 'paper').length, 0);

  return (
    <div class="stack">
      <header class="page-head">
        <div class="h-kicker">
          Week {week} · {w.deck} · about {MOCK_WEEK_QUOTA[week]} of the 40 questions
        </div>
        <h1 class="h-title">{w.title}</h1>
        <div class="row">
          <Btn kind="primary" onClick={() => go({ v: 'practice', p: { mode: 'topics', topics: topics.map((t) => t.key) } })}>
            Practise Week {week}
          </Btn>
          {paperQs > 0 && <span class="small muted">{paperQs} past-paper questions on this week are in the mix.</span>}
        </div>
      </header>

      <div class="card stack-sm">
        <h2 class="h2">Your progress</h2>
        <div class="wk-topics">
          {topics.map((t) => {
            const s = ts[t.key];
            return (
              <div class="wk-topic" key={t.key}>
                <div class="wk-topic-name">
                  <b>{t.name}</b>
                  <span class="small muted">{t.blurb}</span>
                </div>
                <div class="wk-topic-stat">
                  {/* same measure as the Overview: share of the questions you've tried whose latest answer was right */}
                  <Bar value={s.attempted ? s.ok / s.attempted : 0} tone={!s.attempted ? 'ink' : s.ok / s.attempted >= 0.8 ? 'tick' : s.ok / s.attempted >= 0.6 ? 'biro' : 'marker'} />
                  <span class="small nums">{s.attempted ? `${Math.round((100 * s.ok) / s.attempted)}% · ${s.attempted}/${s.total}` : `0/${s.total}`}</span>
                </div>
                <div class="wk-topic-act">
                  <Btn size="sm" onClick={() => go({ v: 'practice', p: { mode: 'topics', topics: [t.key] } })}>
                    Practise
                  </Btn>
                  <button type="button" class={`chip weakchip ${state.weak[t.key] ? 'warn' : ''}`} aria-pressed={!!state.weak[t.key]} onClick={() => toggleWeak(t.key)} title="Weak topics go first on your cheat sheet">
                    {state.weak[t.key] ? '★ Marked weak' : '☆ I’m weak at this'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {widgets.length > 0 && (
        <div class="stack">
          <h2 class="h2">See it work</h2>
          <div class="wtabs" role="tablist" aria-label="Visuals">
            {widgets.map((x) => (
              <button type="button" role="tab" aria-selected={openW === x.id} key={x.id} class={`wtab ${openW === x.id ? 'on' : ''}`} onClick={() => setOpenW(x.id)}>
                {x.title}
              </button>
            ))}
          </div>
          {widgets
            .filter((x) => x.id === openW)
            .map((x) => (
              <SafeWidget key={x.id} w={x} />
            ))}
        </div>
      )}

      {topics.some((t) => (CHEAT_BY_TOPIC[t.key] || []).length > 0) && <div class="stack">
        <div class="row">
          <h2 class="h2">Key facts</h2>
          <span class="small muted">★ pins a box onto your cheat sheet.</span>
        </div>
        {topics.map((t) => {
          const blocks = CHEAT_BY_TOPIC[t.key] || [];
          if (!blocks.length) return null;
          return (
            <section key={t.key} class="stack-sm">
              <h3 class="h3">{t.name}</h3>
              <div class="facts">
                {blocks.map((b) => (
                  <div class={`fact card flat imp-${b.imp}`} key={b.id}>
                    <div class="fact-head">
                      <b>{b.title}</b>
                      <button type="button" class={`pin ${pinned[b.id] ? 'on' : ''}`} aria-pressed={!!pinned[b.id]} aria-label={pinned[b.id] ? 'Unpin from cheat sheet' : 'Pin to cheat sheet'} onClick={() => togglePin(b.id)}>
                        {pinned[b.id] ? '★' : '☆'}
                      </button>
                    </div>
                    <Html as="div" class="fact-body cs-content" html={b.html} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>}

      {written.length > 0 && (
        <div class="card stack-sm">
          <h2 class="h2">Written practice for this week</h2>
          {written.map((x) => (
            <button type="button" key={x.id} class="wrow" onClick={() => go({ v: 'written', p: x.id })}>
              <Chip>{x.kind === 'worked' ? 'Worked' : 'Explain'}</Chip>
              <Html class="wrow-text" html={x.prompt.replace(/<[^>]+>/g, ' ').slice(0, 150) + '…'} />
            </button>
          ))}
        </div>
      )}

      <div class="row">
        {week > 1 && (
          <Btn kind="ghost" onClick={() => go({ v: 'week', p: week - 1 })}>
            ← Week {week - 1}
          </Btn>
        )}
        <span class="spacer" />
        {week < 12 && (
          <Btn kind="ghost" onClick={() => go({ v: 'week', p: week + 1 })}>
            Week {week + 1} →
          </Btn>
        )}
      </div>
    </div>
  );
}
