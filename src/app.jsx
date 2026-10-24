// App shell: left rail of sections and weeks, a working sheet on the right.
import { useEffect, useState, useCallback } from 'preact/hooks';
import { Component } from 'preact';
import { useStore, update } from './lib/store.js';
import { WEEKS, TOPICS } from './data/index.js';
import { allTopicStats, weekStat, fmtDuration } from './lib/stats.js';
import { Overview } from './views/Overview.jsx';
import { Practice } from './views/Practice.jsx';
import { Mock } from './views/Mock.jsx';
import { Papers, PaperView } from './views/Papers.jsx';
import { Written } from './views/Written.jsx';
import { Week } from './views/Week.jsx';
import { Tools, ToolView } from './views/Tools.jsx';
import { Sheet } from './views/Sheet.jsx';
import { AskLayer } from './views/Ask.jsx';

export const TEST_AT = new Date('2026-10-27T10:00:00+13:00').getTime();

const NAV = [
  { v: 'home', label: 'Overview', ico: '⌂' },
  { v: 'practice', label: 'Practice questions', ico: '◇' },
  { v: 'mock', label: 'Mock test', ico: '⧖' },
  { v: 'papers', label: 'Past papers', ico: '§' },
  { v: 'written', label: 'Written answers', ico: '¶' },
  { v: 'sheet', label: 'Cheat sheet builder', ico: '▤' },
  { v: 'tools', label: 'Visuals & calculators', ico: '∿' },
];

const TOKENS = { home: 'home', practice: 'practice', mock: 'mock', papers: 'papers', written: 'written', sheet: 'sheet', tools: 'tools' };
// The hash names the view, so a reload (outside the artifact frame) comes back to the same page.
function routeToken(r) {
  if (r.v === 'week') return 'w' + r.p;
  if (r.v === 'paper') return 'papers';
  if (r.v === 'tool') return 'tools';
  return TOKENS[r.v] || 'home';
}
function useNarrow() {
  const q = '(max-width: 860px)';
  const [m, setM] = useState(() => {
    try {
      return window.matchMedia(q).matches;
    } catch (e) {
      return false;
    }
  });
  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia(q);
    } catch (e) {
      return;
    }
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, []);
  return m;
}

