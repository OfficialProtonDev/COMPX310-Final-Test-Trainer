// Cheat-sheet builder: one double-sided A4 page, filled with your weak topics first, then the most-tested facts.
import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'preact/hooks';
import { useStore, update } from '../lib/store.js';
import { CHEAT, TOPICS, TOPIC, WEEKS, MOCK_WEEK_QUOTA, TOPICS_BY_WEEK } from '../data/index.js';
import { allTopicStats } from '../lib/stats.js';
import { saveFile, printHtml } from '../lib/claude.js';
import { IS_WEB } from '../lib/host.js';
import { Html, Btn, Seg, Fb, Chip } from '../ui.jsx';
import { sheetCss, SHEET_FONTS, PAGE } from './sheetcss.js';

const PX_PER_MM = 96 / 25.4;
const SAFETY_PX = 7; // keep a little air at the foot of each column so print rendering can't clip a line
const TOPIC_INDEX = Object.fromEntries(TOPICS.map((t, i) => [t.key, i]));
const LIB_INDEX = Object.fromEntries(CHEAT.map((b, i) => [b.id, i]));
const WEEK_SHORT = { 1: 'Intro', 2: 'kNN & trees', 3: 'Linear models', 4: 'Metrics & CV', 5: 'Data prep & GD', 6: 'Neural nets & CNNs', 7: 'Ensembles', 8: 'SVMs', 9: 'Bayes & GPs', 10: 'PCA & clustering', 11: 'NLP & attention', 12: 'Practical & ethics' };

// Space is shared between weeks in proportion to how many of the 40 questions each week gets: the j-th box of a
// week scores quota / (j + 1) (D'Hondt), so Week 10 gets about three times Week 1's space. Inside a week the
// past-paper box goes first, then boxes by importance, round-robin across the week's topics so every topic gets
// its best box before any topic gets a second. Weak topics (marked, or under 60% after 3+ answers) jump the queue.
function weekOrder(blocks) {
  const seen = {};
  const tagged = blocks
    .slice()
    .sort((a, b) => b.imp - a.imp || LIB_INDEX[a.id] - LIB_INDEX[b.id])
    .map((b) => {
      const k = b.topic + ':' + b.imp;
      seen[k] = (seen[k] || 0) + 1;
      return { b, r: seen[k] };
    });
  tagged.sort((x, y) => (y.b.kind === 'qa') - (x.b.kind === 'qa') || y.b.imp - x.b.imp || x.r - y.r || TOPIC_INDEX[x.b.topic] - TOPIC_INDEX[y.b.topic]);
  return tagged.map((x) => x.b);
}

function rankBlocks(ts, cfg, pins, excl) {
  const byWeek = {};
  for (const b of CHEAT) {
    if (excl.has(b.id)) continue;
    if (b.kind === 'qa' && !cfg.qa && !pins.has(b.id)) continue;
    (byWeek[b.week] ||= []).push(b);
  }
  const maxQ = Math.max(...Object.values(MOCK_WEEK_QUOTA));
  const out = [];
  for (const wk of Object.keys(byWeek)) {
    weekOrder(byWeek[wk]).forEach((b, j) => {
      const t = ts[b.topic] || { weakness: 0.45, attempted: 0 };
      const weakTopic = !!(t.flagged || (t.attempted >= 3 && t.weakness >= 0.4));
      let p;
      let why;
      if (pins.has(b.id)) {
        p = 100 + b.imp;
        why = 'Pinned by you';
      } else if (cfg.weakFirst && weakTopic) {
        p = 10 + t.weakness * 4 + b.imp - j * 0.01;
        why = t.flagged ? 'You marked this topic weak' : `Weak topic: ${Math.round((100 * t.ok) / Math.max(1, t.attempted))}% right on ${t.attempted} answered`;
      } else {
        const share = (MOCK_WEEK_QUOTA[b.week] || 1) / maxQ / (j + 1);
        p = share * (0.7 + 0.1 * b.imp) * (0.85 + 0.3 * (t.weakness ?? 0.45));
        why = b.kind === 'qa' ? 'Past-paper answers (questions get reused)' : b.imp === 3 ? 'Often tested / easy to confuse' : b.imp === 2 ? 'Useful' : 'Nice to have';
      }
      out.push({ b, p, why, pinned: pins.has(b.id), weak: weakTopic });
    });
  }
  return out.sort((x, y) => y.p - x.p);
}

