// Word analogies by vector arithmetic in a toy 2-D embedding: D ≈ C + (B − A), nearest word by cosine (W11 s5-8, s11).
import { Fragment } from 'preact';
import { useState, useMemo, useId } from 'preact/hooks';
import { WidgetFrame, Plot, Seg, Btn, Readout } from '../ui.jsx';
import { fix } from '../lib/svg.js';
import { WORDS, GROUPS, PRESETS, analogy, rank } from './embedding-analogy-math.js';
import { useWidth, equalDomain, CL, shapePath } from './c-helpers.jsx';

const css = `
.embedding-analogy-sel { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 8px; align-items: center; }
.embedding-analogy-sel label { font-weight: 700; font-size: 13px; color: var(--ink-2); }
.embedding-analogy-sel select { min-height: 34px; padding: 4px 8px; }
.embedding-analogy-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.embedding-analogy-presets .btn { font-size: 12.5px; }
.embedding-analogy-rank td.embedding-analogy-w { text-align: left; font-weight: 600; }
`;

// label placement per word: [dx, dy, anchor] in px
const LBL = {
  nephew: [-8, 4, 'end'],
  niece: [8, 4, 'start'],
  uncle: [-8, 4, 'end'],
  aunt: [8, 4, 'start'],
  man: [-8, 4, 'end'],
  woman: [8, 4, 'start'],
  king: [-8, 4, 'end'],
  queen: [8, 4, 'start'],
  Athens: [0, 17, 'middle'],
  Greece: [0, -9, 'middle'],
  Oslo: [0, 17, 'middle'],
  Norway: [8, 4, 'start'],
  walking: [0, -9, 'middle'],
  walked: [0, 17, 'middle'],
  swimming: [8, 4, 'start'],
  swam: [8, 4, 'start'],
};
const GROUP_OF = Object.fromEntries(GROUPS.flatMap((g, gi) => g.map((w) => [w, gi])));
const ALL = Object.keys(WORDS);

function Arrow({ x1, y1, x2, y2, color, dash, id }) {
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0L10,5L0,10Z" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} stroke-width="2.4" stroke-dasharray={dash} marker-end={`url(#${id})`} />
    </g>
  );
}

