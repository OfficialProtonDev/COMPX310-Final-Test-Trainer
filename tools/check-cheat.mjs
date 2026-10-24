// Self-check for the cheat-sheet block library. Run: node tools/check-cheat.mjs [--list] [--long]
//   --list  print every block with its estimated line count and word count
//   --long  print only blocks estimated longer than the 9-line guideline
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TOPICS, TOPIC } from '../src/data/topics.js';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const file = path.join(root, 'src/data/cheat/blocks.js');
const blocks = (await import(pathToFileURL(file).href + '?t=' + Date.now())).default;

const args = new Set(process.argv.slice(2));
const errs = [];
const warns = [];
const err = (id, m) => errs.push(`ERROR ${id}: ${m}`);
const warn = (id, m) => warns.push(`warn  ${id}: ${m}`);

const KINDS = new Set(['rule', 'facts', 'formula', 'table', 'code', 'compare', 'qa', 'worked']);
const COL = 42; // characters per line in one sheet column

// Allowed: <b> <i> <code> <sub> <sup> <br> <ul> <ol> <li> <table class="cs"> <tr> <th> <td> <span class="k">
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
const PLAIN = new Set(['b', 'i', 'code', 'sub', 'sup', 'br', 'ul', 'ol', 'li', 'tr', 'th', 'td']);
const VOID = new Set(['br']);