function orderItems(ids) {
  const blocks = [...ids].map((id) => CHEAT.find((b) => b.id === id)).filter(Boolean);
  blocks.sort((a, b) => a.week - b.week || TOPIC_INDEX[a.topic] - TOPIC_INDEX[b.topic] || LIB_INDEX[a.id] - LIB_INDEX[b.id]);
  const items = [{ key: '__title', type: 'title' }];
  let wk = null;
  for (const b of blocks) {
    if (b.week !== wk) {
      wk = b.week;
      items.push({ key: 'wk-' + wk, type: 'wk', week: wk });
    }
    items.push({ key: b.id, type: 'block', b });
  }
  return items;
}

function pack(items, H, ncols, colH) {
  const cols = Array.from({ length: ncols }, () => ({ items: [], h: 0 }));
  let c = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const h = H[it.key] ?? 0;
    const need = it.type === 'wk' && items[i + 1] ? h + (H[items[i + 1].key] ?? 0) : h;
    while (c < ncols && cols[c].items.length && cols[c].h + need > colH) c++;
    if (c >= ncols || need > colH) return { ok: false, cols };
    cols[c].items.push(it);
    cols[c].h += h;
  }
  return { ok: true, cols };
}

function autoFill(ranked, H, ncols, colH) {
  const chosen = new Set();
  const didntFit = new Set();
  for (const r of ranked) {
    if (H[r.b.id] == null) continue;
    chosen.add(r.b.id);
    if (!pack(orderItems(chosen), H, ncols, colH).ok) {
      chosen.delete(r.b.id);
      didntFit.add(r.b.id);
    }
  }
  return { chosen, didntFit, layout: pack(orderItems(chosen), H, ncols, colH) };
}

function SheetBlock({ b, mid }) {
  return (
    <div class="cs-block" data-mid={mid}>
      <div class="cs-t">
        <span>{b.title}</span>
      </div>
      <Html as="div" class="cs-content" html={b.html} />
    </div>
  );
}

