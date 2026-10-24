// Keras Sequential model builder: model.summary() parameter counts and matching code (W6a s8-23; 2025 test Q2, Q3, Q16).
import { useState, useMemo } from 'preact/hooks';
import { WidgetFrame, Seg, Btn, Num, Fb } from '../ui.jsx';
import { fmt } from '../lib/svg.js';
import { TASKS, lossFor, buildModel, kerasCode, LECTURE } from './dense-params-math.js';
import { commas } from './d-shared.js';

const css = `
.dense-params-sec { display: grid; gap: 8px; }
.dense-params-h { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.05em; }
.dense-params-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 13.5px; color: var(--ink-2); }
.dense-params-row .dense-params-tag { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; color: var(--ink); min-width: 46px; }
select.input.dense-params-sel { width: auto; min-width: 92px; min-height: 34px; padding: 4px 8px; font-size: 13.5px; }
.dense-params-task { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-width: 320px; }
.dense-params-x { min-width: 34px; padding: 4px 8px; }
.dense-params-sum { border-collapse: collapse; font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; font-variant-numeric: tabular-nums; width: 100%; }
.dense-params-sum th, .dense-params-sum td { border: 1px solid var(--rule-2); padding: 5px 8px; text-align: left; vertical-align: top; }
.dense-params-sum th { background: var(--paper-2); font-weight: 700; color: var(--ink); }
.dense-params-sum td.dense-params-num { text-align: right; white-space: nowrap; }
.dense-params-sum td.dense-params-shape { white-space: nowrap; }
.dense-params-sum .dense-params-type { color: var(--biro); }
.dense-params-sum .dense-params-how { display: block; font-size: 11.5px; color: var(--ink-3); }
.dense-params-tot { font-family: var(--font-mono); font-stretch: 87.5%; font-size: 13px; line-height: 1.6; }
.dense-params-tot b { color: var(--tick); }
.dense-params-code { margin: 0; padding: 10px 12px; border-radius: var(--r-sm); background: var(--paper-2); border: 1px solid var(--rule); font-family: var(--font-mono); font-stretch: 87.5%; font-size: 12.5px; line-height: 1.55; overflow-x: auto; white-space: pre; color: var(--ink); }
`;

const ACT_OPTIONS = ['relu', 'sigmoid', 'tanh'];
let nextId = 1;
const withIds = (hidden) => hidden.map((h) => ({ ...h, id: nextId++ }));
const pos = (n, lo = 1, hi = 100000) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));

const REGRESSION = {
  input: { kind: 'vector', dims: [8] },
  hidden: [{ units: 30, act: 'relu' }],
  task: 'regression',
  nOut: 1,
  onehot: false,
};

