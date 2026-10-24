// Minimal, safe markdown → HTML for Claude's answers (escapes everything first).
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, '$1<i>$2</i>');
}

export function md(src) {
  const lines = esc(String(src || '')).split('\n');
  let out = '';
  let list = null; // 'ul' | 'ol'
  let para = [];
  let code = null;
  const flushPara = () => {
    if (para.length) out += `<p>${inline(para.join(' '))}</p>`;
    para = [];
  };
  const closeList = () => {
    if (list) out += `</${list}>`;
    list = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (code !== null) {
      if (/^```/.test(line)) {
        out += `<pre><code>${code}</code></pre>`;
        code = null;
      } else code += (code ? '\n' : '') + line;
      continue;
    }
    if (/^```/.test(line)) {
      flushPara();
      closeList();
      code = '';
      continue;
    }
    let m;
    if ((m = line.match(/^#{1,6}\s+(.*)$/))) {
      flushPara();
      closeList();
      out += `<p class="ask-h">${inline(m[1])}</p>`;
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ul') {
        closeList();
        out += '<ul>';
        list = 'ul';
      }
      out += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== 'ol') {
        closeList();
        out += '<ol>';
        list = 'ol';
      }
      out += `<li>${inline(m[1])}</li>`;
    } else if (!line.trim()) {
      flushPara();
      closeList();
    } else {
      if (list) closeList();
      para.push(line.trim());
    }
  }
  if (code !== null) out += `<pre><code>${code}</code></pre>`;
  flushPara();
  closeList();
  return out;
}
