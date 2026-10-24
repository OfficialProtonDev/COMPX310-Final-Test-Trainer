// Validates every question bank, written-prompt and past-paper file. Run: node tools/validate-content.mjs [--list]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPIC, TOPICS } from '../src/data/topics.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const errs = [];
const warn = [];
const err = (f, id, m) => errs.push(`${f} ${id ?? ''}: ${m}`);
const ALLOWED_TAGS = /<\/?(b|i|em|strong|code|sub|sup|br|ul|ol|li|table|thead|tbody|tr|th|td|span|div|p|pre|small|u)(\s+class="[a-z0-9 -]+")?\s*\/?>/gi;

function checkHtml(f, id, field, s) {
  if (typeof s !== 'string') return err(f, id, `${field} not a string`);
  const stripped = s.replace(ALLOWED_TAGS, '');
  if (/<[a-z\/!]/i.test(stripped)) err(f, id, `${field} has a disallowed tag: ${stripped.match(/<[^>]{0,30}/)[0]}`);
  if (/\$[^$]+\$|\\frac|\\sum|\\alpha/.test(s)) err(f, id, `${field} looks like LaTeX; use Unicode`);
  if (/\s{2,}$/.test(s) || /^\s/.test(s)) warn.push(`${f} ${id}: ${field} has leading/trailing whitespace`);
}

async function load(dir) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) return [];
  const out = [];
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.js')).sort()) {
    const mod = await import(pathToFileURL(path.join(d, f)).href + '?t=' + Date.now());
    out.push([path.join(dir, f), mod.default]);
  }
  return out;
}

const ids = new Set();
const byWeek = {};
const byTopic = {};
const byLevel = { 1: 0, 2: 0, 3: 0 };
let n = 0;
for (const [f, arr] of await load('src/data/q')) {
  if (!Array.isArray(arr)) { err(f, null, 'default export is not an array'); continue; }
  for (const q of arr) {
    const id = q.id;
    if (!/^w\d\d-\d{3}$/.test(id || '')) err(f, id, 'id must look like w07-001');
    if (ids.has(id)) err(f, id, 'duplicate id');
    ids.add(id);
    const t = TOPIC[q.topic];
    if (!t) err(f, id, `unknown topic ${q.topic}`);
    else if (t.week !== q.week) err(f, id, `week ${q.week} does not match topic week ${t.week}`);
    if (q.type !== 'mcq') err(f, id, 'type must be "mcq"');
    checkHtml(f, id, 'q', q.q);
    if (!Array.isArray(q.options) || q.options.length !== 4) err(f, id, 'needs exactly 4 options');
    else {
      q.options.forEach((o, i) => checkHtml(f, id, `options[${i}]`, o));
      const norm = q.options.map((o) => String(o).trim().toLowerCase());
      if (new Set(norm).size !== 4) err(f, id, 'duplicate options');
    }
    const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (!ans.length || ans.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) err(f, id, 'answer must be 0-3 (or array of them)');
    checkHtml(f, id, 'explain', q.explain);
    if ((q.explain || '').length < 40) err(f, id, 'explain too short');
    if (!q.src) err(f, id, 'missing src');
    if (![1, 2, 3].includes(q.level)) err(f, id, 'level must be 1, 2 or 3');
    if (q.tags && !Array.isArray(q.tags)) err(f, id, 'tags must be an array');
    // answer-position bias guard
    const lens = (q.options || []).map((o) => String(o).replace(/<[^>]+>/g, '').length);
    if (lens.length === 4 && !Array.isArray(q.answer)) {
      const max = Math.max(...lens);
      const second = [...lens].sort((a, b) => b - a)[1];
      if (lens[q.answer] === max && max > second * 1.6 && max > 40) warn.push(`${f} ${id}: correct option is much longer than the others (give-away?)`);
    }
    byWeek[q.week] = (byWeek[q.week] || 0) + 1;
    byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
    byLevel[q.level] = (byLevel[q.level] || 0) + 1;
    n++;
  }
}

// answer position distribution per file
const posDist = {};
for (const [f, arr] of await load('src/data/q')) {
  const c = [0, 0, 0, 0];
  for (const q of arr) if (!Array.isArray(q.answer)) c[q.answer]++;
  posDist[f] = c;
  const tot = c.reduce((a, b) => a + b, 0);
  if (tot >= 12 && Math.max(...c) > tot * 0.4) warn.push(`${f}: answer positions skewed ${c.join('/')}`);
}

let nw = 0;
const wids = new Set();
for (const [f, arr] of await load('src/data/written')) {
  if (!Array.isArray(arr)) { err(f, null, 'default export is not an array'); continue; }
  for (const w of arr) {
    const id = w.id;
    if (!/^wr-\d\d-\d\d$/.test(id || '')) err(f, id, 'id must look like wr-07-01');
    if (wids.has(id)) err(f, id, 'duplicate id');
    wids.add(id);
    const t = TOPIC[w.topic];
    if (!t) err(f, id, `unknown topic ${w.topic}`);
    else if (t.week !== w.week) err(f, id, 'week/topic mismatch');
    if (!['explain', 'worked'].includes(w.kind)) err(f, id, 'kind must be explain|worked');
    checkHtml(f, id, 'prompt', w.prompt);
    checkHtml(f, id, 'model', w.model);
    if (w.marks !== 5) err(f, id, 'marks must be 5');
    if (!Array.isArray(w.points) || !w.points.length) err(f, id, 'points missing');
    else {
      const s = w.points.reduce((a, p) => a + p.m, 0);
      if (Math.abs(s - 5) > 1e-9) err(f, id, `points sum to ${s}, not 5`);
      w.points.forEach((p, i) => { checkHtml(f, id, `points[${i}]`, p.text); if (!(p.m > 0)) err(f, id, 'point m must be > 0'); });
    }
    if (!w.src) err(f, id, 'missing src');
    nw++;
  }
}

for (const [f, p] of await load('src/data/papers')) {
  if (!p || !p.id || !Array.isArray(p.sections)) { err(f, null, 'paper must have id and sections'); continue; }
  for (const s of p.sections) {
    for (const it of s.items || []) {
      const id = `${p.id}#${it.n}`;
      if (it.topic && !TOPIC[it.topic]) err(f, id, `unknown topic ${it.topic}`);
      if (s.kind === 'mcq') {
        checkHtml(f, id, 'q', it.q);
        if (!Array.isArray(it.options) || it.options.length < 3) err(f, id, 'options');
        const ans = Array.isArray(it.answer) ? it.answer : [it.answer];
        if (ans.some((a) => !Number.isInteger(a) || a < 0 || a >= (it.options || []).length)) err(f, id, 'answer index out of range');
        checkHtml(f, id, 'explain', it.explain || '');
      } else {
        checkHtml(f, id, 'prompt', it.prompt);
        checkHtml(f, id, 'model', it.model || '');
      }
    }
  }
}

console.log(`MCQs: ${n}  written: ${nw}`);
console.log('by week:', JSON.stringify(byWeek));
console.log('by level:', JSON.stringify(byLevel));
if (process.argv.includes('--list')) {
  for (const t of TOPICS) console.log(`  ${t.key.padEnd(18)} ${byTopic[t.key] || 0}`);
  console.log('answer positions:', JSON.stringify(posDist));
}
if (warn.length) console.log(`\n${warn.length} warning(s):\n  ` + warn.slice(0, 40).join('\n  '));
if (errs.length) { console.log(`\n${errs.length} ERROR(S):\n  ` + errs.slice(0, 80).join('\n  ')); process.exit(1); }
console.log('\nOK');