export default function DenseParams() {
  const [kind, setKind] = useState(LECTURE.input.kind);
  const [img, setImg] = useState([28, 28, 1]);
  const [nfeat, setNfeat] = useState(8);
  const [hidden, setHidden] = useState(() => withIds(LECTURE.hidden));
  const [task, setTask] = useState(LECTURE.task);
  const [nOut, setNOut] = useState(LECTURE.nOut);
  const [onehot, setOnehot] = useState(false);

  const load = (s) => {
    setKind(s.input.kind);
    if (s.input.kind === 'image') setImg([s.input.dims[0], s.input.dims[1], s.input.dims[2] || 1]);
    else setNfeat(s.input.dims[0]);
    setHidden(withIds(s.hidden));
    setTask(s.task);
    setNOut(s.nOut);
    setOnehot(s.onehot);
  };

  const spec = {
    input: kind === 'image' ? { kind, dims: img[2] > 1 ? img : img.slice(0, 2) } : { kind, dims: [nfeat] },
    hidden,
    task,
    nOut,
    onehot,
  };
  const model = useMemo(() => buildModel(spec), [kind, img.join(), nfeat, hidden, task, nOut, onehot]);
  const code = kerasCode(spec);
  const big = model.layers.reduce((a, b) => (b.params > a.params ? b : a));
  const share = model.total > 0 ? big.params / model.total : 0;
  // float32 weights: 4 bytes each; Keras prints sizes with 1 KB = 1024 bytes
  const bytes = model.total * 4;
  const size = bytes >= 1024 ** 2 ? `${fmt(bytes / 1024 ** 2, 2)} MB` : `${fmt(bytes / 1024, 2)} KB`;
  const isLecture = model.total === 266610 && kind === 'image' && task === 'multiclass';

  const setUnits = (id, n) => setHidden((hs) => hs.map((h) => (h.id === id ? { ...h, units: pos(n) } : h)));
  const setAct = (id, a) => setHidden((hs) => hs.map((h) => (h.id === id ? { ...h, act: a } : h)));
  const remove = (id) => setHidden((hs) => hs.filter((h) => h.id !== id));
  const add = () => setHidden((hs) => [...hs, { id: nextId++, units: 100, act: 'relu' }]);

  return (
    <WidgetFrame
      title="Keras model builder and parameter counts"
      lead="Change the input, the hidden Dense layers and the task; model.summary() and the Keras code update."
      actions={
        <>
          <Btn size="sm" onClick={() => load(LECTURE)}>
            Lecture model (W6a s14)
          </Btn>
          <Btn size="sm" onClick={() => load(REGRESSION)}>
            Regression (W6a s23)
          </Btn>
        </>
      }
      foot={
        <span>
          Each Dense unit has one weight per input plus a bias: params = inputs × units + units (Flatten has none). The output layer
          and loss follow from the task: binary = 1 sigmoid unit + binary_crossentropy; multiclass = n softmax units +
          sparse_categorical_crossentropy for integer labels; regression = linear units + mean_squared_error.
        </span>
      }
    >
      <style>{css}</style>
      <div class="wg-split wide-ctl">
        <div class="wg-controls">
          <section class="dense-params-sec" aria-label="Input">
            <div class="dense-params-h">Input</div>
            <Seg
              label="Input type"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'image', label: 'Image → Flatten' },
                { value: 'vector', label: 'Feature vector' },
              ]}
            />
            {kind === 'image' ? (
              <div class="dense-params-row">
                <Num value={img[0]} min={1} width={60} label="Image height" onChange={(n) => setImg([pos(n, 1, 4096), img[1], img[2]])} />
                ×
                <Num value={img[1]} min={1} width={60} label="Image width" onChange={(n) => setImg([img[0], pos(n, 1, 4096), img[2]])} />
                ×
                <Num value={img[2]} min={1} width={52} label="Colour channels" onChange={(n) => setImg([img[0], img[1], pos(n, 1, 64)])} />
                <span>px × channels</span>
              </div>
            ) : (
              <div class="dense-params-row">
                <Num value={nfeat} min={1} width={72} label="Number of input features" onChange={(n) => setNfeat(pos(n))} />
                <span>features (X_train.shape[1:])</span>
              </div>
            )}
          </section>
          <section class="dense-params-sec" aria-label="Hidden layers">
            <div class="dense-params-h">Hidden layers</div>
            {hidden.length === 0 && <div class="wg-note">No hidden layer: inputs go straight to the output layer.</div>}
            {hidden.map((h, i) => (
              <div class="dense-params-row" key={h.id}>
                <span class="dense-params-tag">Dense</span>
                <Num value={h.units} min={1} width={72} label={`Hidden layer ${i + 1} units`} onChange={(n) => setUnits(h.id, n)} />
                <select class="input dense-params-sel" aria-label={`Hidden layer ${i + 1} activation`} value={h.act} onChange={(e) => setAct(h.id, e.currentTarget.value)}>
                  {ACT_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <Btn size="sm" kind="ghost" class="dense-params-x" aria-label={`Remove hidden layer ${i + 1}`} title="Remove layer" onClick={() => remove(h.id)}>
                  ×
                </Btn>
              </div>
            ))}
            <div>
              <Btn size="sm" onClick={add} disabled={hidden.length >= 6}>
                + Add Dense layer
              </Btn>
            </div>
          </section>
          <section class="dense-params-sec" aria-label="Output and task">
            <div class="dense-params-h">Task (sets the output layer and loss)</div>
            <div class="dense-params-task" role="group" aria-label="Task">
              {Object.entries(TASKS).map(([k, t]) => (
                <Btn key={k} size="sm" kind={task === k ? 'primary' : ''} aria-pressed={task === k} onClick={() => setTask(k)}>
                  {t.label}
                </Btn>
              ))}
            </div>
            {task !== 'binary' && (
              <div class="dense-params-row">
                <Num value={nOut} min={1} width={64} label={task === 'multilabel' ? 'Number of labels' : task === 'multiclass' ? 'Number of classes' : 'Number of targets'} onChange={(n) => setNOut(pos(n, 1, 10000))} />
                <span>{task === 'multilabel' ? 'labels' : task === 'multiclass' ? 'classes' : 'target values to predict'}</span>
              </div>
            )}
            {task === 'multiclass' && (
              <Seg
                label="Label format"
                value={onehot}
                onChange={setOnehot}
                options={[
                  { value: false, label: 'Integer labels 0…n−1' },
                  { value: true, label: 'One-hot labels' },
                ]}
              />
            )}
            <div class="wg-note">
              Output: {TASKS[task].what}
              {task === 'binary' ? '' : ` (${model.layers[model.layers.length - 1].out})`}, activation {TASKS[task].act || 'none (linear)'}; loss {lossFor(task, onehot)}.
            </div>
          </section>
        </div>
        <div class="wg-plot">
          <div class="dense-params-h">model.summary()</div>
          <div class="mini-wrap">
            <table class="dense-params-sum" aria-label="Model summary">
              <thead>
                <tr>
                  <th>Layer (type)</th>
                  <th>Output Shape</th>
                  <th class="dense-params-num">Param #</th>
                </tr>
              </thead>
              <tbody>
                {model.layers.map((l) => (
                  <tr key={l.name}>
                    <td>
                      {l.name} (<span class="dense-params-type">{l.type}</span>)
                    </td>
                    <td class="dense-params-shape">(None, {l.out})</td>
                    <td class="dense-params-num">
                      {commas(l.params)}
                      <span class="dense-params-how">{l.type === 'Flatten' ? 'no weights' : `${commas(l.inputs)}×${commas(l.units)} + ${commas(l.units)}`}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="dense-params-tot">
            <div>
              Total params: <b>{commas(model.total)}</b> ({size})
            </div>
            <div>
              Trainable params: {commas(model.total)} · Non-trainable params: 0
            </div>
          </div>
          {isLecture ? (
            <Fb kind="good">Same as the slide: 0 + 235,500 + 30,100 + 1,010 = 266,610.</Fb>
          ) : (
            model.layers.length > 1 && (
              <Fb kind="info">
                {big.name} holds {fmt(share * 100, 0)}% of all parameters ({commas(big.inputs)} inputs × {commas(big.units)} units + {commas(big.units)} biases).
              </Fb>
            )
          )}
          <div class="dense-params-h">Keras code</div>
          <pre class="dense-params-code" aria-label="Keras code for this model">{code}</pre>
        </div>
      </div>
    </WidgetFrame>
  );
}
