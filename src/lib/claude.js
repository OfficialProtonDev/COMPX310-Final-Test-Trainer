// Optional Claude features (the viewer's own account) and file saving. Everything degrades to absent.
// In the public web copy (IS_WEB) there is no Claude host: files download normally, and "Ask" opens claude.ai.
import { useEffect, useState } from 'preact/hooks';
import { IS_WEB } from './host.js';

let samplePromise = null;
let downloadsPromise = null;
let sampleOff = false; // a viewer declined, or Claude isn't available here
const subs = new Set();

function use(name) {
  if (IS_WEB) return Promise.resolve(null);
  try {
    if (window.claude && typeof window.claude.use === 'function') return window.claude.use(name).catch(() => null);
  } catch (e) {}
  return Promise.resolve(null);
}

export function getSample() {
  if (!samplePromise) samplePromise = use('sample');
  return samplePromise.then((s) => (sampleOff ? null : s));
}
export function getDownloads() {
  if (!downloadsPromise) downloadsPromise = use('downloads');
  return downloadsPromise;
}

/** 'pending' until we know; then 'ready' or 'off'. */
export function useClaude() {
  const [st, setSt] = useState(sampleOff ? 'off' : 'pending');
  useEffect(() => {
    let live = true;
    const f = () => live && setSt('off');
    subs.add(f);
    getSample().then((s) => live && setSt(s ? 'ready' : 'off'));
    return () => {
      live = false;
      subs.delete(f);
    };
  }, []);
  return st;
}

function turnOff() {
  sampleOff = true;
  subs.forEach((f) => f());
}

const PERMANENT = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);

export function errorCopy(e) {
  const code = e && e.code;
  if (PERMANENT.has(code)) {
    turnOff();
    return 'Claude isn’t available on this page, so this feature is switched off.';
  }
  if (code === 'rate_limited') return 'Too many requests just now. Wait a minute, then try again.';
  if (code === 'session_expired') return 'Your Claude session expired. Sign in again, then retry.';
  if (code === 'refused') return 'Claude declined that one. Try rephrasing.';
  if (code === 'prompt_too_large') return 'That was too long to send. Highlight a shorter passage.';
  if (code === 'invalid_json') return 'The marking reply came back garbled. Try again.';
  if (code === 'cancelled') return '';
  return 'Something went wrong reaching Claude. Try again.';
}

export const COURSE = `Course: COMPX310 Machine Learning (University of Waikato, 2026). Textbooks: Géron "Hands-On Machine Learning" and Lindholm et al. "Machine Learning: A First Course for Engineers and Scientists". Weeks: 1 intro & types of ML; 2 kNN & decision trees; 3 linear/logistic/softmax regression, bias-variance, Ridge/Lasso/ElasticNet; 4 cross-validation & classification metrics; 5 data prep & gradient descent; 6 neural nets, Keras, deep nets, CNNs; 7 ensembles (voting, bagging/pasting, OOB, random forests, Extra-Trees, AdaBoost, gradient boosting, stacking); 8 SVMs & kernels; 9 Bayesian linear regression & Gaussian processes; 10 dimensionality reduction (PCA) & clustering (k-means, DBSCAN); 11 NLP: embeddings, attention, transformers, BERT vs GPT; 12 practical ML & ethics/fairness. The final test: 40 multiple-choice questions (4 options) + 2 written answers (5 marks each), 50 minutes, one double-sided A4 cheat sheet allowed.`;

/** Mark a written answer. Resolves { points:[{i, awarded, why}], total, feedback }. */
export async function markWritten(w, text) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const scheme = w.points.map((p, i) => `${i + 1}. [${p.m} mark${p.m === 1 ? '' : 's'}] ${strip(p.text)}`).join('\n');
  const prompt = `You are a fair but strict marker for a university machine-learning test.
${COURSE}

Question (${w.marks} marks):
${strip(w.prompt)}

Marking scheme (award each point fully, half, or not at all, in 0.5 steps, never more than its value):
${scheme}

Model answer (for reference):
${strip(w.model)}

Student's answer:
"""
${text.slice(0, 6000)}
"""

Judge the student's answer only on what it actually says. Accept equivalent wording and correct extra detail; do not reward vague or wrong statements. Reply with ONLY JSON in this shape:
{"points":[{"i":1,"awarded":1,"why":"short reason"}, ...one entry per scheme point in order...],"total":3.5,"feedback":"2-3 sentences: what was good, what was missing or wrong, how to get full marks"}`;
  const out = await sample.json(prompt, { modelTier: 'default' });
  if (!out || !Array.isArray(out.points)) throw { code: 'invalid_json' };
  const points = w.points.map((p, i) => {
    const r = out.points.find((x) => +x.i === i + 1) || out.points[i] || {};
    const aw = Math.max(0, Math.min(p.m, Math.round((+r.awarded || 0) * 2) / 2));
    return { i: i + 1, awarded: aw, why: String(r.why || '') };
  });
  const total = points.reduce((s, p) => s + p.awarded, 0);
  return { points, total, feedback: String(out.feedback || ''), at: Date.now() };
}