function initialRoute() {
  const h = (location.hash || '').slice(1);
  if (TOKENS[h]) return { v: TOKENS[h] };
  const m = h.match(/^w(\d{1,2})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return { v: 'week', p: +m[1] };
  return { v: 'home' };
}

class Boundary extends Component {
  state = { err: null };
  componentDidCatch(err) {
    console.error(err);
    this.setState({ err });
  }
  render() {
    if (this.state.err)
      return (
        <div class="card stack">
          <h2 class="h2">This view hit an error</h2>
          <p class="muted">{String(this.state.err && this.state.err.message)}</p>
          <div>
            <button class="btn" onClick={() => { this.setState({ err: null }); this.props.onReset(); }}>
              Back to the overview
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function applyTheme(theme) {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-user-theme');
  else el.setAttribute('data-user-theme', theme);
}

function ThemeSeg() {
  const theme = useStore((s) => s.prefs.theme);
  useEffect(() => applyTheme(theme), [theme]);
  const set = (t) => update((d) => (d.prefs.theme = t));
  const opts = [
    { v: 'light', l: 'Light', i: '☀' },
    { v: 'dark', l: 'Dark', i: '☾' },
    { v: 'system', l: 'Auto', i: '◐' },
  ];
  return (
    <div class="theme-seg">
      <div class="seg" role="group" aria-label="Colour theme">
        {opts.map((o) => (
          <button type="button" key={o.v} class={theme === o.v ? 'on' : ''} aria-pressed={theme === o.v} onClick={() => set(o.v)}>
            <span aria-hidden="true">{o.i}</span>
            <span class="tlabel">{o.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Rail({ route, go, open, mockLive }) {
  const state = useStore();
  const now = useNow();
  const ts = allTopicStats(state);
  const left = TEST_AT - now;
  const narrow = useNarrow();
  return (
    <nav class={`rail ${open ? 'open' : ''}`} aria-label="Sections" inert={narrow && !open} aria-hidden={narrow && !open ? 'true' : undefined}>
      <div class="brand">
        <div class="brand-name">
          COMPX310 Final Test
          <small>Machine Learning · Tue 27 Oct, 10:00</small>
        </div>
        <div class="rail-count" aria-live="off">
          {left > 0 ? (
            <>
              <b>{fmtDuration(left)}</b> to go
            </>
          ) : left > -3600000 ? (
            <b>Test in progress</b>
          ) : (
            <b>Test done</b>
          )}
        </div>
        <ThemeSeg />
      </div>
      <div class="nav-group">
        <div class="nav-title">Study</div>
        {NAV.map((n) => (
          <button
            type="button"
            key={n.v}
            class={`nav-item ${route.v === n.v || (n.v === 'papers' && route.v === 'paper') || (n.v === 'tools' && route.v === 'tool') ? 'on' : ''}`}
            onClick={() => go({ v: n.v })}
          >
            <span class="nav-ico" aria-hidden="true">
              {n.ico}
            </span>
            {n.label}
            {n.v === 'mock' && mockLive && <span class="chip warn nav-live">live</span>}
          </button>
        ))}
      </div>
      <div class="nav-group">
        <div class="nav-title">Topics by week</div>
        {WEEKS.map((w) => {
          const s = weekStat(state, w.week, ts);
          const lvl = s.attempted < 3 ? 0 : s.acc >= 0.8 ? 3 : s.acc >= 0.6 ? 2 : 1;
          return (
            <button
              type="button"
              key={w.week}
              class={`nav-item ${route.v === 'week' && route.p === w.week ? 'on' : ''}`}
              onClick={() => go({ v: 'week', p: w.week })}
              title={s.attempted ? `${Math.round((s.raw || 0) * 100)}% right on ${s.attempted} questions` : 'Not practised yet'}
            >
              <span class={`nav-ico wk ${w.week >= 7 ? 'late' : ''}`} aria-hidden="true">
                {w.week}
              </span>
              <span class="nav-wtitle" title={w.title}>{w.short}</span>
              <span class={`lvl lvl-${lvl}`} aria-label={['not practised', 'weak', 'getting there', 'strong'][lvl]} />
            </button>
          );
        })}
      </div>
      <p class="rail-foot">Progress is saved in this browser only.</p>
    </nav>
  );
}

export function App() {
  const [route, setRoute] = useState(initialRoute);
  const [open, setOpen] = useState(false);
  // a mock is live while its clock runs (Ask Claude is paused on every page until it's submitted)
  const mockLive = useStore((s) => !!(s.active && !s.active.done && s.active.startedAt + s.active.minutes * 60000 > Date.now()));
  const go = useCallback((r) => {
    setRoute(r);
    setOpen(false);
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
    try {
      const t = '#' + routeToken(r);
      if (location.hash !== t) history.replaceState(null, '', t);
    } catch (e) {}
  }, []);
  useEffect(() => {
    update((d) => (d.sessions = (d.sessions || 0) + 1));
    const onHash = () => go(initialRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const view = (() => {
    switch (route.v) {
      case 'practice':
        return <Practice go={go} init={route.p} />;
      case 'mock':
        return <Mock go={go} />;
      case 'papers':
        return <Papers go={go} />;
      case 'paper':
        return <PaperView go={go} id={route.p} />;
      case 'written':
        return <Written go={go} init={route.p} />;
      case 'sheet':
        return <Sheet go={go} />;
      case 'week':
        return <Week go={go} week={route.p} />;
      case 'tools':
        return <Tools go={go} />;
      case 'tool':
        return <ToolView go={go} id={route.p} />;
      default:
        return <Overview go={go} />;
    }
  })();
  const title =
    route.v === 'week' ? `Week ${route.p}` : route.v === 'paper' ? 'Past papers' : route.v === 'tool' ? 'Visuals & calculators' : NAV.find((n) => n.v === route.v)?.label || 'COMPX310';
  return (
    <div class="shell">
      <Rail route={route} go={go} open={open} mockLive={mockLive} />
      {open && <div class="scrim" onClick={() => setOpen(false)} />}
      <main class="main" id="main">
        <div class="topbar">
          <button type="button" class="btn ghost sm" aria-label="Open menu" onClick={() => setOpen(true)}>
            ☰ Menu
          </button>
          <div class="brand-name">{title}</div>
        </div>
        <div class={`sheet v-${route.v}`} key={route.v + ":" + (route.p ?? "")}>
          <Boundary onReset={() => go({ v: 'home' })}>{view}</Boundary>
        </div>
      </main>
      <AskLayer route={route} paused={mockLive} />
    </div>
  );
}

export { TOPICS };
