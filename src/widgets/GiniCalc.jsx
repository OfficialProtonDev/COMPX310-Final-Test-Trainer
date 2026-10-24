// Impurity of a decision-tree node and of a split: Gini, entropy, misclassification (W2 s15, s18 plot_tree).
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, Plot, Seg, Btn, Num } from '../ui.jsx';
import { fmt, fix, linspace, linePath } from '../lib/svg.js';
import { gini, entropy, misclass, probs, total, evalSplit, IRIS } from './gini-calc-math.js';
import { useWidth } from './d-shared.js';

const css = `
.gini-calc-grid { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .gini-calc-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.gini-calc-panel { display: grid; gap: 10px; align-content: start; min-width: 0; }
.gini-calc-h { font-family: var(--font-display); font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
.gini-calc-counts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.gini-calc-counts .gini-calc-k { font-size: 13px; font-weight: 700; color: var(--ink-2); min-width: 74px; }
.gini-calc-res b { color: var(--ink); }
.gini-calc-tab td, .gini-calc-tab th { padding: 3px 6px; }
.gini-calc-v { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12px; color: var(--ink-2); white-space: nowrap; }
.gini-calc-tab tr.gini-calc-sumrow td { font-weight: 700; }
.gini-calc-tree { max-width: 520px; }
.gini-calc-node { cursor: pointer; outline: none; }
.gini-calc-node:focus-visible rect { stroke: var(--biro); stroke-width: 2.5; }
.gini-calc-node text { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 11px; fill: var(--ink-2); }
.gini-calc-node text.gini-calc-rule { fill: var(--ink); font-weight: 600; }
`;

const CLASS_NAMES = ['class 0', 'class 1', 'class 2'];
const clean = (n) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
const vec = (c) => `[${c.join(', ')}]`;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

function Counts({ label, value, nc, onChange }) {
  return (
    <div class="gini-calc-counts">
      <span class="gini-calc-k">{label}</span>
      {value.slice(0, nc).map((v, i) => (
        <Num
          key={i}
          value={v}
          min={0}
          step={1}
          width={62}
          label={`${label} ${CLASS_NAMES[i]}`}
          onChange={(n) => onChange(value.map((x, j) => (j === i ? clean(n) : x)))}
        />
      ))}
    </div>
  );
}

