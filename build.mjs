// Bundles the app into one self-contained page.
//   node build.mjs               -> dist/index.html (the Claude-hosted copy) + dist/test.html (wrapped, for local QA)
//   node build.mjs --target web  -> dist/site/index.html (the public web copy for GitHub Pages: no Claude features,
//                                   normal downloads and printing, "Ask Claude" opens claude.ai in a new tab)
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.dirname(new URL(import.meta.url).pathname);
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
if (!process.argv.includes('--entry')) execFileSync('node', [path.join(root, 'tools/gen-data.mjs')], { stdio: 'inherit' });

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const entry = arg('--entry', 'src/main.jsx');
const name = arg('--name', 'index');
const target = arg('--target', 'claude') === 'web' ? 'web' : 'claude';

const r = await esbuild.build({
  entryPoints: [path.join(root, entry)],
  bundle: true,
  write: false,
  format: 'iife',
  minify: !process.argv.includes('--dev'),
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"', __HOST__: JSON.stringify(target) },
  logLevel: 'warning',
});

const js = r.outputFiles[0].text
  .replace(/<\/script/gi, '<\\/script')
  // esbuild can leave control characters raw inside strings; escape them so the page is plain text
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const css = ['base.css', 'app.css', 'widgets.css', 'sheet.css']
  .map((f) => path.join(root, 'src/styles', f))
  .filter((f) => fs.existsSync(f))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const STORE_KEY = 'compx310-final-v1';
const fonts =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800' +
  '&family=Martian+Mono:wdth,wght@75..112.5,100..800&family=STIX+Two+Text:ital,wght@0,400..700;1,400..700' +
  '&family=IBM+Plex+Sans+Condensed:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600' +
  '&family=Noto+Sans+Math&display=swap';

const DESC = 'Practice questions, timed mocks in the real format, past papers with answers, interactive visuals and a cheat-sheet builder for the COMPX310 Machine Learning final test.';
const themeBoot = `<script>var t='light';try{var p=JSON.parse(localStorage.getItem('${STORE_KEY}')||'{}').prefs;if(p&&(p.theme==='dark'||p.theme==='system'))t=p.theme}catch(e){}if(t!=='system')document.documentElement.setAttribute('data-user-theme',t)</script>`;
// the same small reset the Claude host wraps its pages in, so both copies render identically
const reset =
  ':root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}';

if (target === 'web') {
  const icon =
    "data:image/svg+xml," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#2346c4'/><path d='M14 44 L26 24 L34 36 L42 20 L50 44' fill='none' stroke='#fff' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/></svg>"
    );
  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>COMPX310 Final Test Trainer</title>
<meta name="description" content="${DESC}">
<meta property="og:title" content="COMPX310 Final Test Trainer">
<meta property="og:description" content="${DESC}">
<link rel="icon" href="${icon}">
<style>${reset}</style>
${themeBoot}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>${css}</style>
</head>
<body>
<div id="app"></div>
<noscript><p style="padding:16px">This study tool needs JavaScript.</p></noscript>
<script>${js}</script>
</body>
</html>
`;
  fs.mkdirSync(path.join(dist, 'site'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'site', 'index.html'), doc);
  console.log(`built dist/site/index.html  ${(doc.length / 1024).toFixed(1)} KB  (web copy)`);
  process.exit(0);
}

const page = `<title>COMPX310 Final Test Trainer</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${DESC}">
${themeBoot}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>${css}</style>
<div id="app"></div>
<script>${js}</script>
`;

fs.writeFileSync(path.join(dist, name + '.html'), page);
const skeleton = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">' + `<style>${reset}</style></head><body>`;
fs.writeFileSync(path.join(dist, (name === 'index' ? 'test' : name + '-test') + '.html'), skeleton + page + '</body></html>');
console.log(`built dist/${name}.html  ${(page.length / 1024).toFixed(1)} KB  (js ${(js.length / 1024).toFixed(1)} KB, css ${(css.length / 1024).toFixed(1)} KB)`);