export default function EmbeddingAnalogy() {
  const [abc, setAbc] = useState(['nephew', 'uncle', 'niece']);
  const [by, setBy] = useState('cos');
  const [a, b, c] = abc;
  const D = useMemo(() => analogy(a, b, c), [a, b, c]);
  const ranked = useMemo(() => rank(D, abc, by), [D, abc, by]);
  const top = ranked[0];
  const uid = useId();

  const [ref, w] = useWidth(400);
  const h = Math.round(Math.max(270, Math.min(400, w * 0.78)));
  const pad = { l: 12, r: 12, t: 12, b: 12 };
  const [xd, yd] = equalDomain([-4.3, 4.0], [-3.6, 3.6], w - pad.l - pad.r, h - pad.t - pad.b);
  const set = (i, v) => setAbc(abc.map((x, j) => (j === i ? v : x)));
  const preset = PRESETS.find((p) => p.a === a && p.b === b && p.c === c);

  return (
    <WidgetFrame
      title="Word analogies with vector arithmetic"
      lead="Pick “A is to B as C is to ?” (or a slide example): the arrow B − A is copied onto C and lands on D ≈ C + (B − A)."
      foot={
        <span>
          Similar words sit close together, and a relation is a direction: B − A ≈ D − C. To answer “A is to B as C is to ?”, compute
          D = C + (B − A) and take the most similar word (cosine similarity), leaving out A, B and C.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split">
        <div class="wg-controls">
          <div class="embedding-analogy-presets" role="group" aria-label="Slide examples">
            {PRESETS.map((p) => (
              <Btn size="sm" key={p.a} kind={preset === p ? 'primary' : ''} onClick={() => setAbc([p.a, p.b, p.c])}>
                {p.a} : {p.b} :: {p.c} : ?
              </Btn>
            ))}
          </div>
          <div class="embedding-analogy-sel">
            {['A', 'B', 'C'].map((L, i) => (
              <Fragment key={L}>
                <label for={`${uid}-${L}`}>{L}</label>
                <select id={`${uid}-${L}`} class="input" value={abc[i]} onChange={(e) => set(i, e.currentTarget.value)}>
                  {ALL.map((wd) => (
                    <option key={wd} value={wd}>
                      {wd}
                    </option>
                  ))}
                </select>
              </Fragment>
            ))}
          </div>
          <div class="wg-row">
            <span class="ctl-label">Rank by</span>
            <Seg
              label="Rank by"
              value={by}
              onChange={setBy}
              options={[
                { value: 'cos', label: 'Cosine', title: 'cosine similarity (highest first)' },
                { value: 'dist', label: 'Distance', title: 'Euclidean distance (smallest first)' },
              ]}
            />
          </div>
          <div class="readouts" aria-live="polite">
            <Readout
              label={`${a} : ${b} :: ${c} : ?`}
              value={top.w}
              sub={by === 'cos' ? `cosine similarity ${fix(top.cos, 3)} with D` : `Euclidean distance ${fix(top.dist, 2)} from D`}
              tone={preset ? (top.w === preset.want ? 'good' : 'bad') : 'blue'}
            />
          </div>
          <div class="mini-wrap">
            <table class="mini embedding-analogy-rank">
              <thead>
                <tr>
                  <th>#</th>
                  <th class="l">word</th>
                  <th>cosine</th>
                  <th>distance</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 5).map((r, i) => (
                  <tr key={r.w} class={i === 0 ? 'hl' : ''}>
                    <td>{i + 1}</td>
                    <td class="embedding-analogy-w">{r.w}</td>
                    <td>{fix(r.cos, 3)}</td>
                    <td>{fix(r.dist, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div class="wg-plot" ref={ref}>
          <Plot w={w} h={h} x={xd} y={yd} pad={pad} grid={false} axes={false} label={`Toy 2-D word embedding; D lands near ${top.w}`}>
            {({ X, Y }) => {
              const [ax, ay] = WORDS[a];
              const [bx, bY] = WORDS[b];
              const [cx, cy] = WORDS[c];
              return (
                <g>
                  <line x1={X(xd[0])} x2={X(xd[1])} y1={Y(0)} y2={Y(0)} stroke="var(--grid)" />
                  <line y1={Y(yd[0])} y2={Y(yd[1])} x1={X(0)} x2={X(0)} stroke="var(--grid)" />
                  <text class="lbl" x={X(0) + 5} y={Y(0) + 14}>
                    0
                  </text>
                  {by === 'cos' && (
                    <g>
                      <line x1={X(0)} y1={Y(0)} x2={X(D[0])} y2={Y(D[1])} stroke="var(--marker)" stroke-opacity="0.45" stroke-dasharray="2 3" />
                      <line x1={X(0)} y1={Y(0)} x2={X(WORDS[top.w][0])} y2={Y(WORDS[top.w][1])} stroke="var(--tick)" stroke-opacity="0.55" stroke-dasharray="2 3" />
                    </g>
                  )}
                  {ALL.map((wd) => {
                    const [x, y] = WORDS[wd];
                    const g = GROUP_OF[wd];
                    const role = wd === a ? 'A' : wd === b ? 'B' : wd === c ? 'C' : null;
                    const [dx, dy, an] = LBL[wd];
                    return (
                      <g key={wd}>
                        <path d={shapePath(g, X(x), Y(y), 4.2)} fill={CL[g]} fill-opacity={role || wd === top.w ? 1 : 0.6} />
                        <text
                          x={X(x) + dx}
                          y={Y(y) + dy}
                          text-anchor={an}
                          class={role || wd === top.w ? 'lbl-strong' : 'lbl'}
                          fill={wd === top.w ? 'var(--tick)' : undefined}
                        >
                          {role ? `${role}: ${wd}` : wd}
                        </text>
                      </g>
                    );
                  })}
                  <Arrow id={`${uid}-ab`} x1={X(ax)} y1={Y(ay)} x2={X(bx)} y2={Y(bY)} color="var(--biro)" />
                  <Arrow id={`${uid}-cd`} x1={X(cx)} y1={Y(cy)} x2={X(D[0])} y2={Y(D[1])} color="var(--marker)" dash="5 3" />
                  <path d={shapePath(7, X(D[0]), Y(D[1]), 6.5)} fill="var(--marker)" stroke="var(--paper)" stroke-width="1.2" />
                </g>
              );
            }}
          </Plot>
          <div class="wg-legend">
            <span>
              <span class="sw" style={{ background: 'var(--biro)' }} />
              B − A
            </span>
            <span>
              <span class="sw" style={{ background: 'var(--marker)' }} />
              same arrow from C, ★ = D = C + (B − A)
            </span>
          </div>
          <div class="wg-note">
            A toy 2-D picture: real embeddings have a few hundred dimensions whose individual axes mean nothing; the meaning is in where
            words sit relative to each other.
            {by === 'cos' ? ' Cosine similarity compares directions from 0 (dotted rays), not lengths.' : ''}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
