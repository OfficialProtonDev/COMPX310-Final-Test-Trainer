// Convolution and max pooling on a small matrix, cell by cell (W6b s19-28; 2019 practice paper Q55).
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, MatrixInput, Matrix, Seg, Btn, Fb } from '../ui.jsx';
import { fmt } from '../lib/svg.js';

const PRESETS = {
  lecture: { label: 'Lecture (W6b s21)', input: [[1, 3, 6], [1, 5, 9], [1, 7, 11]], kernel: [[1, -1], [0, 1]] },
  exam2019: { label: '2019 paper Q55', input: [[2, 4, 8], [2, 6, 12], [2, 8, 16]], kernel: [[-1, 0], [0, 1]] },
  edge: { label: 'Vertical edge, 4×4', input: [[0, 0, 9, 9], [0, 0, 9, 9], [0, 0, 9, 9], [0, 0, 9, 9]], kernel: [[-1, 1], [-1, 1]] },
};

function pad(m, p) {
  if (!p) return m;
  const w = m[0].length + 2 * p;
  const z = () => Array(w).fill(0);
  return [...Array(p).fill(0).map(z), ...m.map((r) => [...Array(p).fill(0), ...r, ...Array(p).fill(0)]), ...Array(p).fill(0).map(z)];
}

function run(input, kernel, mode, stride, padding) {
  const src = pad(input, padding);
  const fh = mode === 'pool' ? 2 : kernel.length;
  const fw = mode === 'pool' ? 2 : kernel[0].length;
  const oh = Math.floor((src.length - fh) / stride) + 1;
  const ow = Math.floor((src[0].length - fw) / stride) + 1;
  const out = [];
  const terms = [];
  for (let i = 0; i < Math.max(0, oh); i++) {
    out.push([]);
    terms.push([]);
    for (let j = 0; j < Math.max(0, ow); j++) {
      const cells = [];
      for (let a = 0; a < fh; a++) for (let b = 0; b < fw; b++) cells.push([i * stride + a, j * stride + b, a, b]);
      if (mode === 'pool') {
        const vals = cells.map(([y, x]) => src[y][x]);
        out[i].push(Math.max(...vals));
        terms[i].push(`max(${vals.map((v) => fmt(v)).join(', ')}) = ${fmt(Math.max(...vals))}`);
      } else {
        let s = 0;
        const parts = cells.map(([y, x, a, b]) => {
          s += src[y][x] * kernel[a][b];
          const k = kernel[a][b];
          return `${fmt(src[y][x])}×${k < 0 ? '(' + fmt(k) + ')' : fmt(k)}`;
        });
        out[i].push(s);
        terms[i].push(`${parts.join(' + ')} = ${fmt(s)}`);
      }
    }
  }
  return { src, out, terms, fh, fw, oh, ow };
}