function checkHtml(id, html) {
  if (typeof html !== 'string' || !html.trim()) return err(id, 'html missing');
  const stack = [];
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html))) {
    const [, close, nameRaw, attrs] = m;
    const name = nameRaw.toLowerCase();
    const a = attrs.trim().replace(/\/$/, '').trim();
    if (PLAIN.has(name)) {
      if (a) err(id, `attributes not allowed on <${name}>: ${a}`);
    } else if (name === 'table') {
      if (!close && a !== 'class="cs"') err(id, `<table> must be exactly <table class="cs"> (got "${a}")`);
    } else if (name === 'span') {
      if (!close && a !== 'class="k"') err(id, `<span> must be exactly <span class="k"> (got "${a}")`);
    } else {
      err(id, `disallowed tag <${close}${name}>`);
      continue;
    }
    if (VOID.has(name)) continue;
    if (!close) stack.push(name);
    else {
      const top = stack.pop();
      if (top !== name) err(id, `unbalanced tags: </${name}> closes <${top ?? 'nothing'}>`);
    }
  }
  if (stack.length) err(id, `unclosed tags: ${stack.join(', ')}`);
  const text = html.replace(TAG_RE, '');
  if (/</.test(text)) err(id, 'raw "<" in text (use &lt; or ≤)');
  if (/&(?!(lt|gt|amp|quot|nbsp|#\d+);)/.test(text)) err(id, 'bare "&" in text (use &amp;)');
  if (/\$[^$]+\$|\\(frac|sum|alpha|beta|gamma|sigma|theta|cdot|sqrt|mathbf|left|right|times|le|ge)\b|\^\{|_\{|\\\(|\\\[/.test(html)) err(id, 'looks like LaTeX; use Unicode');
  if (/style=|<\s*script/i.test(html)) err(id, 'inline style/script');
  if (html !== html.trim()) warn(id, 'leading/trailing whitespace');
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const plain = (html) => decode(html.replace(/<br\s*\/?>|<\/li>|<\/tr>|<\/td>|<\/th>/gi, ' ').replace(TAG_RE, '')).replace(/\s+/g, ' ').trim();
const words = (html) => plain(html).split(' ').filter((t) => /[A-Za-z0-9Ͱ-Ͽ]/.test(t)).length;
const tokens = (html) => plain(html).split(' ').filter(Boolean).length; // wc -w style (also counts →, =, +)

// Rough rendered-line estimate in a 42-character column.
function estLines(html) {
  let lines = 0;
  const tables = [];
  const body = html.replace(/<table class="cs">([\s\S]*?)<\/table>/g, (_, inner) => { tables.push(inner); return '<br>'; });
  for (const t of tables) {
    for (const row of t.split(/<\/tr>/).filter((r) => /<t[dh]>/.test(r))) {
      const cells = [...row.matchAll(/<t[dh]>([\s\S]*?)<\/t[dh]>/g)].map((c) => decode(c[1].replace(/<br\s*\/?>/g, '\n').replace(TAG_RE, '')));
      const w = Math.max(6, Math.floor(COL / cells.length) - 1);
      lines += Math.max(...cells.map((c) => c.split('\n').reduce((a, seg) => a + Math.max(1, Math.ceil(seg.trim().length / w)), 0)));
    }
  }
  const segs = body.split(/<br\s*\/?>|<li>|<\/li>|<ul>|<\/ul>|<ol>|<\/ol>/);
  const inList = /<li>/.test(body);
  for (const s of segs) {
    const txt = decode(s.replace(TAG_RE, '')).trim();
    if (!txt) continue;
    lines += Math.ceil(txt.length / (inList ? COL - 3 : COL));
  }
  return lines;
}

const ids = new Set();
const perTopic = Object.fromEntries(TOPICS.map((t) => [t.key, 0]));
const wordsByWeek = {};
const tokensByWeek = {};
const blocksByWeek = {};
const linesByWeek = {};
const byKind = {};
const byImp = { 1: 0, 2: 0, 3: 0 };
const rows = [];

if (!Array.isArray(blocks)) { console.error('default export is not an array'); process.exit(1); }
for (const b of blocks) {
  const id = b.id ?? '(no id)';
  if (!/^w(\d{1,2})-[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) err(id, 'id must be kebab-case with a week prefix like w8-gamma-c');
  else if (Number(id.match(/^w(\d+)/)[1]) !== b.week) err(id, `id prefix week does not match week ${b.week}`);
  if (ids.has(id)) err(id, 'duplicate id');
  ids.add(id);
  const t = TOPIC[b.topic];
  if (!t) err(id, `unknown topic ${b.topic}`);
  else {
    if (t.week !== b.week) err(id, `week ${b.week} does not match topic ${b.topic} (week ${t.week})`);
    perTopic[b.topic]++;
  }
  if (typeof b.title !== 'string' || !b.title.trim()) err(id, 'title missing');
  else if ([...b.title].length > 32) err(id, `title is ${[...b.title].length} chars (max 32): "${b.title}"`);
  if (![1, 2, 3].includes(b.imp)) err(id, 'imp must be 1, 2 or 3');
  if (!KINDS.has(b.kind)) err(id, `kind must be one of ${[...KINDS].join(', ')}`);
  if (b.kind === 'qa' && b.imp !== 3) err(id, 'qa blocks must be imp 3');
  const extra = Object.keys(b).filter((k) => !['id', 'week', 'topic', 'title', 'imp', 'kind', 'html'].includes(k));
  if (extra.length) warn(id, `unexpected fields: ${extra.join(', ')}`);
  checkHtml(id, b.html);
  if (typeof b.html !== 'string') continue;
  const w = words(b.html);
  const l = estLines(b.html);
  if (l > 9) warn(id, `~${l} lines in a ${COL}-char column (guideline 2-9)`);
  if (l < 2) warn(id, `only ~${l} line`);
  wordsByWeek[b.week] = (wordsByWeek[b.week] || 0) + w;
  tokensByWeek[b.week] = (tokensByWeek[b.week] || 0) + tokens(b.html) + tokens(b.title);
  blocksByWeek[b.week] = (blocksByWeek[b.week] || 0) + 1;
  linesByWeek[b.week] = (linesByWeek[b.week] || 0) + l + 1; // +1 for the block title line
  byKind[b.kind] = (byKind[b.kind] || 0) + 1;
  byImp[b.imp] = (byImp[b.imp] || 0) + 1;
  rows.push({ id, week: b.week, kind: b.kind, imp: b.imp, l, w, title: b.title });
}

// duplicate titles make the sheet confusing
const titles = new Map();
for (const b of blocks) {
  const k = String(b.title).toLowerCase();
  if (titles.has(k)) warn(b.id, `same title as ${titles.get(k)}`);
  titles.set(k, b.id);
}

for (const [k, n] of Object.entries(perTopic)) if (n < 2) err(k, `topic has ${n} block(s); needs >= 2`);

if (args.has('--list') || args.has('--long')) {
  for (const r of rows) {
    if (args.has('--long') && r.l <= 9) continue;
    console.log(`${r.id.padEnd(26)} w${String(r.week).padEnd(3)} ${r.kind.padEnd(8)} imp${r.imp}  ~${String(r.l).padStart(2)} lines ${String(r.w).padStart(4)} words  ${r.title}`);
  }
  console.log('');
}

const total = Object.values(wordsByWeek).reduce((a, b) => a + b, 0);
const firstHalf = [1, 2, 3, 4, 5, 6].reduce((a, w) => a + (wordsByWeek[w] || 0), 0);
console.log('week  blocks  words  tokens  est.lines   (words = alphanumeric tokens in html; tokens = wc -w style incl. titles; lines incl. 1 title line per block)');
for (let w = 1; w <= 12; w++) console.log(`W${String(w).padEnd(4)} ${String(blocksByWeek[w] || 0).padStart(6)} ${String(wordsByWeek[w] || 0).padStart(6)} ${String(tokensByWeek[w] || 0).padStart(7)} ${String(linesByWeek[w] || 0).padStart(9)}`);
const totLines = Object.values(linesByWeek).reduce((a, b) => a + b, 0);
const totTokens = Object.values(tokensByWeek).reduce((a, b) => a + b, 0);
console.log(`total ${String(blocks.length).padStart(6)} ${String(total).padStart(6)} ${String(totTokens).padStart(7)} ${String(totLines).padStart(9)}`);
console.log(`sheet estimate: 8 columns x ~105 lines = ~840 lines -> library is ~${(totLines / 840).toFixed(2)}x the sheet`);
console.log(`W1-6: ${firstHalf} words (${((100 * firstHalf) / total).toFixed(1)}%), W7-12: ${total - firstHalf} words (${((100 * (total - firstHalf)) / total).toFixed(1)}%)`);
console.log(`kinds: ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`imp: 3 → ${byImp[3]}, 2 → ${byImp[2]}, 1 → ${byImp[1]}`);
console.log(`blocks per topic: ${Object.entries(perTopic).map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const x of warns) console.log(x);
for (const x of errs) console.log(x);
console.log(errs.length ? `\n${errs.length} error(s), ${warns.length} warning(s)` : `\nOK: no errors, ${warns.length} warning(s)`);
process.exit(errs.length ? 1 : 0);
