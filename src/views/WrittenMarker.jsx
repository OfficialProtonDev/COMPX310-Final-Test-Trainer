// Marking for a written answer: Claude against the mark points, or a self-mark checklist.
import { useState } from 'preact/hooks';
import { Html, Btn, Fb } from '../ui.jsx';
import { useClaude, markWritten, errorCopy, askOnClaude, markingPrompt, copyText } from '../lib/claude.js';
import { IS_WEB } from '../lib/host.js';
import { fmt } from '../lib/svg.js';

/** marks: { claude?: {points, total, feedback}, self?: {[i]: m} } ; onChange(newMarks) */
export function WrittenMarker({ w, text, marks = {}, onChange, showModel = true }) {
  const claude = useClaude();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(IS_WEB); // the checklist is the main way to mark in the web copy
  const [webMsg, setWebMsg] = useState('');
  const [manual, setManual] = useState('');
  const markElsewhere = () => {
    const pr = markingPrompt(w, text);
    askOnClaude(pr).then(({ prefilled, copied }) => {
      if (prefilled) setWebMsg('Opened Claude in a new tab with your answer and the mark scheme.');
      else if (copied) setWebMsg('Opened Claude in a new tab. Paste the marking prompt there (it’s copied).');
      else setWebMsg('Opened Claude in a new tab, but your browser blocked copying. Copy the prompt from the box below.');
      setManual(!prefilled && !copied ? pr : '');
    });
  };
  const copyMarking = () => {
    const pr = markingPrompt(w, text);
    copyText(pr).then((ok) => {
      setWebMsg(ok ? 'Marking prompt copied. Paste it into Claude or any assistant.' : 'Your browser blocked copying. Copy the prompt from the box below.');
      setManual(ok ? '' : pr);
    });
  };
  const self = marks.self || {};
  const selfTotal = w.points.reduce((s, _, i) => s + (self[i] || 0), 0);
  const empty = !text || !text.trim();
  // Claude's mark belongs to the text it marked; after an edit it's out of date until marked again
  const stale = !!(marks.claude && marks.claude.forText != null && marks.claude.forText !== text);
  const counting = bestMarkSource(marks, text);

  const mark = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await markWritten(w, text);
      onChange({ ...marks, claude: { ...r, forText: text, at: Date.now() } });
    } catch (e) {
      setErr(errorCopy(e));
    } finally {
      setBusy(false);
    }
  };
  const setSelf = (i, m) => onChange({ ...marks, self: { ...self, [i]: m }, selfAt: Date.now() });

  return (
    <div class="wmark stack-sm">
      {empty ? (
        <Fb kind="hint">No answer written, so 0 / {w.marks}. Read the model answer below.</Fb>
      ) : (
        <div class="row">
          {claude === 'ready' && (
            <Btn kind="primary" size="sm" disabled={busy} onClick={mark}>
              {busy ? 'Claude is marking…' : marks.claude ? 'Mark again with Claude' : 'Mark with Claude'}
            </Btn>
          )}
          {claude === 'pending' && <span class="small faint">Checking whether Claude marking is available…</span>}
          {claude === 'off' && !IS_WEB && <span class="small muted">Self-mark with the checklist below.</span>}
          {claude === 'off' && IS_WEB && (
            <>
              <Btn kind="primary" size="sm" onClick={markElsewhere} title="Opens claude.ai in a new tab with your answer and the mark scheme">
                Have Claude mark it <span aria-hidden="true">↗</span>
              </Btn>
              <Btn size="sm" onClick={copyMarking}>
                Copy marking prompt
              </Btn>
              <span class="small muted">or tick the mark points below.</span>
            </>
          )}
          {marks.claude && !stale && (
            <span class="mq-score part">
              Claude: {fmt(marks.claude.total, 1)} / {w.marks}
            </span>
          )}
          {counting && (
            <span class="small muted">Counting {counting === 'claude' ? 'Claude’s mark' : 'your checklist'} (the latest).</span>
          )}
        </div>
      )}
      {webMsg && !empty && <Fb kind="info">{webMsg}</Fb>}
      {manual && !empty && <textarea class="input code" rows={5} readOnly value={manual} onFocus={(e) => e.currentTarget.select()} aria-label="Marking prompt" />}
      {stale && !empty && <Fb kind="hint">You’ve edited your answer since Claude marked it, so that mark no longer counts. Mark it again to update the score.</Fb>}
      {err && <Fb kind="hint">{err}</Fb>}
      {marks.claude && !empty && !stale && (
        <div class="mark-result">
          {marks.claude.points.map((p, i) => (
            <div class="mark-point" key={i}>
              <span class={`m ${p.awarded >= w.points[i].m ? 'status ok' : p.awarded > 0 ? '' : 'status bad'}`}>
                {p.awarded >= w.points[i].m ? '✓' : p.awarded > 0 ? '½' : '✗'}
              </span>
              <div>
                <Html html={w.points[i].text} />
                {p.why && <div class="small muted">{p.why}</div>}
              </div>
              <span class="nums small">
                {fmt(p.awarded, 1)}/{fmt(w.points[i].m, 1)}
              </span>
            </div>
          ))}
          {marks.claude.feedback && <Fb kind="info">{marks.claude.feedback}</Fb>}
        </div>
      )}
      <details class="sol" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>
          Self-mark checklist {selfTotal > 0 && <span class="nums">· {fmt(selfTotal, 1)} / {w.marks}</span>}
        </summary>
        <div>
          {w.points.map((p, i) => (
            <div class="selfrow" key={i}>
              <div class="seg sm" role="group" aria-label={`Marks for point ${i + 1}`}>
                {[0, p.m / 2, p.m]
                  .filter((v, k, a) => a.indexOf(v) === k)
                  .map((v) => (
                    <button type="button" key={v} class={(self[i] || 0) === v ? 'on' : ''} onClick={() => setSelf(i, v)}>
                      {fmt(v, 1)}
                    </button>
                  ))}
              </div>
              <Html html={p.text} />
            </div>
          ))}
        </div>
      </details>
      {showModel && (
        <details class="sol">
          <summary>Model answer</summary>
          <div>
            <Html as="div" class="rich" html={w.model} />
          </div>
        </details>
      )}
    </div>
  );
}

/** Which mark counts: the most recent of Claude's (if it was for this text) and the self-mark checklist. */
export function bestMarkSource(marks, text) {
  const cOk = !!(marks?.claude && (marks.claude.forText == null || text == null || marks.claude.forText === text));
  const sOk = !!(marks?.self && Object.keys(marks.self).length);
  if (cOk && sOk) return (marks.selfAt || 0) > (marks.claude.at || 0) ? 'self' : 'claude';
  return cOk ? 'claude' : sOk ? 'self' : null;
}
export const bestMark = (marks, text) => {
  const src = bestMarkSource(marks, text);
  return src === 'claude' ? marks.claude.total : src === 'self' ? Object.values(marks.self).reduce((a, b) => a + b, 0) : null;
};
