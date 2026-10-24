// One multiple-choice question with instant feedback (used by practice and paper practice).
import { useEffect } from 'preact/hooks';
import { Html, Chip, Btn } from '../ui.jsx';
import { TOPIC, isCorrect, correctList, optionLabel, PAPER_SHORT } from '../data/index.js';
import { useClaude } from '../lib/claude.js';
import { useStore } from '../lib/store.js';
import { openAsk } from './Ask.jsx';
import { IS_WEB } from '../lib/host.js';

const FLAG_TEXT = {
  slip: 'Official key looks wrong',
  ambiguous: 'Ambiguous',
  'two-accepted': 'Two answers accepted',
  'out-of-scope': 'Not in this term’s slides',
  'image-missing': 'Picture missing',
};

export function FlagChip({ flag, note }) {
  if (!flag) return null;
  return (
    <Chip kind={flag === 'slip' || flag === 'ambiguous' ? 'warn' : flag === 'out-of-scope' ? '' : 'blue'} title={note}>
      ⚑ {FLAG_TEXT[flag] || flag}
    </Chip>
  );
}

export function QuestionCard({ q, pick, onPick, onNext, go, number, nextLabel = 'Next question', showTopic = true }) {
  const answered = pick != null;
  const ok = answered && isCorrect(q, pick);
  const claude = useClaude();
  const mockLive = useStore((s) => !!(s.active && !s.active.done && s.active.startedAt + s.active.minutes * 60000 > Date.now()));
  const labels = (i) => optionLabel(q.paperId, i);

  useEffect(() => {
    const onKey = (e) => {
      const tg = e.target;
      if (tg && tg.closest && tg.closest('input, textarea, select, [contenteditable="true"], .ask-panel, .wg')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      // Enter or Space on a focused button or link (Ask Claude, the topic chip, Next) should press that control
      // (but not an answer option: after a mouse answer the disabled option keeps focus, and Enter should still go on)
      if ((k === 'enter' || k === ' ') && tg && tg.closest && tg.closest('button, a, [role="button"]') && !tg.closest('.opts')) return;
      if (!answered) {
        const idx = /^[1-9]$/.test(k) ? +k - 1 : 'abcde'.indexOf(k);
        if (idx >= 0 && idx < q.options.length) {
          e.preventDefault();
          onPick(idx);
        }
      } else if ((k === 'enter' || k === 'arrowright' || k === 'n') && onNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, q, onPick, onNext]);

  const t = TOPIC[q.topic];
  const right = correctList(q);
  return (
    <article class="question qcard" aria-live="polite">
      <div class="qmeta">
        {number != null && <span class="qnum">Q{number}</span>}
        {showTopic && t && (
          <button type="button" class="chip src linkchip" onClick={() => go && go({ v: 'week', p: t.week })} title="Open this week's page">
            W{t.week} · {t.name}
          </button>
        )}
        {q.origin === 'paper' && <Chip kind="blue">{PAPER_SHORT[q.paperId] || 'Past paper'}</Chip>}
        <FlagChip flag={q.flag} note={q.note} />
      </div>
      <Html as="div" class="qtext" html={q.q} />
      <div class="opts" role="group" aria-label="Options">
        {q.options.map((o, i) => {
          let cls = 'opt';
          if (answered) {
            if (right.includes(i)) cls += ' right';
            else if (i === pick) cls += ' wrong';
          }
          return (
            <button type="button" key={i} class={cls} disabled={answered} aria-pressed={pick === i} onClick={() => onPick(i)}>
              <span class="key">{labels(i)}</span>
              <Html html={o} />
              {answered && right.includes(i) && <span class="opt-tag good">✓</span>}
              {answered && i === pick && !right.includes(i) && <span class="opt-tag bad">your answer</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div class={`fb ${ok ? 'good' : 'bad'}`}>
          <span class="mark" aria-hidden="true">
            {ok ? '✓' : '✗'}
          </span>
          <div class="stack-sm">
            <div>
              <b>{ok ? 'Correct.' : `Not quite — the answer is ${right.map(labels).join(' or ')}.`}</b> <Html html={q.explain} />
            </div>
            {q.note && <div class="small muted">Note: {q.note}</div>}
            <div class="small faint">Source: {q.src}</div>
          </div>
        </div>
      )}
      {answered && (
        <div class="row">
          {onNext && (
            <Btn kind="primary" onClick={onNext}>
              {nextLabel} <span class="kbd-hint">Enter</span>
            </Btn>
          )}
          {(claude === 'ready' || IS_WEB) && !mockLive && (
            <Btn
              kind="ghost"
              title={IS_WEB ? 'Opens claude.ai in a new tab with this question' : undefined}
              onClick={() =>
                openAsk({
                  quote: `${stripTags(q.q)}\nOptions: ${q.options.map((o, i) => `${labels(i)}) ${stripTags(o)}`).join('  ')}\nCorrect: ${right.map(labels).join(' or ')}${pick != null ? `; I picked ${labels(pick)}` : ''}`,
                  context: `Practice question. Official explanation: ${stripTags(q.explain)}`,
                  suggest: ok ? 'Explain why the other options are wrong.' : 'Why is my answer wrong and the correct one right?',
                  ask: ok
                    ? 'This is a multiple-choice practice question I got right. Briefly explain why the correct answer is right and why each other option is wrong, in the course’s terms.'
                    : 'This is a multiple-choice practice question I got wrong. Briefly explain why my answer is wrong and the correct one is right, in the course’s terms.',
                })
              }
            >
              {IS_WEB ? (
                <>
                  Ask Claude about this <span aria-hidden="true">↗</span>
                </>
              ) : (
                'Ask Claude about this'
              )}
            </Btn>
          )}
        </div>
      )}
      {!answered && (
        <p class="small faint">
          Press {labels(0)}–{labels(q.options.length - 1)}
          {labels(0) === '1' ? '' : ` (or 1–${q.options.length})`} to answer.
        </p>
      )}
    </article>
  );
}

export const stripTags = (s) =>
  String(s || '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