export function strip(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|div|h\d)>/gi, '\n')
    .replace(/<t[dh][^>]*>/gi, ' | ')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Offer a generated file to the viewer. Resolves 'saved' | 'unavailable' | 'declined' | 'error'. */
export async function saveFile(filename, data) {
  if (IS_WEB) return downloadNow(filename, data);
  const dl = await getDownloads();
  if (!dl) return 'unavailable';
  try {
    await dl.save({ filename, data });
    return 'saved';
  } catch (e) {
    if (e && e.code === 'declined') return 'declined';
    if (e && (e.code === 'unavailable' || e.code === 'not_granted' || e.code === 'capability_disabled')) return 'unavailable';
    return 'error';
  }
}

// ---------------------------------------------------------------- web copy fallbacks

/** A normal browser download (works on a real website, not inside the Claude frame). */
function downloadNow(filename, data) {
  try {
    const url = URL.createObjectURL(new Blob([data], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'saved';
  } catch (e) {
    return 'error';
  }
}

/** Print an HTML document through a hidden frame, so the browser's own print dialog opens for it. */
export function printHtml(html) {
  try {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.setAttribute('tabindex', '-1');
    f.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open();
    d.write(html);
    d.close();
    const go = () => {
      try {
        f.contentWindow.focus();
        f.contentWindow.print();
      } catch (e) {}
      setTimeout(() => f.remove(), 120000);
    };
    const ready = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
    ready.then(
      () => setTimeout(go, 250),
      () => setTimeout(go, 250)
    );
    return true;
  } catch (e) {
    return false;
  }
}

/** Copy text; resolves true when it worked. Falls back to a hidden textarea for older browsers. */
export function copyText(text) {
  const legacy = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, legacy);
  } catch (e) {}
  return Promise.resolve(legacy());
}

const CLAUDE_NEW = 'https://claude.ai/new';
const MAX_URL_Q = 6000; // encoded length; longer links can be refused, so those open an empty chat (the text is copied)

/** Open claude.ai in a new tab with the prompt filled in, and copy the prompt too. Call it straight from a click. */
export function askOnClaude(prompt) {
  const copied = copyText(prompt);
  const enc = encodeURIComponent(prompt);
  const prefilled = enc.length <= MAX_URL_Q;
  try {
    window.open(prefilled ? `${CLAUDE_NEW}?q=${enc}` : CLAUDE_NEW, '_blank', 'noopener');
  } catch (e) {}
  return copied.then((ok) => ({ prefilled, copied: ok }));
}

const SHORT_COURSE =
  'Course: COMPX310 Machine Learning (University of Waikato), revising for the final test (40 multiple-choice questions + 2 written answers). Textbook: Géron, Hands-On Machine Learning.';
const Q3 = '"""';

/** A question about some highlighted text, short enough to travel in a claude.ai link. */
export function askPrompt({ quote, context = '', where = '', ask = '' }) {
  const head = `${SHORT_COURSE}\n\n${
    ask || 'Explain the highlighted text simply and briefly (under 170 words), in the course’s terms. If it’s a test question, say why the right answer is right and why the tempting alternatives are wrong.'
  }`;
  const build = (ctx, q) => {
    const around = ctx ? `Text around it${where ? ` (${where})` : ''}:\n${Q3}\n${ctx}\n${Q3}\n` : '';
    return `${head}\n\n${around}Highlighted:\n${Q3}\n${q}\n${Q3}`;
  };
  let ctx = String(context || '').trim();
  let q = String(quote || '').trim();
  let out = build(ctx, q);
  while (encodeURIComponent(out).length > MAX_URL_Q && ctx.length > 200) {
    ctx = ctx.slice(0, Math.floor(ctx.length * 0.75)) + ' …';
    out = build(ctx, q);
  }
  while (encodeURIComponent(out).length > MAX_URL_Q && q.length > 200) {
    q = q.slice(0, Math.floor(q.length * 0.8)) + ' …';
    out = build(ctx, q);
  }
  return out;
}

/** A marking request to paste into any assistant: the question, the mark scheme, the model answer and the answer. */
export function markingPrompt(w, text) {
  const scheme = w.points.map((p, i) => `${i + 1}. [${p.m} mark${p.m === 1 ? '' : 's'}] ${strip(p.text)}`).join('\n');
  return `Please mark my answer to a university machine-learning test question, strictly but fairly.
${SHORT_COURSE}

Question (${w.marks} marks):
${strip(w.prompt)}

Marking scheme (award each point fully, half or not at all, in 0.5 steps):
${scheme}

Model answer (for reference):
${strip(w.model)}

My answer:
${Q3}
${String(text || '').slice(0, 6000)}
${Q3}

Go through the scheme point by point (marks awarded and a short reason), give the total out of ${w.marks}, then say in two or three sentences what would get me full marks.`;
}
