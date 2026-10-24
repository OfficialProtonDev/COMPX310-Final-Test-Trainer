// Under/overfitting diagnosis following the W12a s7-12 flowchart. Pure maths for FitDiagnosis.jsx and tools/check-c.mjs.

/**
 * Errors in %: train, holdout (validation), optional trainVal (held-out slice of the training distribution), target (acceptable error).
 * E_hold-out = E_train + gap (+ mismatch when train-val is given). Follows the flowchart: training error first, then the gap.
 */
export function diagnose({ train, holdout, trainVal = null, target }) {
  const tv = trainVal == null ? null : trainVal;
  const gap = (tv == null ? holdout : tv) - train;
  const mismatch = tv == null ? null : holdout - tv;
  let step;
  if (train > target) step = 'train';
  else if ((tv == null ? holdout : tv) > target) step = 'gap';
  else if (tv != null && holdout > target) step = 'mismatch';
  else step = 'done';
  return { step, gap, mismatch };
}

/** Error-analysis ceiling (W12a s11): fixing all n of the examined errors gains at most n/examined × (1 − accuracy). */
export const ceiling = (accuracy, examined, n) => (examined > 0 ? (n / examined) * (1 - accuracy) : 0);
