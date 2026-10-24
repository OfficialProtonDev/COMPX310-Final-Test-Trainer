// Keras Sequential model: layer output shapes, parameter counts and the matching code (W6a s8-23). Pure functions.

export const TASKS = {
  binary: { label: 'Binary', act: 'sigmoid', fixedUnits: 1, what: '1 output' },
  multilabel: { label: 'Multilabel', act: 'sigmoid', what: '1 per label' },
  multiclass: { label: 'Multiclass', act: 'softmax', what: '1 per class' },
  regression: { label: 'Regression', act: null, what: '1 per target' },
};

/** Loss for a task; multiclass depends on whether labels are integers (0..n−1) or one-hot vectors. */
export function lossFor(task, onehot = false) {
  if (task === 'regression') return 'mean_squared_error';
  if (task === 'multiclass') return onehot ? 'categorical_crossentropy' : 'sparse_categorical_crossentropy';
  return 'binary_crossentropy';
}

export const outUnits = (task, n) => (task === 'binary' ? 1 : Math.max(1, Math.round(n || 1)));

/**
 * spec: { input: { kind: 'image' | 'vector', dims: [28, 28] | [n] }, hidden: [{ units, act }], task, nOut, onehot }
 * Returns { layers: [{ name, type, out, params, inputs, units, act }], total }.
 * A Dense layer has inputs × units weights plus one bias per unit; Flatten has none.
 */
export function buildModel(spec) {
  const layers = [];
  let width;
  if (spec.input.kind === 'image') {
    width = spec.input.dims.reduce((a, b) => a * b, 1);
    layers.push({ name: 'flatten', type: 'Flatten', out: width, params: 0, inputs: width });
  } else {
    width = spec.input.dims[0];
  }
  let d = 0;
  const dense = (units, act, role) => {
    const params = width * units + units;
    layers.push({ name: d === 0 ? 'dense' : `dense_${d}`, type: 'Dense', out: units, params, inputs: width, units, act, role });
    d++;
    width = units;
  };
  spec.hidden.forEach((h) => dense(Math.max(1, Math.round(h.units || 1)), h.act, 'hidden'));
  dense(outUnits(spec.task, spec.nOut), TASKS[spec.task].act, 'output');
  return { layers, total: layers.reduce((s, l) => s + l.params, 0) };
}

/** The Keras code for the spec, in the lecture's style. */
export function kerasCode(spec) {
  const L = [];
  const shape = `[${spec.input.dims.join(', ')}]`;
  let first = true;
  const inArg = () => {
    if (!first) return '';
    first = false;
    return `, input_shape=${shape}`;
  };
  if (spec.input.kind === 'image') {
    L.push(`    keras.layers.Flatten(input_shape=${shape}),`);
    first = false;
  }
  spec.hidden.forEach((h) => {
    const act = h.act ? `, activation="${h.act}"` : '';
    L.push(`    keras.layers.Dense(${Math.max(1, Math.round(h.units || 1))}${act}${inArg()}),`);
  });
  const t = TASKS[spec.task];
  const oact = t.act ? `, activation="${t.act}"` : '';
  L.push(`    keras.layers.Dense(${outUnits(spec.task, spec.nOut)}${oact}${inArg()}),`);
  const metrics = spec.task === 'regression' ? '' : ',\n    metrics=["accuracy"]';
  return [
    'model = keras.models.Sequential([',
    ...L,
    '])',
    'model.compile(',
    `    loss="${lossFor(spec.task, spec.onehot)}",`,
    `    optimizer="sgd"${metrics})`,
    'history = model.fit(',
    '    X_train, y_train, epochs=30,',
    '    validation_data=(X_valid, y_valid))',
  ].join('\n');
}

/** The lecture model (W6a s14-15): Flatten 784 → Dense 300 relu → Dense 100 relu → Dense 10 softmax. */
export const LECTURE = {
  input: { kind: 'image', dims: [28, 28] },
  hidden: [
    { units: 300, act: 'relu' },
    { units: 100, act: 'relu' },
  ],
  task: 'multiclass',
  nOut: 10,
  onehot: false,
};