function Item({ it, title }) {
  if (it.type === 'title')
    return (
      <div class="cs-title" data-mid="__title">
        {title}
        <small>Weeks 1–12 in order · built {new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</small>
      </div>
    );
  if (it.type === 'wk')
    return (
      <div class="cs-wkhead" data-mid={'wk-' + it.week}>
        W{it.week} · {WEEK_SHORT[it.week]}
      </div>
    );
  return <SheetBlock b={it.b} mid={it.b.id} />;
}

function useWidth(ref) {
  const [w, setW] = useState(800);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return w;
}

export function Sheet({ go }) {
  const state = useStore();
  const cfg = state.sheet;
  const ncolsPage = cfg.cols;
  const ncols = ncolsPage * 2;
  const pins = useMemo(() => new Set([...(cfg.include || []), ...Object.keys(state.pinnedBlocks || {})]), [cfg.include, state.pinnedBlocks]);
  const excl = useMemo(() => new Set(cfg.exclude || []), [cfg.exclude]);
  const ts = allTopicStats(state);
  const ranked = useMemo(() => rankBlocks(ts, cfg, pins, excl), [JSON.stringify(ts), cfg.weakFirst, cfg.qa, pins, excl]);

  const colWmm = (PAGE.w - 2 * PAGE.pad - (ncolsPage - 1) * PAGE.gap) / ncolsPage;
  const colH = (PAGE.h - 2 * PAGE.pad) * PX_PER_MM - SAFETY_PX;

  // measure every block at the current font and column width
  const measRef = useRef(null);
  const [H, setH] = useState(null);
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    let live = true;
    try {
      document.fonts && document.fonts.ready.then(() => live && setFontsTick((n) => n + 1));
    } catch (e) {}
    return () => (live = false);
  }, []);
  useLayoutEffect(() => {
    const root = measRef.current;
    if (!root) return;
    const out = {};
    root.querySelectorAll('[data-mid]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const mb = parseFloat(getComputedStyle(el).marginBottom) || 0;
      out[el.getAttribute('data-mid')] = r.height + mb;
    });
    setH(out);
  }, [cfg.font, cfg.cols, fontsTick, CHEAT.length, cfg.title]);

  const result = useMemo(() => (H ? autoFill(ranked, H, ncols, colH) : null), [H, ranked, ncols, colH]);

  const pvRef = useRef(null);
  const pvW = useWidth(pvRef);
  const pageWpx = PAGE.w * PX_PER_MM;
  const pageHpx = PAGE.h * PX_PER_MM;
  const sc = Math.min(1, (pvW - 2) / pageWpx);

  const setCfg = (patch) => update((d) => (d.sheet = { ...d.sheet, ...patch }));
  const togglePin = (id) =>
    update((d) => {
      const inc = new Set(d.sheet.include || []);
      if (inc.has(id) || d.pinnedBlocks[id]) {
        inc.delete(id);
        delete d.pinnedBlocks[id];
      } else inc.add(id);
      d.sheet.include = [...inc];
      d.sheet.exclude = (d.sheet.exclude || []).filter((x) => x !== id);
    });
  const toggleExcl = (id) =>
    update((d) => {
      const ex = new Set(d.sheet.exclude || []);
      ex.has(id) ? ex.delete(id) : ex.add(id);
      d.sheet.exclude = [...ex];
      d.sheet.include = (d.sheet.include || []).filter((x) => x !== id);
      delete d.pinnedBlocks[id];
    });
  const reset = () =>
    update((d) => {
      d.sheet.include = [];
      d.sheet.exclude = [];
      d.pinnedBlocks = {};
    });

  const [saveMsg, setSaveMsg] = useState(null);
  const [copyHtml, setCopyHtml] = useState(null);
  const buildHtml = () => {
    const pages = [...document.querySelectorAll('.cs-preview .cs-page')].map((p) => p.outerHTML).join('\n');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>COMPX310 cheat sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${SHEET_FONTS}">
<style>@page{size:A4;margin:0}html,body{margin:0;background:#c9ccd1}.cs-page{margin:8mm auto;box-shadow:0 2px 10px rgba(0,0,0,.25)}.note{font:14px/1.5 system-ui,sans-serif;max-width:190mm;margin:8mm auto 0;padding:10px 14px;background:#fff;color:#111;border-radius:6px}
@media print{html,body{background:#fff}.note{display:none}.cs-page{margin:0;box-shadow:none;break-after:page;page-break-after:always}.cs-page:last-of-type{break-after:auto;page-break-after:auto}}
${sheetCss(cfg.font)}
.cs-col{align-self:stretch;overflow:hidden}</style></head><body>
<div class="note"><b>To print:</b> Ctrl/Cmd + P → Paper <b>A4</b> · Margins <b>None</b> · Scale <b>100%</b> (Default/Actual size) · <b>Two-sided</b>, flip on long edge · tick <b>Background graphics</b>. Open this file while online once so its fonts load. This note doesn't print.</div>
${pages}
<script>
/* If this computer renders the fonts slightly larger than the builder did, shrink the text until every column fits. */
(function () {
  function overflowing() {
    var cols = document.querySelectorAll('.cs-col');
    for (var i = 0; i < cols.length; i++) if (cols[i].scrollHeight > cols[i].clientHeight + 1) return true;
    return false;
  }
  function fit() {
    var pages = document.querySelectorAll('.cs-page');
    var size = parseFloat(getComputedStyle(pages[0]).fontSize);
    for (var n = 0; n < 25 && overflowing(); n++) {
      size *= 0.985;
      for (var j = 0; j < pages.length; j++) pages[j].style.fontSize = size + 'px';
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else window.addEventListener('load', fit);
  window.addEventListener('beforeprint', fit);
})();
</script>
</body></html>`;
  };
  const doSave = async () => {
    setSaveMsg('Preparing…');
    setCopyHtml(null);
    const html = buildHtml();
    const r = await saveFile('COMPX310-cheat-sheet.html', html);
    if (r === 'saved')
      setSaveMsg(
        IS_WEB
          ? 'Downloaded COMPX310-cheat-sheet.html. Open it in your browser and print it (instructions are at the top), or use Print now.'
          : 'Saved. Open the file in your browser and print it (instructions are at the top of the file).'
      );
    else if (r === 'declined') setSaveMsg('Save cancelled.');
    else {
      setSaveMsg('Saving files isn’t available in this view. Copy the page’s HTML instead, paste it into a new file named cheat-sheet.html, then open and print it.');
      setCopyHtml(html);
    }
  };
  // web copy: print straight from the page (the frame inside Claude can't open the print dialog)
  const doPrint = () => {
    setCopyHtml(null);
    const ok = printHtml(buildHtml());
    setSaveMsg(
      ok
        ? 'In the print dialog choose Paper A4, Margins None, Scale 100% (Default), Two-sided (flip on long edge) and Background graphics on.'
        : 'Printing didn’t start. Use Download instead, then open the file and print it.'
    );
  };
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyHtml || buildHtml());
      setSaveMsg('Copied. Paste into a text file, save it as cheat-sheet.html, open it in your browser and print.');
    } catch (e) {
      setCopyHtml(copyHtml || buildHtml());
      setSaveMsg('Copying was blocked. Select the text in the box below and copy it.');
    }
  };

  const cols = result ? result.layout.cols : [];
  const pageFill = (p) => {
    const cs = cols.slice(p * ncolsPage, (p + 1) * ncolsPage);
    return cs.reduce((s, c) => s + c.h, 0) / (ncolsPage * colH);
  };
  const onSheet = result ? ranked.filter((r) => result.chosen.has(r.b.id)) : [];
  const offSheet = result ? ranked.filter((r) => !result.chosen.has(r.b.id)) : [];
  const excluded = CHEAT.filter((b) => excl.has(b.id));
  const weakTopics = TOPICS.filter((t) => ts[t.key].flagged || (ts[t.key].attempted >= 3 && ts[t.key].weakness >= 0.4));

  return (
    <div class="stack sheet-view">
      <style>{sheetCss(cfg.font)}</style>
      <header class="page-head">
        <div class="h-kicker">Cheat sheet builder · one double-sided A4</div>
        <h1 class="h-title">Your cheat sheet</h1>
        <p class="h-sub">
          It fills the front and back with your weakest topics first. The rest of the space goes to each week in proportion to how many of the 40 questions it
          gets: past-paper answers first, then the most-tested facts. Practise more or mark topics weak on their week pages and it re-orders itself. ★ forces
          a box on; ⊘ keeps it off.
        </p>
      </header>

      {CHEAT.length === 0 ? (
        <div class="empty">The key-fact boxes are still being written. Check back shortly.</div>
      ) : (
        <>
          <div class="card stack-sm sheet-controls">
            <div class="row">
              <div class="field">
                <span class="label">Text size</span>
                <Seg label="Text size" value={cfg.font} onChange={(v) => setCfg({ font: v })} options={[6, 6.5, 7, 7.5].map((v) => ({ value: v, label: v + ' pt' }))} />
              </div>
              <div class="field">
                <span class="label">Columns per side</span>
                <Seg label="Columns" value={cfg.cols} onChange={(v) => setCfg({ cols: v })} options={[3, 4, 5].map((v) => ({ value: v, label: String(v) }))} />
              </div>
              <label class="check-row">
                <input type="checkbox" checked={cfg.weakFirst} onChange={(e) => setCfg({ weakFirst: e.currentTarget.checked })} /> Weak topics first
              </label>
              <label class="check-row">
                <input type="checkbox" checked={cfg.qa} onChange={(e) => setCfg({ qa: e.currentTarget.checked })} /> Past-paper Q→A lines
              </label>
            </div>
            <div class="row">
              <label class="field grow">
                <span class="label">Heading</span>
                <input class="input" value={cfg.title} maxLength={80} onInput={(e) => setCfg({ title: e.currentTarget.value })} />
              </label>
            </div>
            <div class="row">
              {IS_WEB ? (
                <>
                  <Btn kind="primary" onClick={doPrint}>
                    Print now
                  </Btn>
                  <Btn onClick={doSave}>Download</Btn>
                </>
              ) : (
                <>
                  <Btn kind="primary" onClick={doSave}>
                    Save for printing
                  </Btn>
                  <Btn onClick={doCopy}>Copy HTML</Btn>
                </>
              )}
              <Btn kind="ghost" onClick={reset}>
                Clear my ★ and ⊘
              </Btn>
              <span class="small muted">
                {result ? `${result.chosen.size} of ${CHEAT.length} boxes fit · front ${Math.round(pageFill(0) * 100)}% · back ${Math.round(pageFill(1) * 100)}% full` : 'Measuring…'}
              </span>
            </div>
            {saveMsg && <Fb kind="info">{saveMsg}</Fb>}
            {copyHtml && <textarea class="input code" rows={4} readOnly value={copyHtml} onFocus={(e) => e.currentTarget.select()} aria-label="Cheat sheet HTML" />}
            {cfg.weakFirst && (
              <div class="small muted">
                Weak topics right now:{' '}
                {weakTopics.length ? weakTopics.map((t) => t.name).join(', ') : 'none yet — practise a few questions per week, or mark topics weak on their week pages.'}
              </div>
            )}
          </div>

          <div class="sheet-layout">
            <div class="cs-preview" ref={pvRef}>
              {[0, 1].map((p) => (
                <div class="cs-side" key={p}>
                  <div class="cs-side-label small">
                    <b>{p === 0 ? 'Front' : 'Back'}</b> · {Math.round(pageFill(p) * 100)}% full
                  </div>
                  <div class="cs-scaler" style={{ height: pageHpx * sc + 'px', width: pageWpx * sc + 'px' }}>
                    <div style={{ transform: `scale(${sc})`, transformOrigin: 'top left', width: pageWpx + 'px' }}>
                      <div class="cs-page">
                        {cols.slice(p * ncolsPage, (p + 1) * ncolsPage).map((c, i) => (
                          <div class="cs-col" key={i} style={{ width: colWmm + 'mm' }}>
                            {c.items.map((it) => (
                              <Item key={it.key} it={it} title={cfg.title} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div class="card stack-sm sheet-list">
              <h2 class="h2">On the sheet ({onSheet.length})</h2>
              <div class="bl">
                {onSheet.map((r) => (
                  <BlockRow key={r.b.id} r={r} on pinned={pins.has(r.b.id)} onPin={togglePin} onExcl={toggleExcl} go={go} />
                ))}
              </div>
              <h2 class="h2">Didn’t fit ({offSheet.length})</h2>
              <p class="small muted">Pin one (★) to force it on; the lowest-priority boxes drop off to make room.</p>
              <div class="bl">
                {offSheet.map((r) => (
                  <BlockRow key={r.b.id} r={r} pinned={pins.has(r.b.id)} onPin={togglePin} onExcl={toggleExcl} go={go} />
                ))}
              </div>
              {excluded.length > 0 && (
                <>
                  <h2 class="h2">Kept off ({excluded.length})</h2>
                  <div class="bl">
                    {excluded.map((b) => (
                      <div class="bl-row off" key={b.id}>
                        <span class="bl-title">{b.title}</span>
                        <Chip>W{b.week}</Chip>
                        <button type="button" class="btn sm ghost" onClick={() => toggleExcl(b.id)}>
                          Allow
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* hidden measuring column */}
          <div class="cs-measure" aria-hidden="true" ref={measRef}>
            <div class="cs-page cs-page-measure">
              <div class="cs-col" style={{ width: colWmm + 'mm' }}>
                <Item it={{ type: 'title' }} title={cfg.title} />
                {WEEKS.map((w) => (
                  <Item key={w.week} it={{ type: 'wk', week: w.week }} />
                ))}
                {CHEAT.map((b) => (
                  <SheetBlock key={b.id} b={b} mid={b.id} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BlockRow({ r, on, pinned, onPin, onExcl, go }) {
  const t = TOPIC[r.b.topic];
  return (
    <div class={`bl-row ${on ? 'on' : 'off'} ${r.weak ? 'weak' : ''}`}>
      <span class="bl-mark" aria-hidden="true">
        {on ? '●' : '○'}
      </span>
      <span class="bl-main">
        <span class="bl-title">{r.b.title}</span>
        <span class="small faint">
          <button type="button" class="linkish" onClick={() => go({ v: 'week', p: r.b.week })}>
            W{r.b.week} {t?.name}
          </button>{' '}
          · {r.why}
        </span>
      </span>
      <button type="button" class={`pin ${pinned ? 'on' : ''}`} aria-pressed={pinned} aria-label={pinned ? 'Unpin' : 'Pin on the sheet'} title={pinned ? 'Unpin' : 'Always include'} onClick={() => onPin(r.b.id)}>
        {pinned ? '★' : '☆'}
      </button>
      <button type="button" class="pin" aria-label="Keep off the sheet" title="Keep off the sheet" onClick={() => onExcl(r.b.id)}>
        ⊘
      </button>
    </div>
  );
}
