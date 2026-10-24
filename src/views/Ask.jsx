// Highlight any text (or press "Ask Claude" on a question) to ask about it in a side panel.
import { useState, useEffect, useRef } from 'preact/hooks';
import { getSample, useClaude, errorCopy, COURSE, askOnClaude, askPrompt } from '../lib/claude.js';
import { IS_WEB } from '../lib/host.js';
import { md } from '../lib/md.js';
import { Btn } from '../ui.jsx';

let opener = null;
/** Open the panel from code: { quote, context, suggest } */
export function openAsk(payload) {
  if (opener) opener(payload);
}

const CHIPS = ['Explain this simply', 'Why is that the answer?', 'Give me a concrete example', 'How could the test ask about this?', 'What do people confuse this with?'];

function contextAround(range) {
  try {
    let el = range.commonAncestorContainer;
    if (el.nodeType !== 1) el = el.parentElement;
    const block = el.closest('.question, .mq, .qblock, .fact, .wg, .card, section, article') || el;
    return (block.innerText || '').slice(0, 2500);
  } catch (e) {
    return '';
  }
}

export function AskLayer({ route, paused }) {
  const claude = useClaude();
  // 'panel': ask inside the page (Claude-hosted copy); 'link': the web copy opens claude.ai in a new tab instead
  const mode = claude === 'ready' ? 'panel' : IS_WEB ? 'link' : null;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [note, setNote] = useState('');
  const noteTimer = useRef(null);
  const flash = (t) => {
    setNote(t);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 5000);
  };
  const routeRef = useRef(route);
  routeRef.current = route;
  const askLink = (p) =>
    askOnClaude(askPrompt({ quote: p.quote, context: p.context, where: routeName(routeRef.current), ask: p.ask })).then(({ prefilled, copied }) =>
      flash(prefilled ? 'Opened Claude in a new tab with your question.' + (copied ? ' It’s copied too.' : '') : copied ? 'Opened Claude in a new tab. Paste your question there (it’s copied).' : 'Opened Claude in a new tab.')
    );
  const [fab, setFab] = useState(null); // {x, y, quote, context}
  const [panel, setPanel] = useState(null); // {quote, context, turns:[], suggest}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ctl = useRef(null);
  const bodyRef = useRef(null);
  const panelRef = useRef(null);
  const isOpen = !!panel;
  // move focus into the panel when it opens; Escape closes it
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    try {
      panelRef.current && panelRef.current.focus({ preventScroll: true });
    } catch (e) {}
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      ctl.current?.abort();
      setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      try {
        if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
      } catch (e) {}
    };
  }, [isOpen]);

  useEffect(() => {
    opener = (p) => {
      if (modeRef.current === 'link') return askLink({ quote: p.quote, context: p.context || '', ask: p.ask });
      setPanel({ quote: p.quote, context: p.context || '', turns: [] });
      setInput(p.suggest || '');
      setErr('');
    };
    return () => (opener = null);
  }, []);

  useEffect(() => {
    if (!mode || paused) {
      setFab(null);
      return;
    }
    const onUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return setFab(null);
        const text = sel.toString().trim();
        if (text.length < 2 || text.length > 1500) return setFab(null);
        const range = sel.getRangeAt(0);
        const anc = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
        if (anc && anc.closest && anc.closest('.ask-panel, textarea, input')) return;
        const r = range.getBoundingClientRect();
        const x = Math.min(window.innerWidth - 150, Math.max(12, r.left + r.width / 2 - 60));
        const y = r.bottom + 10 > window.innerHeight - 60 ? Math.max(12, r.top - 46) : r.bottom + 10;
        setFab({ x, y, quote: text, context: contextAround(range) });
      }, 10);
    };
    const onDown = (e) => {
      if (e.target.closest && e.target.closest('.ask-fab')) return;
      setFab(null);
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('mousedown', onDown);
    };
  }, [mode, paused]);

  // close the panel when the view changes, so it never covers a fresh page
  const routeKey = route.v + ':' + JSON.stringify(route.p ?? '');
  const lastRoute = useRef(routeKey);
  useEffect(() => {
    if (lastRoute.current !== routeKey) {
      lastRoute.current = routeKey;
      ctl.current?.abort();
      setPanel(null);
      setFab(null);
      setNote('');
    }
  }, [routeKey]);

  useEffect(() => {
    if (paused && panel) {
      ctl.current?.abort();
      setPanel(null);
    }
  }, [paused]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [panel]);

  if (!mode) return null;
  if (mode === 'link')
    return (
      <>
        {fab && (
          <button
            type="button"
            class="ask-fab"
            style={{ left: fab.x + 'px', top: fab.y + 'px' }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              askLink({ quote: fab.quote, context: fab.context });
              setFab(null);
            }}
            title="Opens claude.ai in a new tab with this question"
          >
            <span aria-hidden="true">✦</span> Ask Claude <span aria-hidden="true">↗</span>
          </button>
        )}
        {note && (
          <div class="toast" role="status">
            {note}
          </div>
        )}
      </>
    );

  const send = async (q) => {
    const question = (q ?? input).trim();
    if (!question || busy || !panel) return;
    const sample = await getSample();
    if (!sample) return;
    const rules = `${COURSE}

You are a patient tutor helping a student revise for this test. Stay within what the course covers and use its terms. Be concise: under 170 words unless asked for more, short paragraphs or a few bullets, no preamble. If the highlighted text is a test question, explain the reasoning behind the right answer and why tempting alternatives are wrong. If something on the page looks wrong, say so plainly.

The page the student is on: ${routeName(route)}.
Text around the highlight:
"""
${panel.context.slice(0, 2500)}
"""
Highlighted text:
"""
${panel.quote.slice(0, 1500)}
"""`;
    const turns = [...panel.turns, { role: 'user', content: question }];
    const msgs = [{ role: 'user', content: rules }, ...turns.slice(-8)];
    // the first turn must be the rules; merge consecutive user turns is fine per the API
    setPanel({ ...panel, turns: [...turns, { role: 'assistant', content: '', pending: true }] });
    setInput('');
    setBusy(true);
    setErr('');
    ctl.current = new AbortController();
    try {
      const { text } = await sample(msgs, {
        cache: false,
        signal: ctl.current.signal,
        onText: ({ text }) => setPanel((p) => p && { ...p, turns: [...turns, { role: 'assistant', content: text, pending: true }] }),
      });
      setPanel((p) => p && { ...p, turns: [...turns, { role: 'assistant', content: text }] });
    } catch (e) {
      const keep = e && e.text;
      setPanel((p) => p && { ...p, turns: keep ? [...turns, { role: 'assistant', content: keep + ' …' }] : turns });
      const m = errorCopy(e);
      if (m) setErr(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {fab && !panel && (
        <button
          type="button"
          class="ask-fab"
          style={{ left: fab.x + 'px', top: fab.y + 'px' }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setPanel({ quote: fab.quote, context: fab.context, turns: [] });
            setFab(null);
            setInput('');
            setErr('');
          }}
        >
          <span aria-hidden="true">✦</span> Ask Claude
        </button>
      )}
      {panel && (
        <aside class="ask-panel" role="dialog" aria-label="Ask Claude" tabIndex={-1} ref={panelRef}>
          <div class="ask-head">
            <span class="ask-title">
              <span aria-hidden="true">✦</span> Ask Claude
            </span>
            <span class="spacer" />
            <button
              type="button"
              class="ask-x"
              aria-label="Close"
              onClick={() => {
                ctl.current?.abort();
                setPanel(null);
              }}
            >
              ×
            </button>
          </div>
          <div class="ask-body" ref={bodyRef}>
            <figure class="ask-quote">
              <blockquote>{panel.quote}</blockquote>
              <figcaption>Highlighted</figcaption>
            </figure>
            {panel.turns.length === 0 && (
              <div class="ask-chips">
                {CHIPS.map((c) => (
                  <button type="button" key={c} class="drill-chip" onClick={() => send(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {panel.turns.map((t, i) =>
              t.role === 'user' ? (
                <div class="ask-q" key={i}>
                  {t.content}
                </div>
              ) : t.content ? (
                <div class="ask-a" key={i} dangerouslySetInnerHTML={{ __html: md(t.content) }} />
              ) : (
                <div class="ask-thinking" key={i}>
                  <span class="ask-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Thinking… <span class="faint">(the first answer can take a little while)</span>
                </div>
              )
            )}
            {err && <div class="ask-err">{err}</div>}
          </div>
          <form
            class="ask-foot"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              class="input"
              rows={2}
              placeholder={panel.turns.length ? 'Ask a follow-up…' : 'Ask about the highlighted text…'}
              aria-label="Your question"
              value={input}
              onInput={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            {busy ? (
              <Btn onClick={() => ctl.current?.abort()}>Stop</Btn>
            ) : (
              <Btn kind="primary" type="submit" disabled={!input.trim()}>
                Ask
              </Btn>
            )}
          </form>
          <p class="ask-note">Uses your own Claude account. Answers can be wrong — check them against the slides.</p>
        </aside>
      )}
    </>
  );
}

function routeName(r) {
  if (r.v === 'week') return `Week ${r.p} topic page`;
  return { home: 'overview', practice: 'practice questions', papers: 'past papers', paper: `past paper ${r.p}`, written: 'written-answer practice', sheet: 'cheat sheet builder', tools: 'visuals', tool: `interactive visual ${r.p}`, mock: 'mock test review' }[r.v] || r.v;
}