/** The W2 s18 iris tree; clicking a node loads it. */
function IrisTree({ onPick, current }) {
  const [ref, width] = useWidth(360);
  const W = Math.max(290, Math.min(width, 520));
  const bw = Math.min(124, (W - 16) / 3.05);
  const bh = 50;
  const rows = [6, 6 + bh + 26, 6 + 2 * (bh + 26)];
  const H = rows[2] + bh + 6;
  const nodes = [
    { key: 'root', ...IRIS.root, x: 0.5, row: 0, kids: [IRIS.leftLeaf.counts, IRIS.right.counts] },
    { key: 'leftLeaf', ...IRIS.leftLeaf, x: 0.19, row: 1 },
    { key: 'right', ...IRIS.right, x: 0.66, row: 1, kids: [IRIS.leaf1.counts, IRIS.leaf2.counts] },
    { key: 'leaf1', ...IRIS.leaf1, x: 0.47, row: 2 },
    { key: 'leaf2', ...IRIS.leaf2, x: 0.84, row: 2 },
  ];
  const pos = Object.fromEntries(nodes.map((n) => [n.key, [n.x * W, rows[n.row]]]));
  const edges = [['root', 'leftLeaf', 'True'], ['root', 'right', 'False'], ['right', 'leaf1'], ['right', 'leaf2']];
  return (
    <div class="gini-calc-tree" ref={ref}>
      <svg class="plot" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Iris decision tree from the W2 slide; each node is a button">
        {edges.map(([a, b, t]) => {
          const [x1, y1] = pos[a];
          const [x2, y2] = pos[b];
          return (
            <g key={a + b}>
              <line x1={x1} y1={y1 + bh} x2={x2} y2={y2} stroke="var(--rule-2)" stroke-width="1.5" />
              {t && (
                <text class="lbl" x={(x1 + x2) / 2 + (t === 'True' ? -8 : 8)} y={(y1 + bh + y2) / 2 + 4} text-anchor={t === 'True' ? 'end' : 'start'}>
                  {t}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const [cx, y] = pos[n.key];
          const on = current === n.key;
          const pick = () => onPick(n);
          return (
            <g
              key={n.key}
              class="gini-calc-node"
              role="button"
              tabindex="0"
              aria-pressed={on}
              aria-label={`Node ${vec(n.counts)}, gini ${fix(gini(n.counts), 3)}. Load it.`}
              onClick={pick}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick())}
            >
              <rect x={cx - bw / 2} y={y} width={bw} height={bh} rx="5" fill={on ? 'var(--biro-soft)' : 'var(--paper)'} stroke={on ? 'var(--biro)' : 'var(--rule-2)'} stroke-width={on ? 2 : 1} />
              <text class="gini-calc-rule" x={cx} y={y + 15} text-anchor="middle">
                {n.rule || 'leaf'}
              </text>
              <text x={cx} y={y + 29} text-anchor="middle">
                gini = {fmt(gini(n.counts), 3)}
              </text>
              <text x={cx} y={y + 43} text-anchor="middle">
                {vec(n.counts)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Two-class impurity curves against r with the current node marked (W2 s15). */
function TwoClassPlot({ r, base }) {
  const [ref, width] = useWidth(340);
  const W = Math.max(280, Math.min(width, 420));
  const H = 190;
  const ln = base !== 2;
  const ymax = ln ? 0.75 : 1.05;
  const rs = linspace(0.0005, 0.9995, 120);
  const H2 = (x) => entropy([x, 1 - x], base);
  const curves = [
    { k: 'Entropy', f: H2, dash: '', col: 'var(--c3)' },
    { k: 'Gini 2r(1 − r)', f: (x) => 2 * x * (1 - x), dash: '6 4', col: 'var(--c1)' },
    { k: 'Misclass.', f: (x) => 1 - Math.max(x, 1 - x), dash: '2 3', col: 'var(--c4)' },
  ];
  return (
    <div ref={ref} style={{ maxWidth: '420px' }}>
      <Plot w={W} h={H} x={[0, 1]} y={[0, ymax]} pad={{ l: 38, r: 12, t: 10, b: 34 }} xLabel="r = share of class 0" yTicks={ln ? [0, 0.2, 0.4, 0.6] : [0, 0.25, 0.5, 0.75, 1]} label="Two-class impurity curves">
        {({ X, Y }) => (
          <g>
            {curves.map((c) => (
              <path key={c.k} d={linePath(rs.map((x) => [x, c.f(x)]), X, Y)} fill="none" stroke={c.col} stroke-width="2" stroke-dasharray={c.dash} />
            ))}
            {Number.isFinite(r) && (
              <g>
                <line x1={X(r)} x2={X(r)} y1={Y(0)} y2={Y(ymax)} stroke="var(--ink-3)" stroke-dasharray="3 3" />
                {curves.map((c) => (
                  <circle key={c.k} cx={X(r)} cy={Y(c.f(Math.min(Math.max(r, 0), 1)) || 0)} r="4" fill={c.col} stroke="var(--paper)" stroke-width="1" />
                ))}
              </g>
            )}
            <text class="lbl" x={X(0.5)} y={Y(H2(0.5)) - 6} text-anchor="middle" fill="var(--c3)">
              entropy
            </text>
            <text class="lbl" x={X(0.5)} y={Y(0.5) - 6} text-anchor="middle">
              Gini
            </text>
            <text class="lbl" x={X(0.5)} y={Y(0.5) + 34} text-anchor="middle">
              misclass.
            </text>
          </g>
        )}
      </Plot>
    </div>
  );
}

export default function GiniCalc() {
  const [nc, setNc] = useState(3);
  const [base, setBase] = useState(2);
  const [node, setNode] = useState(IRIS.root.counts);
  const [left, setLeft] = useState(IRIS.leftLeaf.counts);
  const [right, setRight] = useState(IRIS.right.counts);
  const [picked, setPicked] = useState('root');

  const nodeC = node.slice(0, nc);
  const L = left.slice(0, nc);
  const R = right.slice(0, nc);
  const n = total(nodeC);
  const p = probs(nodeC);
  const g = gini(nodeC);
  const h = entropy(nodeC, base);
  const m = misclass(nodeC);
  const sp = useMemo(() => evalSplit(L, R, base), [L.join(), R.join(), base]);
  const logName = base === 2 ? 'log₂' : 'ln';
  const unit = base === 2 ? ' bits' : ' nats';

  const setClasses = (k) => {
    setNc(k);
    setPicked(null);
  };
  const load = (nd, l, r) => {
    setNc(nd.length);
    setNode(nd.concat([0, 0, 0]).slice(0, 3));
    if (l) setLeft(l.concat([0, 0, 0]).slice(0, 3));
    if (r) setRight(r.concat([0, 0, 0]).slice(0, 3));
  };
  const onPick = (t) => {
    load(t.counts, t.kids && t.kids[0], t.kids && t.kids[1]);
    setPicked(t.key);
  };
  const edit = (setter) => (v) => {
    setter(v.concat([0, 0, 0]).slice(0, 3));
    setPicked(null);
  };

  const r2 = nc === 2 && n > 0 ? p[0] : NaN;
  const sq = p.map((x) => `${fix(x, 3)}²`).join(' + ');
  const childBigger = ['left', 'right'].filter((s) => sp.gini[s] > sp.gini.parent + 1e-12);

  return (
    <WidgetFrame
      title="Impurity of a tree node"
      lead="Type the class counts of a node, or of a split's two children, to see Gini, entropy and misclassification worked out. Click a node of the iris tree to load it."
      actions={
        <>
          <Btn size="sm" onClick={() => { load(IRIS.root.counts, IRIS.leftLeaf.counts, IRIS.right.counts); setPicked('root'); }}>
            Iris tree (W2 s18)
          </Btn>
          <Btn size="sm" onClick={() => { load([10, 2], [9, 0], [1, 2]); setPicked(null); }}>
            Child worse than parent
          </Btn>
          <Btn size="sm" onClick={() => { load([5, 5], [5, 0], [0, 5]); setPicked(null); }}>
            50/50 node
          </Btn>
        </>
      }
      foot={
        <span>
          A split is chosen for the largest drop from the parent's impurity to the children's weighted impurity; a pure node has
          Gini 0, a 50/50 two-class node the maximum 0.5. A child's impurity is usually, not always, lower than its parent's, but
          the weighted average of the children never goes up.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-row">
        <Seg label="Number of classes" value={nc} onChange={setClasses} options={[{ value: 2, label: '2 classes' }, { value: 3, label: '3 classes' }]} />
        <Seg
          label="Logarithm for entropy"
          value={base}
          onChange={setBase}
          options={[
            { value: 2, label: 'log₂ (bits, sklearn)', title: 'scikit-learn uses log base 2' },
            { value: Math.E, label: 'ln (slide formula)', title: 'W2 s15 writes entropy with the natural log' },
          ]}
        />
      </div>
      <div class="gini-calc-grid">
        <section class="panel gini-calc-panel" aria-label="One node">
          <div class="gini-calc-h">One node</div>
          <Counts label="Counts" value={node} nc={nc} onChange={edit(setNode)} />
          {n > 0 ? (
            <div class="calc-steps gini-calc-res" aria-live="polite">
              <div>
                n = {n}, p = {vec(nodeC)}/{n} = ({p.map((x) => fix(x, 3)).join(', ')})
              </div>
              <div>
                Gini = 1 − Σp² = 1 − ({sq}) = <b>{fix(g, 3)}</b>
              </div>
              <div>
                Entropy = −Σ p {logName} p = <b>{fix(h, 3)}</b>
                {unit}
              </div>
              <div>
                Misclass. = 1 − max p = 1 − {fix(Math.max(...p), 3)} = <b>{fix(m, 3)}</b>
              </div>
              {nc === 2 && (
                <div class="why">
                  Slide form with r = {fix(r2, 3)}: Gini 2r(1 − r) = 2 × {fix(r2, 3)} × {fix(1 - r2, 3)} = {fix(2 * r2 * (1 - r2), 3)}; entropy −r {logName} r − (1 − r) {logName}(1 − r) = {fix(h, 3)}.
                </div>
              )}
              <div class="why">{g < 1e-12 ? 'Pure node: every sample is one class, so all three measures are 0.' : nc === 2 && Math.abs(r2 - 0.5) < 1e-12 ? 'A 50/50 node is as impure as two classes get: Gini 0.5, entropy 1 bit.' : 'Lower is purer; 0 means every sample in the node has the same class.'}</div>
            </div>
          ) : (
            <div class="wg-note">Enter at least one sample.</div>
          )}
          {nc === 2 && <TwoClassPlot r={r2} base={base} />}
        </section>
        <section class="panel gini-calc-panel" aria-label="Split">
          <div class="gini-calc-h">Split into two children</div>
          <Counts label="Left child" value={left} nc={nc} onChange={edit(setLeft)} />
          <Counts label="Right child" value={right} nc={nc} onChange={edit(setRight)} />
          <div class="mini-wrap">
            <table class="mini gini-calc-tab" aria-label="Impurity of the parent and children">
              <thead>
                <tr>
                  <th class="l">Node (value)</th>
                  <th>Gini</th>
                  <th>Entropy</th>
                  <th>Miscl.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Parent', sp.parent, sp.n, 'parent'],
                  ['Left', L, sp.nl, 'left'],
                  ['Right', R, sp.nr, 'right'],
                ].map(([name, c, nn, k]) => (
                  <tr key={k}>
                    <td class="l">
                      <b>{name}</b> <span class="faint">n = {nn}</span>
                      <div class="gini-calc-v">{vec(c)}</div>
                    </td>
                    <td>{fix(sp.gini[k], 3)}</td>
                    <td>{fix(sp.entropy[k], 3)}</td>
                    <td>{fix(sp.misclass[k], 3)}</td>
                  </tr>
                ))}
                <tr class="gini-calc-sumrow">
                  <td class="l">Weighted children</td>
                  <td>{fix(sp.gini.weighted, 3)}</td>
                  <td>{fix(sp.entropy.weighted, 3)}</td>
                  <td>{fix(sp.misclass.weighted, 3)}</td>
                </tr>
                <tr class="gini-calc-sumrow hl">
                  <td class="l">Decrease</td>
                  <td>{fix(sp.gini.decrease, 3)}</td>
                  <td>{fix(sp.entropy.decrease, 3)}</td>
                  <td>{fix(sp.misclass.decrease, 3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {sp.n > 0 && (
            <div class="calc-steps">
              <div>
                weighted Gini = {sp.nl}/{sp.n} × {fix(sp.gini.left, 3)} + {sp.nr}/{sp.n} × {fix(sp.gini.right, 3)} = {fix(sp.gini.weighted, 3)}
              </div>
              <div>
                decrease = {fix(sp.gini.parent, 3)} − {fix(sp.gini.weighted, 3)} = <b>{fix(sp.gini.decrease, 3)}</b>
              </div>
              {childBigger.length > 0 && (
                <div class="why">
                  The {childBigger.join(' and ')} child ({fix(sp.gini[childBigger[0]], 3)}) is less pure than the parent ({fix(sp.gini.parent, 3)}), yet the
                  weighted average still drops: children are only usually purer.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <div class="stack-sm">
        <div class="gini-calc-h">Iris tree from the slide (click a node)</div>
        <IrisTree onPick={onPick} current={picked} />
      </div>
    </WidgetFrame>
  );
}