export default function ConvPool({ preset = 'lecture', quiz = false }) {
  const p0 = PRESETS[preset] || PRESETS.lecture;
  const [hidden, setHidden] = useState(!!quiz); // on a past paper, the answer stays hidden until Reveal
  const [input, setInput] = useState(p0.input);
  const [kernel, setKernel] = useState(p0.kernel);
  const [mode, setMode] = useState('conv');
  const [stride, setStride] = useState(1);
  const [padding, setPadding] = useState(0);
  const [sel, setSel] = useState([0, 0]);

  const r = useMemo(() => run(input, kernel, mode, stride, padding), [input, kernel, mode, stride, padding]);
  const [si, sj] = sel[0] < r.oh && sel[1] < r.ow ? sel : [0, 0];
  const inWin = (y, x) => {
    const y0 = si * stride;
    const x0 = sj * stride;
    return y >= y0 && y < y0 + r.fh && x >= x0 && x < x0 + r.fw;
  };

  const load = (k) => {
    if (k !== 'exam2019') setHidden(false);
    setInput(PRESETS[k].input);
    setKernel(PRESETS[k].kernel);
    setSel([0, 0]);
  };
  const step = () => {
    const n = si * r.ow + sj + 1;
    setSel(n >= r.oh * r.ow ? [0, 0] : [Math.floor(n / r.ow), n % r.ow]);
  };
  const n = input.length;
  const size = (n + 2 * padding - (mode === 'pool' ? 2 : kernel.length)) / stride + 1;

  return (
    <WidgetFrame
      title="Convolution & max pooling, cell by cell"
      lead="Pick an output cell (or press Next cell) to see which window of the input produced it. Edit any number."
      actions={Object.entries(PRESETS).map(([k, v]) => (
        <Btn size="sm" key={k} onClick={() => load(k)}>
          {v.label}
        </Btn>
      ))}
      foot={
        <span>
          Slide the window, multiply element-wise, add up (no kernel flip, as in the lecture). Max pooling keeps the largest value
          in each window, so it shrinks the map and ignores small shifts. Output side = (n + 2p − f) / s + 1.
        </span>
      }
    >
      <div class="wg-row">
        <Seg
          label="Operation"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setSel([0, 0]);
          }}
          options={[
            { value: 'conv', label: 'Convolution' },
            { value: 'pool', label: 'Max pool 2×2' },
          ]}
        />
        <Seg label="Stride" value={stride} onChange={(v) => { setStride(v); setSel([0, 0]); }} options={[{ value: 1, label: 'Stride 1' }, { value: 2, label: 'Stride 2' }]} />
        <Seg label="Padding" value={padding} onChange={(v) => { setPadding(v); setSel([0, 0]); }} options={[{ value: 0, label: 'No padding' }, { value: 1, label: 'Zero-pad 1' }]} />
      </div>
      <div class="mx-row">
        <div>
          <div class="mx-cap">Input {padding ? '(padded with 0s)' : ''}</div>
          {padding ? (
            <Matrix value={r.src} dp={2} highlight={inWin} label="Padded input" />
          ) : (
            <MatrixInput value={input} onChange={setInput} label="Input" highlight={inWin} />
          )}
        </div>
        <span class="mx-op" aria-hidden="true">
          {mode === 'pool' ? 'max' : '⊛'}
        </span>
        {mode === 'conv' ? (
          <div>
            <div class="mx-cap">Kernel</div>
            <MatrixInput value={kernel} onChange={setKernel} label="Kernel" />
          </div>
        ) : (
          <div class="wg-note">2×2 window</div>
        )}
        <span class="mx-op" aria-hidden="true">
          =
        </span>
        <div>
          <div class="mx-cap">
            Output {r.oh > 0 ? `${r.oh}×${r.ow}` : ''}
          </div>
          {r.oh > 0 ? (
            <table class="mx" aria-label="Output">
              <tbody>
                {r.out.map((row, i) => (
                  <tr key={i}>
                    {row.map((v, j) => (
                      <td key={j} class={i === si && j === sj ? 'hl' : ''}>
                        <button type="button" class="cellbtn" onClick={() => setSel([i, j])} aria-label={`Output row ${i + 1} column ${j + 1}: ${hidden ? 'hidden' : fmt(v)}`}>
                          {hidden ? '?' : fmt(v)}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Fb kind="hint">The window doesn't fit.</Fb>
          )}
        </div>
      </div>
      {r.oh > 0 && hidden && (
        <div class="wg-row">
          <Btn size="sm" kind="primary" onClick={() => setHidden(false)}>
            Reveal the answer
          </Btn>
          <span class="small muted">Work out each output cell (and the max pool) on paper first. The highlighted window shows which inputs make out[{si + 1},{sj + 1}].</span>
        </div>
      )}
      {r.oh > 0 && !hidden && (
        <div class="wg-row">
          <Btn size="sm" kind="primary" onClick={step}>
            Next cell
          </Btn>
          <div class="calc-steps" aria-live="polite">
            <div>
              out[{si + 1},{sj + 1}] = {r.terms[si][sj]}
            </div>
            <div class="why">
              Output size: ({n} + 2·{padding} − {mode === 'pool' ? 2 : kernel.length}) / {stride} + 1 = {fmt(size, 2)}
              {Number.isInteger(size) ? '' : ' → rounded down'}
            </div>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
